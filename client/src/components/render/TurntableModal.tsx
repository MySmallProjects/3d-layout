import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import { Film, Download, X, Loader2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useSceneStore } from '../../store/sceneStore';
import { loadCachedGltf } from '../viewport/SceneObjectRenderer';
import { wrapWithAppliedNormalisation } from '../../utils/modelNormalisation';
import { applyInstanceMaterialState } from '../../utils/materialOverride';
import { createGroundPlaneMesh } from '../../utils/groundPlaneThree';
import { sphericalToCartesian } from '../../constants/lightingPresets';
import { isEffectivelyVisible } from '../../utils/sceneHierarchy';

interface TurntableModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TurntableModal: React.FC<TurntableModalProps> = ({ isOpen, onClose }) => {
  const {
    currentSceneName,
    objects,
    lighting,
    background,
    groundPlane,
    renderSettings,
    cameraState,
  } = useSceneStore();

  const [durationSec, setDurationSec] = useState(4);
  const [fps, setFps] = useState(24);
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef(false);

  if (!isOpen) return null;

  const handleClose = () => {
    cancelRef.current = true;
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }
    setRecording(false);
    setError(null);
    onClose();
  };

  const handleGenerate = async () => {
    setError(null);
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }
    if (typeof MediaRecorder === 'undefined') {
      setError('MediaRecorder API is not supported by this browser.');
      return;
    }

    cancelRef.current = false;
    setRecording(true);
    setProgress(0);

    const width = resolution === '1080p' ? 1920 : 1280;
    const height = resolution === '1080p' ? 1080 : 720;
    const totalFrames = Math.max(10, Math.round(durationSec * fps));

    let renderer: THREE.WebGLRenderer | null = null;
    const disposables: Array<{ dispose(): void }> = [];
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true,
      });
      renderer.setSize(width, height, false);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = renderSettings.exposure ?? 1.0;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(
        background.type === 'color' && background.color ? background.color : '#1e2028'
      );

      // Lighting
      const ambient = new THREE.AmbientLight(lighting.ambientColor, lighting.ambientIntensity);
      scene.add(ambient);

      const hemi = new THREE.HemisphereLight('#ffffff', '#444455', 0.35);
      scene.add(hemi);

      const addDirLight = (cfg: typeof lighting.keyLight, castShadow: boolean) => {
        if (cfg.intensity <= 0) return;
        const light = new THREE.DirectionalLight(cfg.color, cfg.intensity);
        const [lx, ly, lz] = sphericalToCartesian(cfg.azimuthDeg, cfg.elevationDeg, 25);
        light.position.set(lx, ly, lz);
        if (castShadow) {
          light.castShadow = true;
          light.shadow.mapSize.set(2048, 2048);
          light.shadow.camera.near = 0.5;
          light.shadow.camera.far = 80;
          const d = 20;
          light.shadow.camera.left = -d;
          light.shadow.camera.right = d;
          light.shadow.camera.top = d;
          light.shadow.camera.bottom = -d;
          light.shadow.bias = -0.0005;
        }
        scene.add(light);
      };

      addDirLight(lighting.keyLight, true);
      addDirLight(lighting.fillLight, false);
      addDirLight(lighting.rimLight, false);

      // Ground
      const groundMesh = await createGroundPlaneMesh(
        groundPlane,
        {
          groundPlaneEnabled: renderSettings.groundPlaneEnabled,
          groundShadowOnly: renderSettings.groundShadowOnly,
          groundColor: renderSettings.groundColor,
        },
        false,
        disposables
      );
      if (groundMesh) {
        scene.add(groundMesh);
      }

      // Objects
      for (const obj of objects) {
        if (obj.isGroup || !obj.modelId || !isEffectivelyVisible(obj, objects)) continue;
        const entry = await loadCachedGltf(obj.modelId);
        const clone = entry.scene.clone(true);
        const isMirrored = obj.scale[0] * obj.scale[1] * obj.scale[2] < 0;
        const clonedMats = applyInstanceMaterialState(
          clone,
          entry.scene,
          isMirrored,
          obj.materialOverride
        );
        disposables.push(...clonedMats);
        clone.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        const wrapped = wrapWithAppliedNormalisation(clone, obj.appliedNormalisation);

        // Compute world matrix from parent chain
        let cur: typeof obj | undefined = obj;
        const chain: (typeof obj)[] = [];
        while (cur) {
          chain.unshift(cur);
          cur = cur.parentId ? objects.find((o) => o.id === cur!.parentId) : undefined;
        }
        let parentNode: THREE.Object3D = scene;
        for (let i = 0; i < chain.length - 1; i++) {
          const g = new THREE.Group();
          g.position.set(...chain[i].position);
          g.rotation.set(...chain[i].rotation);
          g.scale.set(...chain[i].scale);
          parentNode.add(g);
          parentNode = g;
        }
        wrapped.position.set(...obj.position);
        wrapped.rotation.set(...obj.rotation);
        wrapped.scale.set(...obj.scale);
        parentNode.add(wrapped);
      }

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 500);
      const target = new THREE.Vector3(...cameraState.target);
      const startPos = new THREE.Vector3(...cameraState.position);
      const offset = startPos.clone().sub(target);
      const radius = Math.max(0.5, Math.hypot(offset.x, offset.z));
      const baseAngle = Math.atan2(offset.z, offset.x);
      const camY = startPos.y;

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const stream = canvas.captureStream(fps);
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: resolution === '1080p' ? 8_000_000 : 5_000_000,
      });

      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };

      const donePromise = new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
        recorder.onerror = () => reject(new Error('MediaRecorder failed during capture.'));
      });

      recorder.start();
      const frameIntervalMs = Math.max(16, Math.round(1000 / fps));

      for (let i = 0; i < totalFrames; i++) {
        if (cancelRef.current) {
          recorder.stop();
          throw new Error('Turntable export cancelled.');
        }
        const theta = baseAngle + (i / totalFrames) * Math.PI * 2;
        camera.position.set(
          target.x + radius * Math.cos(theta),
          camY,
          target.z + radius * Math.sin(theta)
        );
        camera.lookAt(target);
        renderer.render(scene, camera);
        (stream.getVideoTracks()[0] as any)?.requestFrame?.();
        setProgress(Math.round(((i + 1) / totalFrames) * 100));
        await new Promise((r) => setTimeout(r, frameIntervalMs));
      }

      recorder.stop();
      const blob = await donePromise;
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
    } catch (err) {
      if (!cancelRef.current) {
        setError(err instanceof Error ? err.message : 'Turntable export failed');
      }
    } finally {
      disposables.forEach((d) => d.dispose());
      if (renderer) {
        renderer.dispose();
      }
      setRecording(false);
    }
  };

  const safeName =
    (currentSceneName || 'scene').trim().replace(/[^a-zA-Z0-9_-]+/g, '-') || 'scene';

  return (
    <Modal title="Turntable Animation Export" isOpen={isOpen} onClose={handleClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '340px' }}>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          Orbits the active camera 360° around the current target and exports a WebM video.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Duration (s)
            </label>
            <input
              type="number"
              min={2}
              max={15}
              value={durationSec}
              disabled={recording}
              onChange={(e) => setDurationSec(Math.max(2, Math.min(15, Number(e.target.value) || 4)))}
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: '12px',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Frame Rate
            </label>
            <select
              value={fps}
              disabled={recording}
              onChange={(e) => setFps(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: '12px',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--text-main)',
              }}
            >
              <option value={15}>15 FPS</option>
              <option value={24}>24 FPS</option>
              <option value={30}>30 FPS</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Resolution
            </label>
            <select
              value={resolution}
              disabled={recording}
              onChange={(e) => setResolution(e.target.value as '720p' | '1080p')}
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: '12px',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--text-main)',
              }}
            >
              <option value="720p">1280×720</option>
              <option value="1080p">1920×1080</option>
            </select>
          </div>
        </div>

        {recording && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--accent)' }}>
            <Loader2 size={14} className="spin" />
            <span>Rendering turntable ({progress}%)...</span>
          </div>
        )}

        {error && (
          <div style={{ fontSize: '12px', color: '#fca5a5', padding: '8px', borderRadius: '4px', backgroundColor: 'rgba(239,68,68,0.12)' }}>
            {error}
          </div>
        )}

        {videoUrl && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <video
              src={videoUrl}
              controls
              loop
              autoPlay
              muted
              style={{ width: '100%', borderRadius: '6px', border: '1px solid var(--border-color)' }}
            />
            <a
              href={videoUrl}
              download={`${safeName}-turntable.webm`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '5px',
                backgroundColor: '#10b981',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <Download size={14} />
              Download WebM Video
            </a>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
          <button
            type="button"
            onClick={handleClose}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              fontSize: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <X size={12} />
            Close
          </button>
          <button
            type="button"
            disabled={recording}
            onClick={handleGenerate}
            style={{
              padding: '6px 14px',
              borderRadius: '4px',
              backgroundColor: 'var(--accent)',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              opacity: recording ? 0.6 : 1,
            }}
          >
            <Film size={13} />
            {recording ? 'Rendering...' : 'Render Turntable'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
