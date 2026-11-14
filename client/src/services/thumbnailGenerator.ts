import * as THREE from 'three';
import { createConfiguredGLTFLoader } from './gltfLoader';

const THUMBNAIL_WIDTH = 512;
const THUMBNAIL_HEIGHT = 512;

/**
 * Renders an offscreen preview of a GLB model with neutral lighting and auto-framing,
 * returning a PNG base64 Data URL.
 */
export async function generateThumbnailDataUrl(modelUrl: string): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = THUMBNAIL_WIDTH;
  canvas.height = THUMBNAIL_HEIGHT;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true
  });
  renderer.setSize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0); // transparent background

  const scene = new THREE.Scene();

  // Neutral lighting rig
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xffffff, 2.0);
  mainLight.position.set(5, 10, 7.5);
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
  fillLight.position.set(-5, 5, -5);
  scene.add(fillLight);

  const camera = new THREE.PerspectiveCamera(
    45,
    THUMBNAIL_WIDTH / THUMBNAIL_HEIGHT,
    0.01,
    1000
  );

  const loader = await createConfiguredGLTFLoader();

  return new Promise<string>((resolve, reject) => {
    loader.load(
      modelUrl,
      (gltf) => {
        try {
          const object = gltf.scene;

          // Compute bounding box
          const box = new THREE.Box3().setFromObject(object);
          const size = new THREE.Vector3();
          const center = new THREE.Vector3();
          box.getSize(size);
          box.getCenter(center);

          // Center the object at origin
          object.position.sub(center);
          scene.add(object);

          // Auto-frame camera based on bounding sphere radius
          const maxDim = Math.max(size.x, size.y, size.z);
          const radius = Math.max(maxDim * 0.5, 0.001);
          const fovRad = (camera.fov * Math.PI) / 180;
          let cameraDistance = radius / Math.sin(fovRad / 2);
          cameraDistance *= 1.35; // margin

          // Three-quarter isometric view angle
          const direction = new THREE.Vector3(1.2, 0.9, 1.5).normalize();
          camera.position.copy(direction.multiplyScalar(cameraDistance));
          camera.near = cameraDistance / 100;
          camera.far = cameraDistance * 100;
          camera.updateProjectionMatrix();
          camera.lookAt(0, 0, 0);

          // Render
          renderer.render(scene, camera);
          const dataUrl = canvas.toDataURL('image/png');

          // Clean up
          scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.geometry?.dispose();
              if (Array.isArray(child.material)) {
                child.material.forEach((m) => m.dispose());
              } else if (child.material) {
                child.material.dispose();
              }
            }
          });
          renderer.dispose();

          resolve(dataUrl);
        } catch (err) {
          renderer.dispose();
          reject(err);
        }
      },
      undefined,
      (error) => {
        renderer.dispose();
        reject(error);
      }
    );
  });
}
