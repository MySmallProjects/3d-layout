import React, { useEffect, useState } from 'react';
import * as THREE from 'three';
import { useSceneStore } from '../../store/sceneStore';

/**
 * Simple edit-mode ground plane renderer for the interactive viewport.
 * Positioned slightly below GridFloor (y = -0.002) so grid lines remain crisp.
 */
export const GroundPlaneRenderer: React.FC = () => {
  const groundPlane = useSceneStore((s) => s.groundPlane);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!groundPlane.visible || groundPlane.type !== 'image' || !groundPlane.imagePath) {
      setTexture(null);
      return;
    }

    let cancelled = false;
    let loadedTex: THREE.Texture | null = null;
    const loader = new THREE.TextureLoader();
    const url = `/api/backgrounds/${encodeURIComponent(groundPlane.imagePath)}/file`;

    loader.load(
      url,
      (tex) => {
        if (cancelled) {
          tex.dispose();
          return;
        }
        const rep = Math.max(1, groundPlane.textureRepeat || 1);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(rep, rep);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        loadedTex = tex;
        setTexture(tex);
      },
      undefined,
      () => {
        if (!cancelled) setTexture(null);
      }
    );

    return () => {
      cancelled = true;
      if (loadedTex) {
        loadedTex.dispose();
      }
    };
  }, [groundPlane.visible, groundPlane.type, groundPlane.imagePath, groundPlane.textureRepeat]);

  if (!groundPlane.visible || groundPlane.type === 'none') {
    return null;
  }

  const size = Math.max(1, groundPlane.size || 100);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.002, 0]}
      receiveShadow
    >
      <planeGeometry args={[size, size]} />
      {groundPlane.type === 'shadow-catcher' ? (
        <shadowMaterial transparent opacity={0.35} />
      ) : groundPlane.type === 'image' && texture ? (
        <meshStandardMaterial map={texture} roughness={0.9} metalness={0} />
      ) : (
        <meshStandardMaterial
          color={groundPlane.color || '#22252e'}
          roughness={0.9}
          metalness={0}
        />
      )}
    </mesh>
  );
};
