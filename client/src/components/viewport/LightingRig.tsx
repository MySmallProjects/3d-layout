import React, { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { useSceneStore } from '../../store/sceneStore';
import { sphericalToCartesian } from '../../constants/lightingPresets';
import { fetchHdris } from '../../api/lighting';
import type { HdriRecord } from '@shared/types/lighting';

export const LightingRig: React.FC = () => {
  const { scene } = useThree();
  const lighting = useSceneStore((s) => s.lighting);
  const [hdris, setHdris] = useState<HdriRecord[]>([]);

  useEffect(() => {
    if (!lighting.hdriId) return;
    fetchHdris().then(setHdris).catch(() => {});
  }, [lighting.hdriId]);

  // Load HDRI environment in edit mode when selected
  useEffect(() => {
    if (!lighting.hdriId) {
      return;
    }

    const record = hdris.find((h) => h.id === lighting.hdriId);
    if (!record) return;

    let cancelled = false;
    let loadedTex: THREE.DataTexture | null = null;
    const isExr = record.filePath.toLowerCase().endsWith('.exr');
    const loader = isExr ? new EXRLoader() : new RGBELoader();

    loader.load(
      `/api/lighting/hdris/${encodeURIComponent(record.id)}/file`,
      (tex) => {
        if (cancelled) {
          tex.dispose();
          return;
        }
        tex.mapping = THREE.EquirectangularReflectionMapping;
        loadedTex = tex;
        scene.environment = tex;
        if (lighting.hdriAsBackground) {
          scene.background = tex;
        }
      },
      undefined,
      (err) => console.error('Failed to load HDRI:', err)
    );

    return () => {
      cancelled = true;
      if (loadedTex) {
        if (scene.environment === loadedTex) scene.environment = null;
        if (scene.background === loadedTex) scene.background = null;
        loadedTex.dispose();
      }
    };
  }, [lighting.hdriId, lighting.hdriAsBackground, lighting.hdriIntensity, hdris, scene]);

  const keyPos = sphericalToCartesian(lighting.keyLight.azimuthDeg, lighting.keyLight.elevationDeg);
  const fillPos = sphericalToCartesian(lighting.fillLight.azimuthDeg, lighting.fillLight.elevationDeg);

  return (
    <>
      {/* Fast edit-mode lighting preview */}
      <ambientLight intensity={lighting.ambientIntensity} color={lighting.ambientColor} />
      <directionalLight
        position={keyPos}
        intensity={lighting.keyLight.intensity}
        color={lighting.keyLight.color}
      />
      <directionalLight
        position={fillPos}
        intensity={lighting.fillLight.intensity * 0.7}
        color={lighting.fillLight.color}
      />
    </>
  );
};
