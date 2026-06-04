// @ts-nocheck
import * as THREE from 'three';
import type { Racer, PatternKind } from '../entities/Kart';
import { pixTex } from './textures';

const css = (hex: number) => '#' + hex.toString(16).padStart(6, '0');

/**
 * A tileable pattern texture for the kart body — the racer's `color` as background,
 * with their `pattern` motif painted in `accent`. Tiled across whatever UVs the
 * kart model uses, so each racer reads as a distinct livery instead of a recolour.
 */
export function makeKartBodyTexture(racer: Racer): THREE.CanvasTexture {
  const W = 64;
  const tex = pixTex(W, W, (g) => paintPattern(g, W, racer.pattern, css(racer.color), css(racer.accent)));
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

function paintPattern(g: CanvasRenderingContext2D, W: number, kind: PatternKind, base: string, accent: string): void {
  g.fillStyle = base;
  g.fillRect(0, 0, W, W);
  g.fillStyle = accent;
  switch (kind) {
    case 'dots': {
      // staggered polka-dot grid — tiles seamlessly
      const r = 4.5;
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          const cx = col * (W / 4) + (W / 8) + (row % 2) * (W / 8);
          const cy = row * (W / 4) + (W / 8);
          dot(g, cx % W, cy, r);
        }
      }
      break;
    }
    case 'hex': {
      // turtle-shell hexagon grid (outlined hex cells)
      g.strokeStyle = accent;
      g.lineWidth = 2;
      const s = 10; // hex "radius"
      for (let row = -1; row < W / s + 1; row++) {
        for (let col = -1; col < W / s + 1; col++) {
          const cx = col * s * 1.5;
          const cy = row * s * Math.sqrt(3) + ((col % 2) * s * Math.sqrt(3)) / 2;
          hex(g, cx, cy, s - 1);
        }
      }
      break;
    }
    case 'chevrons': {
      // V-shaped feather stripes running across
      g.strokeStyle = accent;
      g.lineWidth = 3;
      g.lineCap = 'round';
      for (let y = -6; y < W + 6; y += 12) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(W / 2, y - 6);
        g.lineTo(W, y);
        g.stroke();
      }
      break;
    }
    case 'patches': {
      // bear-fur irregular blobs, placed so they tile
      const blobs: [number, number, number][] = [
        [12, 16, 9], [42, 22, 11], [22, 44, 10], [50, 48, 8], [4, 36, 6], [58, 8, 7],
      ];
      for (const [x, y, r] of blobs) blob(g, x, y, r);
      break;
    }
  }
}

function dot(g: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}

function hex(g: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.closePath();
  g.stroke();
}

function blob(g: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  for (let i = 0; i < 5; i++) {
    const a = (Math.PI * 2 * i) / 5;
    dot(g, x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * 0.55);
  }
}

/**
 * A procedural "topper" on the driver's head — each racer's animal identity.
 * Built from cones / spheres / boxes so it costs nothing to ship and stays consistent
 * across reloads. Caller positions the group above the driver's head.
 */
export function makeTopper(racer: Racer): THREE.Group {
  switch (racer.topper) {
    case 'foxEars': return foxEars(racer.color, racer.accent);
    case 'turtleShell': return turtleShell(racer.color, racer.accent);
    case 'birdCrest': return birdCrest(racer.color, racer.accent);
    case 'bearEars': return bearEars(racer.color, racer.accent);
  }
}

function mat(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
}

function foxEars(primary: number, accent: number): THREE.Group {
  const g = new THREE.Group();
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.6, 8), mat(primary));
    ear.position.set(side * 0.18, 0.3, 0.02);
    ear.rotation.z = side * -0.18; // tip outward a touch
    g.add(ear);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.25, 8), mat(accent));
    tip.position.set(side * 0.18 - side * 0.04, 0.5, 0.02);
    tip.rotation.z = side * -0.18;
    g.add(tip);
  }
  return g;
}

