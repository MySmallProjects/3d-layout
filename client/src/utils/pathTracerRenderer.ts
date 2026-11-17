import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { createConfiguredGLTFLoader } from '../services/gltfLoader';
import {
  GradientEquirectTexture,
  PhysicalCamera,
  WebGLPathTracer,
} from 'three-gpu-pathtracer';
import { sphericalToCartesian } from '../constants/lightingPresets';
import { wrapWithAppliedNormalisation } from './modelNormalisation';
import { isEffectivelyVisible } from './sceneHierarchy';
import { createGroundPlaneMesh } from './groundPlaneThree';
import { applyInstanceMaterialState } from './materialOverride';
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
 * Converts Meshopt / KHR_mesh_quantization interleaved or normalized integer attributes
 * (Int8Array, Int16Array, Uint8Array, Uint16Array) into standard Float32BufferAttributes.
 * `three-gpu-pathtracer`'s `convertToStaticGeometry` and `mergeGeometries` clone attribute
 * typed-array constructors directly and write world-space floats into them, which truncates
 * quantized integer buffers unless converted to Float32 first.
 */
function dequantizeGeometryForPathTracer(srcGeom: THREE.BufferGeometry): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  for (const g of srcGeom.groups) {
    geom.addGroup(g.start, g.count, g.materialIndex);
  }
  if (srcGeom.index) {
    const idxAttr = srcGeom.index;
    const indices = new Uint32Array(idxAttr.count);
    for (let i = 0; i < idxAttr.count; i++) {
      indices[i] = idxAttr.getX(i);
    }
    geom.setIndex(new THREE.Uint32BufferAttribute(indices, 1));
  }
  for (const [name, attr] of Object.entries(srcGeom.attributes)) {
    const count = attr.count;
    const itemSize = attr.itemSize;
    const arr = new Float32Array(count * itemSize);
    for (let i = 0; i < count; i++) {
      const base = i * itemSize;
      arr[base] = attr.getX(i);
      if (itemSize >= 2) arr[base + 1] = attr.getY(i);
      if (itemSize >= 3) arr[base + 2] = attr.getZ(i);
      if (itemSize >= 4) arr[base + 3] = attr.getW(i);
    }
    geom.setAttribute(name, new THREE.Float32BufferAttribute(arr, itemSize, false));
  }
  return geom;
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
  const { objects, background, groundPlane, cameraState, settings, hdris, signal, onProgress } = input;
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
    // Enable float/half-float linear filtering and float blending so GradientEquirectTexture,
    // EquirectHdrInfoUniform, and RGBA32F accumulation targets sample and blend cleanly.
    gl.getExtension('OES_texture_float_linear');
    gl.getExtension('OES_texture_half_float_linear');
    gl.getExtension('EXT_float_blend');

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
        // Use an explicitly updated GradientEquirectTexture rather than THREE.Color so
        // pure white (#ffffff) is never skipped by WebGLPathTracer's topColor.equals() check.
        const bgTex = new GradientEquirectTexture(16);
        bgTex.topColor.set(background.color);
        bgTex.bottomColor.set(background.color);
        bgTex.update();
        scene.background = bgTex;
        disposables.push(bgTex);
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
    let keyDirLight: THREE.DirectionalLight | null = null;
    const addDirLight = (cfg: typeof lighting.keyLight, isKey = false) => {
      if (cfg.intensity <= 0) return;
      const pos = sphericalToCartesian(cfg.azimuthDeg, cfg.elevationDeg);
      const light = new THREE.DirectionalLight(cfg.color, cfg.intensity);
      light.position.set(...pos);
      scene.add(light);
      if (isKey) keyDirLight = light;
    };
    addDirLight(lighting.keyLight, true);
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

    const ground = await createGroundPlaneMesh(groundPlane, settings, true, disposables);
    if (ground) {
      scene.add(ground);
    }

    // Load each unique GLB once and preserve group hierarchy.
    const visibleObjects = objects.filter((o) => isEffectivelyVisible(o, objects));
    const gltfLoader = await createConfiguredGLTFLoader();
    const nodeMap = new Map<string, THREE.Object3D>();

    for (let i = 0; i < visibleObjects.length; i++) {
      checkAbort(signal);
      const obj = visibleObjects[i];
      const pct = 12 + Math.round(((i + 1) / Math.max(1, visibleObjects.length)) * 18);
      onProgress?.(pct, `Loading models (${i + 1}/${visibleObjects.length})...`);

      if (obj.isGroup) {
        const grp = new THREE.Group();
        grp.position.set(...obj.position);
        grp.rotation.set(...obj.rotation);
        grp.scale.set(...obj.scale);
        nodeMap.set(obj.id, grp);
        continue;
      }

      let baseGroup = modelCache.get(obj.modelId);
      if (!baseGroup) {
        try {
          const gltf = await gltfLoader.loadAsync(`/api/models/${obj.modelId}/file`);
          baseGroup = gltf.scene;
          const convertedGeoms = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();
          baseGroup.traverse((child) => {
            if (child instanceof THREE.Mesh && child.geometry) {
              let converted = convertedGeoms.get(child.geometry);
              if (!converted) {
                converted = dequantizeGeometryForPathTracer(child.geometry);
                convertedGeoms.set(child.geometry, converted);
              }
              child.geometry = converted;
            }
          });
          for (const origGeom of convertedGeoms.keys()) {
            origGeom.dispose();
          }
          modelCache.set(obj.modelId, baseGroup);
        } catch {
          continue;
        }
      }

      const clone = baseGroup.clone(true);
      const isMirrored = obj.scale[0] * obj.scale[1] * obj.scale[2] < 0;
      const clonedMats = applyInstanceMaterialState(
        clone,
        baseGroup,
        isMirrored,
        obj.materialOverride
      );
      disposables.push(...clonedMats);
      const wrapped = wrapWithAppliedNormalisation(clone, obj.appliedNormalisation);
      wrapped.position.set(...obj.position);
      wrapped.rotation.set(...obj.rotation);
      wrapped.scale.set(...obj.scale);
      nodeMap.set(obj.id, wrapped);
    }

    for (const obj of visibleObjects) {
      const node = nodeMap.get(obj.id);
      if (!node) continue;
      const parent = obj.parentId ? nodeMap.get(obj.parentId) : undefined;
      (parent ?? scene).add(node);
    }

    checkAbort(signal);
    onProgress?.(32, 'Building path tracing BVH...');
    await yieldFrame();

    ensureSceneRotationSupport();
    pathTracer = new WebGLPathTracer(renderer);

    // Patch internal PathTracingRenderer so:
    // 1. onBeforeRender batches all 3 define updates into a single recompilation event
    //    (preventing 2 extra shader compilations that include volumetric FEATURE_FOG=1).
    // 2. compileMaterial binds _primaryTarget while calling compileAsync so Three.js compiles
    //    the exact LinearSRGBColorSpace program used by _fsQuad.render(_renderer) instead of
    //    stalling the main thread with a synchronous re-compile on tile 0.
    const ptInternal = (pathTracer as unknown as { _pathTracer?: any })._pathTracer;
    if (ptInternal) {
      ptInternal.compileMaterial = function () {
        const prevTarget = this._renderer.getRenderTarget();
        this._renderer.setRenderTarget(this._primaryTarget);
        const promise = this._renderer.compileAsync(this._fsQuad._mesh);
        this._renderer.setRenderTarget(prevTarget);
        return promise;
      };
      if (ptInternal.material) {
        ptInternal.material.onBeforeRender = function () {
          const dof = this.physicalCamera.bokehSize === 0 ? 0 : 1;
          const bg = this.backgroundMap ? 1 : 0;
          const fog = this.materials.features.isUsed('FOG') ? 1 : 0;
          let changed = false;
          if (this.defines.FEATURE_DOF !== dof) {
            this.defines.FEATURE_DOF = dof;
            changed = true;
          }
          if (this.defines.FEATURE_BACKGROUND_MAP !== bg) {
            this.defines.FEATURE_BACKGROUND_MAP = bg;
            changed = true;
          }
          if (this.defines.FEATURE_FOG !== fog) {
            this.defines.FEATURE_FOG = fog;
            changed = true;
          }
          if (changed) {
            this.needsUpdate = true;
          }
        };
      }
    }

    let hasTransmission = false;
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const m of mats) {
          if (m && typeof (m as any).transmission === 'number' && (m as any).transmission > 0) {
            hasTransmission = true;
          }
        }
      }
    });

    pathTracer.bounces = Math.max(1, Math.min(16, settings.pathTracerBounces ?? 5));
    pathTracer.transmissiveBounces = hasTransmission ? Math.min(4, pathTracer.bounces) : 1;
    pathTracer.rasterizeScene = false;
    pathTracer.renderDelay = 0;
    pathTracer.fadeDuration = 0;
    pathTracer.minSamples = 1;
    pathTracer.renderToCanvas = true;
    pathTracer.enablePathTracing = true;
    pathTracer.dynamicLowRes = false;
    // Cap packed material texture array resolution so 10MB+ multi-texture GLBs fit in GPU VRAM.
    pathTracer.textureSize.set(Math.min(1024, maxTex), Math.min(1024, maxTex));
    // Use 4x4 tiles (16 sub-passes per sample at 1080p, 6x6 at 4K) so enclosed multi-bounce
    // scenes keep each GPU draw call short and never trip the OS/browser GPU watchdog.
    const tileCount = width * height > 2_100_000 ? 6 : 4;
    pathTracer.tiles.set(tileCount, tileCount);

    pathTracer.setScene(scene, camera);
    scene.updateMatrixWorld();
    pathTracer.updateCamera();
    onProgress?.(44, 'Compiling path tracer shaders...');
    await yieldFrame();

    const targetSamples = Math.max(1, Math.min(512, settings.pathTracerSamples ?? 32));
    let compileTicks = 0;
    let lastYieldTime = performance.now();

    while (pathTracer.samples < targetSamples) {
      checkAbort(signal);
      if (contextLost || gl.isContextLost()) {
        throw new Error('WebGL context lost during path tracing (scene may exceed GPU memory).');
      }

      pathTracer.renderSample();
      gl.flush();

      if ((pathTracer as unknown as { isCompiling?: boolean }).isCompiling) {
        compileTicks++;
        onProgress?.(45, 'Compiling path tracer shaders...');
        if (compileTicks > 600) {
          throw new Error('Path tracer shader compilation timed out.');
        }
        await yieldFrame();
        lastYieldTime = performance.now();
        continue;
      }

      const completed = Math.min(targetSamples, Math.floor(pathTracer.samples));
      const pct = 45 + Math.round((pathTracer.samples / targetSamples) * 51);
      onProgress?.(Math.min(96, pct), `Path tracing: Sample ${completed} / ${targetSamples}`);

      const now = performance.now();
      if (now - lastYieldTime >= 16 || pathTracer.samples >= targetSamples) {
        await yieldFrame();
        lastYieldTime = performance.now();
      }
    }

    if (contextLost || gl.isContextLost()) {
      throw new Error('WebGL context lost before image capture.');
    }

    // Verify that the path tracer actually wrote non-empty pixels to the canvas
    // (guards against silent GPU driver shader link failures or TDR resets).
    if (!settings.transparentBg) {
      const probe = new Uint8Array(4);
      let anyNonZeroAlpha = false;
      const probePoints: [number, number][] = [
        [Math.floor(width * 0.5), Math.floor(height * 0.5)],
        [Math.floor(width * 0.25), Math.floor(height * 0.25)],
        [Math.floor(width * 0.75), Math.floor(height * 0.75)],
        [Math.floor(width * 0.5), Math.floor(height * 0.85)],
      ];
      renderer.setRenderTarget(null);
      for (const [px, py] of probePoints) {
        gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, probe);
        if (probe[3] > 0) {
          anyNonZeroAlpha = true;
          break;
        }
      }
      if (!anyNonZeroAlpha) {
        throw new Error('Path tracer produced an empty frame (GPU shader link or timeout).');
      }
    }

    onProgress?.(97, 'Encoding PNG...');
    const isShadowCatcher = groundPlane
      ? groundPlane.visible && groundPlane.type === 'shadow-catcher'
      : settings.groundPlaneEnabled && settings.groundShadowOnly;

    let imageDataUrl: string;
    if (isShadowCatcher && keyDirLight && lighting.keyLight.castShadow !== false) {
      const outCanvas = document.createElement('canvas');
      outCanvas.width = width;
      outCanvas.height = height;
      const ctx = outCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(renderer.domElement, 0, 0);

        // Render a depth-occluded ShadowMaterial pass on an alpha-enabled renderer
        const shadowRenderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance',
        });
        try {
          shadowRenderer.setPixelRatio(1);
          shadowRenderer.setSize(width, height, false);
          shadowRenderer.setClearColor(0x000000, 0);
          shadowRenderer.shadowMap.enabled = true;
          shadowRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

          scene.background = null;
          scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              const mats = Array.isArray(child.material) ? child.material : [child.material];
              for (const m of mats) {
                if (m) {
                  m.colorWrite = false;
                  m.depthWrite = true;
                }
              }
            }
          });

          const dl = keyDirLight as THREE.DirectionalLight;
          const groundSize = Math.max(1, groundPlane?.size || 100);
          dl.castShadow = true;
          dl.shadow.mapSize.set(2048, 2048);
          dl.shadow.camera.near = 0.5;
          dl.shadow.camera.far = 80;
          const d = Math.min(50, Math.max(15, groundSize / 2));
          dl.shadow.camera.left = -d;
          dl.shadow.camera.right = d;
          dl.shadow.camera.top = d;
          dl.shadow.camera.bottom = -d;
          dl.shadow.bias = -0.0005;

          const shadowGeo = new THREE.PlaneGeometry(groundSize, groundSize);
          const shadowMat = new THREE.ShadowMaterial({ opacity: 0.45 });
          const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
          shadowPlane.rotation.x = -Math.PI / 2;
          shadowPlane.position.y = -0.001;
          shadowPlane.receiveShadow = true;
          scene.add(shadowPlane);
          disposables.push(shadowGeo, shadowMat);

          shadowRenderer.render(scene, camera);
          ctx.drawImage(shadowRenderer.domElement, 0, 0);
        } finally {
          shadowRenderer.dispose();
          try { shadowRenderer.forceContextLoss(); } catch { /* noop */ }
        }
        imageDataUrl = outCanvas.toDataURL('image/png');
      } else {
        imageDataUrl = renderer.domElement.toDataURL('image/png');
      }
    } else {
      imageDataUrl = renderer.domElement.toDataURL('image/png');
    }

    const thumbnailDataUrl = await createThumbnailFromDataUrl(imageDataUrl, 480);

    onProgress?.(100, 'Complete');
    return { imageDataUrl, thumbnailDataUrl, width, height };
  } finally {
    renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
    if (pathTracer) {
      // three-gpu-pathtracer@0.0.23 has an internal typo (`this._renderQuad`) in dispose(),
      // so guard dispose() and clean up internal quad/targets and GPU data textures explicitly.
      const ptAny = pathTracer as unknown as Record<string, any>;
      const ptMat = ptAny._pathTracer?.material;
      try { ptMat?.bvh?.dispose?.(); } catch { /* noop */ }
      try { ptMat?.attributesArray?.dispose?.(); } catch { /* noop */ }
      try { ptMat?.materialIndexAttribute?.dispose?.(); } catch { /* noop */ }
      try { ptMat?.materials?.dispose?.(); } catch { /* noop */ }
      try { ptMat?.textures?.dispose?.(); } catch { /* noop */ }
      try { ptMat?.iesProfiles?.dispose?.(); } catch { /* noop */ }
      try { ptMat?.envMapInfo?.dispose?.(); } catch { /* noop */ }
      try { ptMat?.stratifiedTexture?.dispose?.(); } catch { /* noop */ }
      try { ptMat?.stratifiedOffsetTexture?.dispose?.(); } catch { /* noop */ }
      try { ptAny._colorBackground?.dispose?.(); } catch { /* noop */ }
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
    try { renderer.forceContextLoss(); } catch { /* noop */ }
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
