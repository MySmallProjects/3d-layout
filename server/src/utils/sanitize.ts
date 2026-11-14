import path from 'path';

/**
 * Strips path traversal sequences and illegal filesystem characters
 * from user-supplied names or filenames.
 */
export function sanitizeName(name: string): string {
  if (!name || typeof name !== 'string') {
    return 'unnamed';
  }
  // Remove control characters, path delimiters, and null bytes
  const cleaned = name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\.{2,}/g, '.')
    .trim();

  return cleaned.length > 0 ? cleaned.slice(0, 255) : 'unnamed';
}

/**
 * Checks if a target file path is safely contained within an allowed base directory.
 */
export function isSafePath(baseDir: string, targetPath: string): boolean {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(targetPath);
  return resolvedTarget.startsWith(resolvedBase + path.sep);
}
