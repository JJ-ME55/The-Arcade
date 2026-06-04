// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createScene, PREMIUM_RENDER } from './game/render/scene';
import { createTrackStructures } from './game/render/trackStructures';
import { createTrackDressing } from './game/render/dressing';
import { createGLTFLoader } from './game/render/loader';
import { TrackPath } from './game/logic/trackPath';
import { SUNNY_MEADOW } from './game/tracks/sunnyMeadow';
import { Kart, ROSTER, type Racer } from './game/entities/Kart';

/**
 * Interactive COVER STUDIO (open with ?cover in the URL). Poses all six racers in their karts
 * cresting the lake ramp jump on Sunny Meadow, using the real models + the game's premium
 * lighting, and lets you orbit/zoom to frame the shot — then export at three sizes. No AI: it's
 * a true render of the actual characters + map, so they stay perfectly on-brand. Drop a logo on
 * top afterwards.
 */

// Each racer's pose in the launching pack (progress along the lap, lateral offset, height, nose
// pitch, boosting). Leader is highest/airborne; the rest climb the ramp behind, fanned across.
const POSE: { id: string; p: number; lat: number; y: number; pitch: number; boost: boolean }[] = [
  { id: 'rusty', p: 0.209, lat: 2, y: 12, pitch: -0.24, boost: true },   // leader, airborne
  { id: 'pip', p: 0.197, lat: -8, y: 7, pitch: -0.18, boost: true },     // cresting
  { id: 'fish', p: 0.194, lat: 8, y: 6, pitch: -0.15, boost: true },
  { id: 'shelly', p: 0.182, lat: -3, y: 2.2, pitch: -0.08, boost: false }, // climbing the ramp
  { id: 'jj', p: 0.177, lat: 7, y: 0.8, pitch: -0.03, boost: false },
  { id: 'bruno', p: 0.172, lat: -9, y: 0, pitch: 0, boost: false },
];

const EXPORTS: { label: string; w: number; h: number }[] = [
  { label: '1280×800 (16:10)', w: 1280, h: 800 },
  { label: '2400×1050 (16:7)', w: 2400, h: 1050 },
  { label: '1080×1920 (9:16)', w: 1080, h: 1920 },
];

export default function CoverShot() {
  const mountRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<((w: number, h: number, name: string) => void) | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mount = mountRef.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    const displayPR = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(displayPR);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    if (PREMIUM_RENDER) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    mount.appendChild(renderer.domElement);

    const track = new TrackPath(SUNNY_MEADOW);
    const { scene, sun } = createScene(track);
    let pmrem: THREE.PMREMGenerator | null = null;
    if (PREMIUM_RENDER) {
      pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    }

    const camera = new THREE.PerspectiveCamera(50, mount.clientWidth / mount.clientHeight, 0.1, 3000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    const loadingManager = new THREE.LoadingManager();
    const loader = createGLTFLoader(loadingManager);
    scene.add(createTrackStructures(track, loader).group);
    const dressing = createTrackDressing(track, loader);
    scene.add(dressing.group);

    // Pose the pack on the ramp.
    const karts: Kart[] = [];
    let leadX = 0, leadY = 6, leadZ = 0, fwdX = 0, fwdZ = 1;
    for (const pose of POSE) {
      const racer = ROSTER.find((r) => r.id === pose.id) as Racer | undefined;
      if (!racer) continue;
      const a = track.pointAtProgress(pose.p);
      const b = track.pointAtProgress((pose.p + 0.004) % 1);
      let tx = b.x - a.x, tz = b.z - a.z;
      const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      const nx = tz, nz = -tx; // perp
      const x = a.x + nx * pose.lat, z = a.z + nz * pose.lat;
      const heading = Math.atan2(tx, tz);
      const k = new Kart(racer, loader, true);
      k.syncTo({ x, z, y: pose.y, heading, velHeading: heading, speed: 0, driftDir: 0, driftCharge: 0, boostTimer: 0, recoverTimer: 0 });
      k.mesh.rotation.order = 'YXZ';
      k.mesh.rotation.y = heading;
      k.mesh.rotation.x = pose.pitch; // nose-up while launching
      if (pose.boost) k.setBoosting(true, 0);
      scene.add(k.mesh);
      karts.push(k);
      if (pose === POSE[0]) { leadX = x; leadY = pose.y; leadZ = z; fwdX = tx; fwdZ = tz; }
    }

    // Park the sun + shadow frustum over the pack, and aim the camera ahead of the leader looking
    // back at the launch (you can orbit freely from here).
    sun.position.set(leadX + 60, 90, leadZ + 40);
    sun.target.position.set(leadX, 0, leadZ);
    sun.target.updateMatrixWorld();
    controls.target.set(leadX, leadY - 2, leadZ);
    camera.position.set(leadX + fwdX * 34 + fwdZ * 14, 7, leadZ + fwdZ * 34 - fwdX * 14);
    controls.update();
    dressing.updateCulling(leadX, leadZ); // show props around the jump

    let raf = 0;
    const loop = () => { controls.update(); renderer.render(scene, camera); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);

    // Export: supersample (render at 2× the target into the buffer) then downscale to the exact
    // pixel size for a crisp PNG.
    captureRef.current = (w, h, name) => {
      const SS = 2;
      renderer.setPixelRatio(1);
      renderer.setSize(w * SS, h * SS, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      const out = document.createElement('canvas');
      out.width = w; out.height = h;
      out.getContext('2d')!.drawImage(renderer.domElement, 0, 0, w, h);
      const a = document.createElement('a');
      a.download = name;
      a.href = out.toDataURL('image/png');
      a.click();
      // restore the live preview
      renderer.setPixelRatio(displayPR);
      renderer.setSize(mount.clientWidth, mount.clientHeight, true);
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
    };

    let readyTimer: number | null = null;
    const markReady = () => { readyTimer = null; setReady(true); };
    loadingManager.onLoad = () => { if (readyTimer !== null) clearTimeout(readyTimer); readyTimer = window.setTimeout(markReady, 300); };
    loadingManager.onError = () => { if (readyTimer !== null) clearTimeout(readyTimer); readyTimer = window.setTimeout(markReady, 300); };

    const onResize = () => {
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      if (readyTimer !== null) clearTimeout(readyTimer);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose()); else if (mat) mat.dispose();
      });
      pmrem?.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  const btn: React.CSSProperties = {
    fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 13, color: '#1b2c4c',
    background: ready ? '#ffd23f' : '#9aa6b8', border: 'none', borderRadius: 10, padding: '10px 14px',
    cursor: ready ? 'pointer' : 'default', boxShadow: '0 3px 0 rgba(0,0,0,.35)',
  };

  return (
    <div ref={mountRef} style={{ width: '100vw', height: '100vh', position: 'fixed', inset: 0, background: '#0c1626' }}>
      <div style={{ position: 'absolute', left: 16, top: 16, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 2 }}>
        <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 13, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,.6)', maxWidth: 240 }}>
          {ready ? 'Drag to orbit · scroll to zoom · then export ↓' : 'Loading the world + karts…'}
        </div>
        {EXPORTS.map((e) => (
          <button key={e.label} style={btn} disabled={!ready}
            onClick={() => captureRef.current?.(e.w, e.h, `critter-kart-cover-${e.w}x${e.h}.png`)}>
            Download {e.label}
          </button>
        ))}
      </div>
    </div>
  );
}
