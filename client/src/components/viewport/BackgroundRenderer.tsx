import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from '../../store/sceneStore';

export const BackgroundRenderer = () => {
  const { scene, gl } = useThree();
  const background = useSceneStore((state) => state.background);

  useEffect(() => {
    let texture: THREE.Texture | null = null;

    if (background.type === 'color' && background.color) {
      scene.background = new THREE.Color(background.color);
      scene.environment = null;
    } else if (background.type === 'image' && background.imagePath) {
      const loader = new THREE.TextureLoader();
      texture = loader.load(
        `/api/backgrounds/${background.imagePath}/file`,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          if (background.equirectangular) {
            tex.mapping = THREE.EquirectangularReflectionMapping;
            scene.environment = tex;
          } else {
            scene.environment = null;
          }
          scene.background = tex;
        },
        undefined,
        (err) => {
          console.error('Failed to load background texture:', err);
          scene.background = new THREE.Color('#1a1c23');
        }
      );
    } else {
      scene.background = null;
      scene.environment = null;
      gl.setClearColor(0x000000, 0);
    }

    return () => {
      if (texture) {
        texture.dispose();
      }
    };
  }, [background, scene, gl]);

  return null;
};
