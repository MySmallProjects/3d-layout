import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

let isMeshoptInitialized = false;

/**
 * Creates and configures a GLTFLoader instance with the MeshoptDecoder registered.
 * Supports loading meshopt-compressed models reliably.
 */
export async function createConfiguredGLTFLoader(): Promise<GLTFLoader> {
  if (!isMeshoptInitialized) {
    if (MeshoptDecoder && MeshoptDecoder.ready) {
      await MeshoptDecoder.ready;
    }
    isMeshoptInitialized = true;
  }

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  return loader;
}
