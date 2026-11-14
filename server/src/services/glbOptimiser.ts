import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import {
  dedup,
  meshopt,
  prune,
  textureCompress,
  weld,
} from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

export interface GlbOptimiseOptions {
  maxTextureSize: number;
  webpQuality: number;
}

/**
 * Optimises a binary `.glb` file on disk using @gltf-transform:
 * cleans duplicate geometry/accessors, resizes textures down to `maxTextureSize`,
 * converts textures to WebP via sharp, and applies Meshopt compression (no Draco).
 */
export async function optimiseGlbFile(
  inputPath: string,
  outputPath: string,
  options: GlbOptimiseOptions
): Promise<void> {
  await MeshoptEncoder.ready;
  await MeshoptDecoder.ready;

  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'meshopt.decoder': MeshoptDecoder,
      'meshopt.encoder': MeshoptEncoder,
    });

  const document = await io.read(inputPath);

  const maxTex = Math.min(8192, Math.max(64, Math.round(options.maxTextureSize)));
  const quality = Math.min(100, Math.max(10, Math.round(options.webpQuality)));

  await document.transform(
    weld(),
    dedup(),
    prune(),
    textureCompress({
      encoder: sharp,
      targetFormat: 'webp',
      quality,
      resize: [maxTex, maxTex],
      effort: 60,
    }),
    meshopt({
      encoder: MeshoptEncoder,
      level: 'high',
    })
  );

  await io.write(outputPath, document);
}
