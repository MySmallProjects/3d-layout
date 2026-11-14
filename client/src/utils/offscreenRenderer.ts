import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { createConfiguredGLTFLoader } from '../services/gltfLoader';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { BackgroundConfig, CameraState, SceneObject } from '@shared/types/scene';
import type { HdriRecord } from '@shared/types/lighting';
import type { RenderSettings, ToneMappingMode } from '@shared/types/render';
import { sphericalToCartesian } from '../constants/lightingPresets';
import { wrapWithAppliedNormalisation } from './modelNormalisation';

export function mapToneMapping(mode: ToneMappingMode): THREE.ToneMapping {
  switch (mode) {
    case 'ACESFilmic':
      return THREE.ACESFilmicToneMapping;
    case 'AgX':
      return THREE.AgXToneMapping;
    case 'Reinhard':
      return THREE.ReinhardToneMapping;
    case 'None':
      return THREE.NoToneMapping;
  }
}

export function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new Error('Render cancelled.');
  }
}

export async function yieldFrame(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

export async function createThumbnailFromDataUrl(imageDataUrl: string, maxWidth = 480): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Failed to create render thumbnail.'));
    el.src = imageDataUrl;
  });
  const scale = Math.min(1, maxWidth / img.width);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const thumb = document.createElement('canvas');
  thumb.width = w;
  thumb.height = h;
  const ctx = thumb.getContext('2d');
  if (ctx) {
    ctx.drawImage(img, 0, 0, w, h);
  }
  return thumb.toDataURL('image/png');
}

export interface OffscreenRenderInput {
  objects: SceneObject[];
  background: BackgroundConfig;
  cameraState: CameraState;
  settings: RenderSettings;
  hdris: HdriRecord[];
  signal?: AbortSignal;
  onProgress?: (percent: number, stage: string) => void;
}

export interface OffscreenRenderOutput {
  imageDataUrl: string;
  thumbnailDataUrl: string;
  width: number;
  height: number;
}

