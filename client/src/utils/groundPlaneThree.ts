import * as THREE from 'three';
import type { GroundPlaneConfig } from '@shared/types/scene';

export interface GroundFallbackSettings {
  groundPlaneEnabled: boolean;
  groundShadowOnly: boolean;
  groundColor: string;
}

/**
 * Builds the ground plane mesh for offline renders (both standard and path-traced).
 * Falls back to legacy RenderSettings ground fields when no scene GroundPlaneConfig is provided.
 */
export async function createGroundPlaneMesh(
  groundPlane: GroundPlaneConfig | undefined,
  settingsFallback: GroundFallbackSettings,
  isPathTracer: boolean,
  disposables: Array<{ dispose(): void }>
): Promise<THREE.Mesh | null> {
  const gp: GroundPlaneConfig = groundPlane ?? {
    type: settingsFallback.groundPlaneEnabled
      ? settingsFallback.groundShadowOnly
        ? 'shadow-catcher'
        : 'color'
      : 'none',
    visible: settingsFallback.groundPlaneEnabled,
    size: 100,
    color: settingsFallback.groundColor,
    textureRepeat: 1,
  };

  if (!gp.visible || gp.type === 'none') {
    return null;
  }

  const size = Math.max(1, gp.size || 100);
  const groundGeo = new THREE.PlaneGeometry(size, size);
  let groundMat: THREE.Material;

  if (gp.type === 'shadow-catcher') {
    if (isPathTracer) {
      // three-gpu-pathtracer@0.0.23 treats material.matte as a transparent holdout cutout,
      // not a shadow catcher; pathTracerRenderer composites a shadow-catcher pass instead.
      return null;
    }
    groundMat = new THREE.ShadowMaterial({ opacity: 0.45 });
  } else if (gp.type === 'image' && gp.imagePath) {
    try {
      const loader = new THREE.TextureLoader();
      const tex = await loader.loadAsync(
        `/api/backgrounds/${encodeURIComponent(gp.imagePath)}/file`
      );
      const rep = Math.max(1, gp.textureRepeat || 1);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(rep, rep);
      tex.colorSpace = THREE.SRGBColorSpace;
      disposables.push(tex);
      groundMat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.9,
        metalness: 0.0,
      });
    } catch {
      groundMat = new THREE.MeshStandardMaterial({
        color: gp.color || '#22252e',
        roughness: 0.9,
        metalness: 0.0,
      });
    }
  } else {
    groundMat = new THREE.MeshStandardMaterial({
      color: gp.color || '#22252e',
      roughness: 0.9,
      metalness: 0.0,
    });
  }

  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.001;
  ground.receiveShadow = true;
  disposables.push(groundGeo, groundMat);
  return ground;
}
