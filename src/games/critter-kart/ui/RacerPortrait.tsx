// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createGLTFLoader } from '../game/render/loader';

type LoadState = { kind: 'loading'; pct: number } | { kind: 'ready' } | { kind: 'error'; msg: string };

/**
 * Slowly-rotating 3D portrait of a racer's character GLB, for the select screen.
 * Sits inside whatever container you put it in and fills it; cleans up its own
 * WebGL context on unmount. Shows a download % while the model is fetching so
 * the user can tell the difference between "still loading" and "broken".
 */
export function RacerPortrait({ modelPath, accentColor, style }: { modelPath: string; accentColor: string; style?: React.CSSProperties }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [load, setLoad] = useState<LoadState>({ kind: 'loading', pct: 0 });

  useEffect(() => {
    setLoad({ kind: 'loading', pct: 0 });
    const mount = mountRef.current;
    if (!mount) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const fitSize = () => renderer.setSize(Math.max(1, mount.clientWidth), Math.max(1, mount.clientHeight));
    fitSize();
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0.35, 3.3);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const key = new THREE.DirectionalLight(0xffffff, 0.7);
    key.position.set(2.5, 4, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffe4b8, 0.35);
    rim.position.set(-3, 2, -2);
    scene.add(rim);

    let model: THREE.Object3D | null = null;
    let cancelled = false;
    createGLTFLoader().load(
      modelPath,
      (gltf) => {
        if (cancelled) return;
        const m = gltf.scene;
        m.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(m);
        const size = box.getSize(new THREE.Vector3());
        const scale = 1.72 / Math.max(0.001, size.y); // large but with breathing room so it isn't edge-cropped (playtest)
        m.scale.setScalar(scale);
        m.updateMatrixWorld(true);
        const box2 = new THREE.Box3().setFromObject(m);
        const c = box2.getCenter(new THREE.Vector3());
        m.position.set(-c.x, -c.y, -c.z);
        scene.add(m);
        model = m;
        setLoad({ kind: 'ready' });
      },
      (xhr) => {
        if (cancelled) return;
        if (xhr.total > 0) setLoad({ kind: 'loading', pct: Math.round((xhr.loaded / xhr.total) * 100) });
      },
      (err) => {
        if (cancelled) return;
        console.error('[RacerPortrait] failed to load', modelPath, err);
        setLoad({ kind: 'error', msg: 'Failed to load' });
      },
    );

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (model) model.rotation.y += dt * 0.7; // slow spin so the player sees every side
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onResize = () => {
      fitSize();
      camera.aspect = Math.max(0.01, mount.clientWidth / Math.max(1, mount.clientHeight));
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [modelPath]);

  const overlay: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    fontFamily: 'Nunito',
    fontWeight: 800,
    fontSize: 13,
    color: '#fff',
    textShadow: '0 1px 3px rgba(0,0,0,.5)',
    pointerEvents: 'none',
    letterSpacing: 0.5,
  };

  return (
    <div
      ref={mountRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: `radial-gradient(circle at 50% 60%, ${accentColor}44, transparent 72%)`,
        borderRadius: 14,
        ...style,
      }}
    >
      {load.kind === 'loading' && <div style={overlay}>Loading {load.pct}%</div>}
      {load.kind === 'error' && <div style={{ ...overlay, color: '#ffb4b4' }}>{load.msg}</div>}
    </div>
  );
}