export async function renderSceneOffscreen(
  input: OffscreenRenderInput
): Promise<OffscreenRenderOutput> {
  const { objects, background, cameraState, settings, hdris, signal, onProgress } = input;
  const { width, height } = settings;

  onProgress?.(2, 'Initializing WebGL renderer...');
  checkAbort(signal);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: settings.transparentBg,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance',
  });

  const disposables: { dispose: () => void }[] = [];

  try {
    const gl = renderer.getContext();
    const maxTex = renderer.capabilities.maxTextureSize;
    const maxRb = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number;
    const maxDim = Math.min(maxTex, maxRb);
    if (width > maxDim || height > maxDim) {
      throw new Error(
        `Requested resolution (${width}×${height}) exceeds your GPU limit (${maxDim}px).`
      );
    }

    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = mapToneMapping(settings.toneMapping);
    renderer.toneMappingExposure = settings.exposure;
    if (settings.transparentBg) {
      renderer.setClearColor(0x000000, 0);
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(settings.fov, width / height, 0.1, 500);
    camera.position.set(...cameraState.position);
    camera.lookAt(...cameraState.target);
    camera.updateMatrixWorld();

    // Background (unless transparent PNG)
    if (!settings.transparentBg) {
      if (background.type === 'color' && background.color) {
        scene.background = new THREE.Color(background.color);
      } else if (background.type === 'image' && background.imagePath) {
        onProgress?.(8, 'Loading background...');
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

    // Lighting
    const { lighting } = settings;
    const ambient = new THREE.AmbientLight(lighting.ambientColor, lighting.ambientIntensity);
    scene.add(ambient);

    const keyPos = sphericalToCartesian(lighting.keyLight.azimuthDeg, lighting.keyLight.elevationDeg);
    const keyLight = new THREE.DirectionalLight(lighting.keyLight.color, lighting.keyLight.intensity);
    keyLight.position.set(...keyPos);
    if (lighting.keyLight.castShadow !== false) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(2048, 2048);
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 60;
      const d = 15;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const fillPos = sphericalToCartesian(lighting.fillLight.azimuthDeg, lighting.fillLight.elevationDeg);
    const fillLight = new THREE.DirectionalLight(lighting.fillLight.color, lighting.fillLight.intensity);
    fillLight.position.set(...fillPos);
    scene.add(fillLight);

    const rimPos = sphericalToCartesian(lighting.rimLight.azimuthDeg, lighting.rimLight.elevationDeg);
    const rimLight = new THREE.DirectionalLight(lighting.rimLight.color, lighting.rimLight.intensity);
    rimLight.position.set(...rimPos);
    scene.add(rimLight);

    // Optional HDRI
    if (lighting.hdriId) {
      const hdri = hdris.find((h) => h.id === lighting.hdriId);
      if (hdri) {
        onProgress?.(15, 'Loading HDRI environment...');
        const isExr = hdri.filePath.toLowerCase().endsWith('.exr');
        const hdriLoader = isExr ? new EXRLoader() : new RGBELoader();
        const hdrTex = await hdriLoader.loadAsync(
          `/api/lighting/hdris/${encodeURIComponent(hdri.id)}/file`
        );
        hdrTex.mapping = THREE.EquirectangularReflectionMapping;
        const pmrem = new THREE.PMREMGenerator(renderer);
        const envRT = pmrem.fromEquirectangular(hdrTex);
        scene.environment = envRT.texture;
        if (lighting.hdriAsBackground && !settings.transparentBg) {
          scene.background = hdrTex;
        } else {
          hdrTex.dispose();
        }
        pmrem.dispose();
        disposables.push(envRT);
        if (lighting.hdriAsBackground && !settings.transparentBg) {
          disposables.push(hdrTex);
        }
      }
    }

    checkAbort(signal);

    // Optional Ground Plane
    if (settings.groundPlaneEnabled) {
      const groundGeo = new THREE.PlaneGeometry(100, 100);
      const groundMat = settings.groundShadowOnly
        ? new THREE.ShadowMaterial({ opacity: 0.45 })
        : new THREE.MeshStandardMaterial({ color: settings.groundColor, roughness: 0.9, metalness: 0.0 });
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.001;
      ground.receiveShadow = true;
      scene.add(ground);
      disposables.push(groundGeo, groundMat);
    }

    // Load visible scene objects (cache GLTF per modelId)
    const visibleObjects = objects.filter((o) => o.visible);
    const gltfLoader = await createConfiguredGLTFLoader();
    const modelCache = new Map<string, THREE.Group>();

    for (let i = 0; i < visibleObjects.length; i++) {
      checkAbort(signal);
      const obj = visibleObjects[i];
      const pct = 20 + Math.round(((i + 1) / Math.max(1, visibleObjects.length)) * 30);
      onProgress?.(pct, `Loading models (${i + 1}/${visibleObjects.length})...`);

      let baseGroup = modelCache.get(obj.modelId);
      if (!baseGroup) {
        try {
          const gltf = await gltfLoader.loadAsync(`/api/models/${obj.modelId}/file`);
          baseGroup = gltf.scene;
          modelCache.set(obj.modelId, baseGroup);
        } catch {
          continue; // Skip missing models in render
        }
      }

      const clone = baseGroup.clone(true);
      const isMirrored = obj.scale[0] * obj.scale[1] * obj.scale[2] < 0;
      clone.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if ((isMirrored || lighting.hdriId) && child.material) {
            const mat = (child.material as THREE.Material).clone();
            if (isMirrored) mat.side = THREE.DoubleSide;
            if (lighting.hdriId && 'envMapIntensity' in mat) {
              (mat as THREE.MeshStandardMaterial).envMapIntensity = lighting.hdriIntensity;
            }
            child.material = mat;
            disposables.push(mat);
          }
        }
      });

      const wrapped = wrapWithAppliedNormalisation(clone, obj.appliedNormalisation);
      wrapped.position.set(...obj.position);
      wrapped.rotation.set(...obj.rotation);
      wrapped.scale.set(...obj.scale);
      scene.add(wrapped);
    }

    checkAbort(signal);
    onProgress?.(55, 'Setting up post-processing...');

    // Post-processing pipeline
    const renderTarget = new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      samples: 4,
    });
    disposables.push(renderTarget);

    const composer = new EffectComposer(renderer, renderTarget);
    composer.setSize(width, height);
    composer.addPass(new RenderPass(scene, camera));

    if (settings.ssaoEnabled && !settings.transparentBg) {
      const ssaoPass = new SSAOPass(scene, camera, width, height);
      ssaoPass.kernelRadius = 0.6;
      ssaoPass.minDistance = 0.002;
      ssaoPass.maxDistance = 0.15;
      composer.addPass(ssaoPass);
      disposables.push(ssaoPass);
    }

    if (settings.dofEnabled) {
      const bokehPass = new BokehPass(scene, camera, {
        focus: settings.dofFocusDistance,
        aperture: settings.dofAperture,
        maxblur: 0.015,
      });
      composer.addPass(bokehPass);
      disposables.push(bokehPass);
    }

    if (!settings.transparentBg) {
      composer.addPass(new OutputPass());
    }
    disposables.push(composer);

    // Supersampled / jittered accumulation across `settings.samples`
    const samples = settings.samples || 1;
    const haltonJitter: [number, number][] = [
      [0, 0],
      [0.25, -0.25],
      [-0.25, 0.25],
      [0.375, 0.125],
      [-0.375, -0.125],
      [0.125, 0.375],
      [-0.125, -0.375],
      [0.4375, -0.3125],
    ];

    let imageDataUrl: string;

    if (samples === 1) {
      onProgress?.(75, 'Rendering frame...');
      camera.clearViewOffset();
      camera.updateProjectionMatrix();

      if (settings.transparentBg && !settings.dofEnabled) {
        renderer.render(scene, camera);
      } else {
        composer.render();
      }
      await yieldFrame();
      checkAbort(signal);
      onProgress?.(95, 'Encoding PNG...');
      imageDataUrl = renderer.domElement.toDataURL('image/png');
    } else {
      const accumBuffer = new Float32Array(width * height * 4);
      const pixelBuffer = new Uint8Array(width * height * 4);

      for (let s = 0; s < samples; s++) {
        checkAbort(signal);
        const pct = 60 + Math.round(((s + 1) / samples) * 35);
        onProgress?.(pct, `Rendering sample ${s + 1}/${samples}...`);

        const [jx, jy] = haltonJitter[s % haltonJitter.length];
        camera.setViewOffset(width, height, jx, jy, width, height);
        camera.updateProjectionMatrix();

        if (settings.transparentBg && !settings.dofEnabled) {
          renderer.render(scene, camera);
        } else {
          composer.render();
        }

        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixelBuffer);
        for (let i = 0; i < pixelBuffer.length; i++) {
          accumBuffer[i] += pixelBuffer[i];
        }
        await yieldFrame();
      }

      camera.clearViewOffset();
      checkAbort(signal);
      onProgress?.(96, 'Encoding PNG...');

      const accumCanvas = document.createElement('canvas');
      accumCanvas.width = width;
      accumCanvas.height = height;
      const accumCtx = accumCanvas.getContext('2d');
      if (!accumCtx) throw new Error('Failed to create offscreen 2D canvas.');

      const outImage = accumCtx.createImageData(width, height);
      const outData = outImage.data;
      const rowBytes = width * 4;
      for (let y = 0; y < height; y++) {
        const srcRowOffset = (height - 1 - y) * rowBytes;
        const dstRowOffset = y * rowBytes;
        for (let x = 0; x < rowBytes; x++) {
          outData[dstRowOffset + x] = Math.round(accumBuffer[srcRowOffset + x] / samples);
        }
      }
      accumCtx.putImageData(outImage, 0, 0);
      imageDataUrl = accumCanvas.toDataURL('image/png');
    }

    const thumbnailDataUrl = await createThumbnailFromDataUrl(imageDataUrl, 480);

    onProgress?.(100, 'Complete');
    return { imageDataUrl, thumbnailDataUrl, width, height };
  } finally {
    for (const d of disposables) {
      try {
        d.dispose();
      } catch {
        // Ignore disposal errors
      }
    }
    renderer.dispose();
  }
}
