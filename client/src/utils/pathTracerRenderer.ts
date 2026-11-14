import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import {
  GradientEquirectTexture,
  PhysicalCamera,
  WebGLPathTracer,
} from 'three-gpu-pathtracer';
import { sphericalToCartesian } from '../constants/lightingPresets';
import { wrapWithAppliedNormalisation } from './modelNormalisation';
import {
  checkAbort,
  createThumbnailFromDataUrl,
  mapToneMapping,
  renderSceneOffscreen,
  yieldFrame,
  type OffscreenRenderInput,
  type OffscreenRenderOutput,
} from './offscreenRenderer';

export interface RenderExecutionResult extends OffscreenRenderOutput {
  usedFallback: boolean;
  fallbackReason?: string;
}

function disposeObjectSubtree(root: THREE.Object3D): void {
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of mats) {
        if (!mat) continue;
        for (const val of Object.values(mat)) {
          if (val && typeof val === 'object' && 'isTexture' in val && (val as THREE.Texture).isTexture) {
            (val as THREE.Texture).dispose();
          }
        }
        mat.dispose();
      }
    }
  });
}

/**
 * Polyfill `backgroundRotation` / `environmentRotation` on `THREE.Scene.prototype`
 * for `three@0.160.0` (introduced in r163), since `three-gpu-pathtracer@0.0.23`
 * reads both inside `updateEnvironment()`, including during its constructor's initial empty scene.
 */
function ensureSceneRotationSupport(): void {
  const proto = THREE.Scene.prototype as unknown as Record<string, unknown>;
  for (const prop of ['backgroundRotation', 'environmentRotation'] as const) {
    if (!(prop in proto)) {
      const store = new WeakMap<object, THREE.Euler>();
      Object.defineProperty(proto, prop, {
        configurable: true,
        get() {
          let euler = store.get(this);
          if (!euler) {
            euler = new THREE.Euler();
            store.set(this, euler);
          }
          return euler;
        },
        set(val: THREE.Euler) {
          store.set(this, val);
        },
      });
    }
  }
}

/**
 * Progressive GPU path-traced offscreen renderer using `three-gpu-pathtracer`.
 * Throws explicit errors when WebGL2/float extensions, memory, or shader
 * compilation fail so callers can gracefully fall back to standard rendering.
 */
