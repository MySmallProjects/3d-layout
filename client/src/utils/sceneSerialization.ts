import type { CameraBookmark, GroundPlaneConfig, GroundPlaneType, SceneData, SceneObject } from '@shared/types/scene';
import { useSceneStore } from '../store/sceneStore';

export function captureLiveSceneData(): SceneData {
  const getCam = (window as any).__getCameraState as (() => SceneData['camera']) | undefined;
  const camera = getCam ? getCam() : undefined;
  return useSceneStore.getState().serializeScene(camera);
}

export function captureViewportThumbnail(): string | null {
  const capture = (window as any).__captureViewportThumbnail as (() => string) | undefined;
  if (!capture) return null;
  try {
    return capture();
  } catch {
    return null;
  }
}

export function exportSceneJson(sceneName: string, data: SceneData): void {
  const safeName = sceneName.replace(/[^a-z0-9-_ ]/gi, '_').trim() || 'scene';
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}.scene.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function toVec3(val: unknown, fallback: [number, number, number]): [number, number, number] {
  if (
    Array.isArray(val) &&
    val.length === 3 &&
    val.every((n) => typeof n === 'number' && Number.isFinite(n))
  ) {
    return [val[0], val[1], val[2]];
  }
  return fallback;
}

export function validateAndNormalizeSceneJson(
  raw: unknown,
  knownModelIds: Set<string>
): { data: SceneData; warnings: string[] } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Invalid scene JSON: root must be an object.');
  }

  const obj = raw as Record<string, unknown>;
  if (obj.objects !== undefined && !Array.isArray(obj.objects)) {
    throw new Error('Invalid scene JSON: "objects" must be an array.');
  }

  const warnings: string[] = [];
  const rawObjects = (obj.objects as unknown[] | undefined) || [];
  const missingModels = new Set<string>();

  const objects: SceneObject[] = rawObjects.map((item, idx) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Invalid object entry at index ${idx}.`);
    }
    const rec = item as Record<string, unknown>;
    const isGroup = rec.isGroup === true || rec.modelId === '__group__';
    const modelId =
      typeof rec.modelId === 'string' && rec.modelId.trim()
        ? rec.modelId
        : isGroup
          ? '__group__'
          : '';
    if (!modelId) {
      throw new Error(`Object at index ${idx} is missing a valid "modelId".`);
    }
    if (!isGroup && !knownModelIds.has(modelId)) {
      missingModels.add(modelId);
    }

    const rawApplied = rec.appliedNormalisation as Record<string, unknown> | undefined;
    const appliedNormalisation =
      rawApplied &&
      typeof rawApplied === 'object' &&
      typeof rawApplied.scaleFactor === 'number' &&
      Number.isFinite(rawApplied.scaleFactor) &&
      rawApplied.scaleFactor > 0
        ? {
            scaleFactor: rawApplied.scaleFactor,
            pivotOffset: toVec3(rawApplied.pivotOffset, [0, 0, 0]),
          }
        : undefined;

    return {
      id:
        typeof rec.id === 'string' && rec.id.trim()
          ? rec.id
          : `obj_imp_${Date.now()}_${idx}`,
      modelId,
      name: typeof rec.name === 'string' && rec.name.trim() ? rec.name : `Object ${idx + 1}`,
      position: toVec3(rec.position, [0, 0, 0]),
      rotation: toVec3(rec.rotation, [0, 0, 0]),
      scale: toVec3(rec.scale, [1, 1, 1]),
      visible: typeof rec.visible === 'boolean' ? rec.visible : true,
      locked: typeof rec.locked === 'boolean' ? rec.locked : false,
      parentId: typeof rec.parentId === 'string' ? rec.parentId : null,
      ...(isGroup ? { isGroup: true } : {}),
      ...(appliedNormalisation ? { appliedNormalisation } : {}),
    };
  });

  if (missingModels.size > 0) {
    warnings.push(
      `${missingModels.size} referenced library model(s) not found; placeholder boxes will be shown.`
    );
  }

  const rawBg = (obj.background && typeof obj.background === 'object'
    ? obj.background
    : { type: 'color', color: '#1a1c23' }) as SceneData['background'];

  const rawCam = (obj.camera && typeof obj.camera === 'object' ? obj.camera : {}) as Record<
    string,
    unknown
  >;

  const rawBookmarks = Array.isArray(obj.cameraBookmarks) ? obj.cameraBookmarks : [];
  const cameraBookmarks: CameraBookmark[] = rawBookmarks
    .filter((b): b is Record<string, unknown> => Boolean(b && typeof b === 'object'))
    .map((b, idx) => {
      const cam = (b.camera && typeof b.camera === 'object' ? b.camera : {}) as Record<string, unknown>;
      return {
        id: typeof b.id === 'string' && b.id.trim() ? b.id : `cam_imp_${Date.now()}_${idx}`,
        name: typeof b.name === 'string' && b.name.trim() ? b.name : `Camera ${idx + 1}`,
        camera: {
          position: toVec3(cam.position, [8, 6, 8]),
          target: toVec3(cam.target, [0, 0, 0]),
        },
        createdAt: typeof b.createdAt === 'string' ? b.createdAt : new Date().toISOString(),
      };
    });

  const rawGround = (obj.groundPlane && typeof obj.groundPlane === 'object' ? obj.groundPlane : {}) as Record<
    string,
    unknown
  >;
  const validGroundTypes: GroundPlaneType[] = ['none', 'shadow-catcher', 'color', 'image'];
  const groundType: GroundPlaneType = validGroundTypes.includes(rawGround.type as GroundPlaneType)
    ? (rawGround.type as GroundPlaneType)
    : 'shadow-catcher';
  const groundPlane: GroundPlaneConfig = {
    type: groundType,
    visible: typeof rawGround.visible === 'boolean' ? rawGround.visible : true,
    size: typeof rawGround.size === 'number' && Number.isFinite(rawGround.size) ? Math.max(1, Math.min(500, rawGround.size)) : 100,
    color: typeof rawGround.color === 'string' ? rawGround.color : '#22252e',
    ...(typeof rawGround.imagePath === 'string' && rawGround.imagePath ? { imagePath: rawGround.imagePath } : {}),
    textureRepeat: typeof rawGround.textureRepeat === 'number' && Number.isFinite(rawGround.textureRepeat)
      ? Math.max(1, Math.min(50, rawGround.textureRepeat))
      : 1,
  };

  const data: SceneData = {
    schemaVersion: typeof obj.schemaVersion === 'number' ? obj.schemaVersion : 1,
    objects,
    gridVisible: typeof obj.gridVisible === 'boolean' ? obj.gridVisible : true,
    background: rawBg,
    camera: {
      position: toVec3(rawCam.position, [8, 6, 8]),
      target: toVec3(rawCam.target, [0, 0, 0]),
    },
    lighting:
      obj.lighting && typeof obj.lighting === 'object'
        ? (obj.lighting as Record<string, unknown>)
        : {},
    renderSettings:
      obj.renderSettings && typeof obj.renderSettings === 'object'
        ? (obj.renderSettings as Record<string, unknown>)
        : {},
    groundPlane,
    cameraBookmarks,
  };

  return { data, warnings };
}