function turtleShell(primary: number, accent: number): THREE.Group {
  const g = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(primary));
  dome.scale.y = 0.7;
  dome.position.y = 0.05;
  g.add(dome);
  // hex spots in accent so the shell reads as turtle-shell pattern
  for (const [x, z] of [[0, 0], [0.18, 0.1], [-0.18, 0.1], [0.1, -0.16], [-0.1, -0.16]]) {
    const spot = new THREE.Mesh(new THREE.CircleGeometry(0.07, 6), mat(accent));
    spot.position.set(x, 0.38, z);
    spot.rotation.x = -Math.PI / 2;
    g.add(spot);
  }
  // a little tail/head poke
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), mat(accent));
  tail.position.set(0, 0.08, 0.42);
  tail.scale.set(0.9, 0.9, 1.3);
  g.add(tail);
  return g;
}

function birdCrest(primary: number, accent: number): THREE.Group {
  const g = new THREE.Group();
  // three crest fins along the head, front to back
  for (let i = 0; i < 3; i++) {
    const h = 0.45 - i * 0.08;
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.06, h, 4), mat(primary));
    fin.position.set(0, h / 2, 0.18 - i * 0.18);
    fin.rotation.x = -0.25;
    g.add(fin);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.035, h * 0.45, 4), mat(accent));
    tip.position.set(0, h * 0.78, 0.18 - i * 0.18 - 0.04);
    tip.rotation.x = -0.25;
    g.add(tip);
  }
  // small beak poking forward
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.32, 8), mat(0xf4a52a));
  beak.position.set(0, -0.05, 0.42);
  beak.rotation.x = Math.PI / 2;
  g.add(beak);
  return g;
}

/**
 * Paint a single-mesh fox model with realistic fox colours using per-vertex colours
 * based on each vertex's position in its local bounding box: orange back/head/sides,
 * cream belly + chest + throat, dark "socks" on the paws. Works on any single-mesh
 * fox-shaped model (the Meshy.ai output is one fused mesh with no materials).
 */
export function colorAsFox(root: THREE.Object3D): void {
  const orange = new THREE.Color(0xed8030); // bright cartoon fox orange
  const cream = new THREE.Color(0xfff3dc);  // off-white belly
  const dark = new THREE.Color(0x202028);   // black paws/feet
  // measure the model so the colour thresholds are independent of its size/scale
  const box = new THREE.Box3().setFromObject(root);
  const sz = box.getSize(new THREE.Vector3());
  const ctr = box.getCenter(new THREE.Vector3());
  const yMin = box.min.y;
  const yHeight = sz.y || 1;
  const zHalf = (sz.z || 1) / 2;

  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.geometry) return;
    const pos = m.geometry.attributes.position as THREE.BufferAttribute;
    if (!pos) return;
    // bake the mesh's own matrix into the threshold space so position rules read
    // correctly even if Meshy nested or transformed the mesh
    m.updateMatrixWorld(true);
    const colors = new Float32Array(pos.count * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      const yNorm = (v.y - yMin) / yHeight;       // 0 = paws, 1 = ear tips
      const zSigned = (v.z - ctr.z) / zHalf;       // -1 = back, +1 = front
      let c = orange;
      if (yNorm < 0.12) c = dark;                  // bottom of the legs / paws
      else if (zSigned > 0.05 && yNorm < 0.62) c = cream; // belly + chest + chin
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    m.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    m.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, flatShading: true });
  });
}

function bearEars(primary: number, accent: number): THREE.Group {
  const g = new THREE.Group();
  for (const side of [-1, 1]) {
    const outer = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), mat(primary));
    outer.scale.set(1, 0.85, 0.6);
    outer.position.set(side * 0.22, 0.22, 0);
    g.add(outer);
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), mat(accent));
    inner.scale.set(1, 0.8, 0.5);
    inner.position.set(side * 0.22, 0.24, 0.05);
    g.add(inner);
  }
  // tiny snout marker so the bear faces forward
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), mat(accent));
  snout.position.set(0, -0.05, 0.34);
  snout.scale.set(0.9, 0.7, 1.1);
  g.add(snout);
  return g;
}