export async function renderScenePathTraced(
  input: OffscreenRenderInput
): Promise<OffscreenRenderOutput> {
  const { objects, background, cameraState, settings, hdris, signal, onProgress } = input;
  const { width, height } = settings;

  onProgress?.(2, 'Initializing path tracer (WebGL2)...');
  checkAbort(signal);

  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: settings.transparentBg,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance',
  });

  const disposables: { dispose: () => void }[] = [];
  const modelCache = new Map<string, THREE.Group>();
  let pathTracer: WebGLPathTracer | null = null;
  let contextLost = false;

  const onContextLost = (e: Event) => {
    e.preventDefault();
    contextLost = true;
  };
  renderer.domElement.addEventListener('webglcontextlost', onContextLost, false);

  try {
    const gl = renderer.getContext();
    if (!(gl instanceof WebGL2RenderingContext)) {
      throw new Error('Path tracing requires WebGL 2 support.');
    }
    if (!gl.getExtension('EXT_color_buffer_float')) {
      throw new Error('Path tracing requires GPU float color buffer support (EXT_color_buffer_float).');
    }

    const maxTex = renderer.capabilities.maxTextureSize;
    const maxRb = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number;
    const maxDim = Math.min(maxTex, maxRb);
    if (width > maxDim || height > maxDim) {
      throw new Error(`Requested resolution (${width}×${height}) exceeds GPU limit (${maxDim}px).`);
    }

    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    renderer.toneMapping = mapToneMapping(settings.toneMapping);
    renderer.toneMappingExposure = settings.exposure;
    if (settings.transparentBg) {
      renderer.setClearColor(0x000000, 0);
    }

    const scene = new THREE.Scene();
    const camera = new PhysicalCamera(settings.fov, width / height, 0.1, 500);
    camera.position.set(...cameraState.position);
    camera.lookAt(...cameraState.target);
    camera.focusDistance = Math.max(0.1, settings.dofFocusDistance);
    camera.bokehSize = settings.dofEnabled ? settings.dofAperture * 50 : 0;
    camera.updateMatrixWorld();

    // Background (omitted when transparent PNG requested)
    if (!settings.transparentBg) {
      if (background.type === 'color' && background.color) {
        scene.background = new THREE.Color(background.color);
      } else if (background.type === 'image' && background.imagePath) {
        onProgress?.(6, 'Loading background texture...');
        const tex = await new THREE.TextureLoader().loadAsync(
          `/api/backgrounds/${background.imagePath}/file`
        );
        tex.colorSpace = THREE.SRGBColorSpace;
        if (background.equirectangular) {
          tex.mapping = THREE.EquirectangularReflectionMapping;
          scene.environment = tex;
        }
        scene.background = tex;
        disposables.push(tex);
      }
    }

    checkAbort(signal);

    // Lighting (WebGLPathTracer supports DirectionalLight & equirectangular scene.environment)
    const { lighting } = settings;
    const addDirLight = (cfg: typeof lighting.keyLight) => {
      if (cfg.intensity <= 0) return;
      const pos = sphericalToCartesian(cfg.azimuthDeg, cfg.elevationDeg);
      const light = new THREE.DirectionalLight(cfg.color, cfg.intensity);
      light.position.set(...pos);
      scene.add(light);
    };
    addDirLight(lighting.keyLight);
    addDirLight(lighting.fillLight);
    addDirLight(lighting.rimLight);

    // Optional equirectangular HDRI (raw equirect texture for importance sampling)
    if (lighting.hdriId) {
      const hdri = hdris.find((h) => h.id === lighting.hdriId);
      if (hdri) {
        onProgress?.(10, 'Loading HDRI environment...');
        const isExr = hdri.filePath.toLowerCase().endsWith('.exr');
        const loader = isExr ? new EXRLoader() : new RGBELoader();
        const hdrTex = await loader.loadAsync(
          `/api/lighting/hdris/${encodeURIComponent(hdri.id)}/file`
        );
        hdrTex.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = hdrTex;
        (scene as { environmentIntensity?: number }).environmentIntensity = lighting.hdriIntensity;
        if (lighting.hdriAsBackground && !settings.transparentBg) {
          scene.background = hdrTex;
        }
        disposables.push(hdrTex);
      }
    } else if (!scene.environment && lighting.ambientIntensity > 0) {
      // Path tracer ignores THREE.AmbientLight; approximate ambient fill via a procedural equirect dome.
      const gradEnv = new GradientEquirectTexture(256);
      const amb = new THREE.Color(lighting.ambientColor);
      gradEnv.topColor.copy(amb).multiplyScalar(Math.min(2.5, lighting.ambientIntensity * 0.7));
      gradEnv.bottomColor.copy(amb).multiplyScalar(Math.min(2.0, lighting.ambientIntensity * 0.35));
      gradEnv.exponent = 1;
      gradEnv.update();
      scene.environment = gradEnv;
      (scene as { environmentIntensity?: number }).environmentIntensity = 1;
      disposables.push(gradEnv);
    }

    checkAbort(signal);

    if (settings.groundPlaneEnabled) {
      const groundGeo = new THREE.PlaneGeometry(100, 100);
      const groundMat = settings.groundShadowOnly
        ? new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1.0, metalness: 0.0 })
        : new THREE.MeshStandardMaterial({ color: settings.groundColor, roughness: 0.9, metalness: 0.0 });
      if (settings.groundShadowOnly) {
        (groundMat as unknown as { matte?: boolean }).matte = true;
      }
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.001;
      scene.add(ground);
      disposables.push(groundGeo, groundMat);
    }

    // Load each unique GLB once to keep multi-instance 10MB+ scenes within memory limits.
    const visibleObjects = objects.filter((o) => o.visible);
    const gltfLoader = new GLTFLoader();
    gltfLoader.setMeshoptDecoder(MeshoptDecoder);

    for (let i = 0; i < visibleObjects.length; i++) {
      checkAbort(signal);
      const obj = visibleObjects[i];
      const pct = 12 + Math.round(((i + 1) / Math.max(1, visibleObjects.length)) * 18);
      onProgress?.(pct, `Loading models (${i + 1}/${visibleObjects.length})...`);

      let baseGroup = modelCache.get(obj.modelId);
      if (!baseGroup) {
        try {
          const gltf = await gltfLoader.loadAsync(`/api/models/${obj.modelId}/file`);
          baseGroup = gltf.scene;
          modelCache.set(obj.modelId, baseGroup);
        } catch {
          continue;
        }
      }

      const clone = baseGroup.clone(true);
      const isMirrored = obj.scale[0] * obj.scale[1] * obj.scale[2] < 0;
      if (isMirrored) {
        clone.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            const mat = (child.material as THREE.Material).clone();
            mat.side = THREE.DoubleSide;
            child.material = mat;
            disposables.push(mat);
          }
        });
      }
      const wrapped = wrapWithAppliedNormalisation(clone, obj.appliedNormalisation);
      wrapped.position.set(...obj.position);
      wrapped.rotation.set(...obj.rotation);
      wrapped.scale.set(...obj.scale);
      scene.add(wrapped);
    }

    checkAbort(signal);
    onProgress?.(32, 'Building path tracing BVH...');
    await yieldFrame();

    ensureSceneRotationSupport();
    pathTracer = new WebGLPathTracer(renderer);
    pathTracer.bounces = Math.max(1, Math.min(16, settings.pathTracerBounces ?? 5));
    pathTracer.transmissiveBounces = Math.max(4, pathTracer.bounces);
    pathTracer.rasterizeScene = false;
    pathTracer.renderDelay = 0;
    pathTracer.fadeDuration = 0;
    pathTracer.minSamples = 1;
    pathTracer.renderToCanvas = true;
    pathTracer.enablePathTracing = true;
    pathTracer.dynamicLowRes = false;
    // Cap packed material texture array resolution so 10MB+ multi-texture GLBs fit in GPU VRAM.
    pathTracer.textureSize.set(Math.min(1024, maxTex), Math.min(1024, maxTex));
    pathTracer.tiles.set(2, 2);

    pathTracer.setScene(scene, camera);
    scene.updateMatrixWorld();
    pathTracer.updateCamera();
    onProgress?.(44, 'Compiling path tracer shaders...');
    await yieldFrame();

    const targetSamples = Math.max(1, Math.min(512, settings.pathTracerSamples ?? 32));
    let compileTicks = 0;

    while (pathTracer.samples < targetSamples) {
      checkAbort(signal);
      if (contextLost || gl.isContextLost()) {
        throw new Error('WebGL context lost during path tracing (scene may exceed GPU memory).');
      }

      pathTracer.renderSample();

      if ((pathTracer as unknown as { isCompiling?: boolean }).isCompiling) {
        compileTicks++;
        onProgress?.(45, 'Compiling path tracer shaders...');
        if (compileTicks > 600) {
          throw new Error('Path tracer shader compilation timed out.');
        }
        await yieldFrame();
        continue;
      }

      const completed = Math.min(targetSamples, Math.floor(pathTracer.samples));
      const pct = 45 + Math.round((pathTracer.samples / targetSamples) * 51);
      onProgress?.(Math.min(96, pct), `Path tracing: Sample ${completed} / ${targetSamples}`);
      await yieldFrame();
    }

    if (contextLost || gl.isContextLost()) {
      throw new Error('WebGL context lost before image capture.');
    }

    onProgress?.(97, 'Encoding PNG...');
    const imageDataUrl = renderer.domElement.toDataURL('image/png');
    const thumbnailDataUrl = await createThumbnailFromDataUrl(imageDataUrl, 480);

    onProgress?.(100, 'Complete');
    return { imageDataUrl, thumbnailDataUrl, width, height };
  } finally {
    renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
    if (pathTracer) {
      // three-gpu-pathtracer@0.0.23 has an internal typo (`this._renderQuad`) in dispose(),
      // so guard dispose() and clean up internal quad/targets explicitly.
      const ptAny = pathTracer as unknown as Record<string, { dispose?: () => void; material?: { dispose?: () => void } } | undefined>;
      try { pathTracer.dispose(); } catch { /* noop */ }
      try { ptAny._quad?.material?.dispose?.(); } catch { /* noop */ }
      try { ptAny._quad?.dispose?.(); } catch { /* noop */ }
      try { ptAny._lowResPathTracer?.dispose?.(); } catch { /* noop */ }
      try { ptAny._pathTracer?.dispose?.(); } catch { /* noop */ }
    }
    for (const group of modelCache.values()) {
      disposeObjectSubtree(group);
    }
    modelCache.clear();
    for (const d of disposables) {
      try { d.dispose(); } catch { /* noop */ }
    }
    renderer.dispose();
  }
}

/**
 * Executes either the path-traced or standard offscreen renderer.
 * If path tracing is unsupported or fails (other than user cancellation),
 * automatically falls back to the standard renderer and reports the reason.
 */
export async function executeRenderWithFallback(
  input: OffscreenRenderInput,
  onFallback?: (reason: string) => void
): Promise<RenderExecutionResult> {
  if ((input.settings.rendererType ?? 'standard') !== 'pathtraced') {
    const out = await renderSceneOffscreen(input);
    return { ...out, usedFallback: false };
  }

  try {
    const out = await renderScenePathTraced(input);
    return { ...out, usedFallback: false };
  } catch (err) {
    if (input.signal?.aborted || (err instanceof Error && err.message === 'Render cancelled.')) {
      throw err;
    }
    const reason = err instanceof Error ? err.message : 'Path tracer initialization failed.';
    onFallback?.(reason);
    input.onProgress?.(5, 'Path tracer unavailable; falling back to standard renderer...');
    const fallbackOut = await renderSceneOffscreen(input);
    return { ...fallbackOut, usedFallback: true, fallbackReason: reason };
  }
}
