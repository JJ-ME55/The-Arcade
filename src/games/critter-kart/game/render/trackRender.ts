// @ts-nocheck
import * as THREE from 'three';
import { TrackPath } from '../logic/trackPath';
import { pixTex, smoothTex } from './textures';
import { PREMIUM_RENDER } from './scene';

const REPEAT_EVERY = 32; // world units per road-texture tile along the length

function roadTexture(): THREE.CanvasTexture {
  // Premium = a warm packed-dirt track (matches the meadow art); legacy = the old grey
  // asphalt with lane lines. x across the road (u), y along the road (v, tiles).
  if (!PREMIUM_RENDER) {
    const t = pixTex(64, 64, (g, w, h) => {
      g.fillStyle = '#6b6f76';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 120; i++) {
        g.fillStyle = Math.random() < 0.5 ? '#666a71' : '#71757c';
        g.fillRect((Math.random() * w) | 0, (Math.random() * h) | 0, 2, 2);
      }
      g.fillStyle = '#cfd2d6';
      g.fillRect(2, 0, 3, h);
      g.fillRect(w - 5, 0, 3, h);
      g.fillStyle = '#f2e27a';
      for (let y = 0; y < h; y += 24) g.fillRect(w / 2 - 2, y, 4, 12);
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  const t = smoothTex(256, 256, (g, w, h) => {
    // base packed earth
    g.fillStyle = '#a87d4d';
    g.fillRect(0, 0, w, h);
    // broad mottling — soft darker/lighter earth patches for an organic, non-flat surface
    for (let i = 0; i < 260; i++) {
      const r = 6 + Math.random() * 22;
      g.fillStyle = Math.random() < 0.5
        ? `rgba(122,88,52,${0.06 + Math.random() * 0.12})`   // darker damp earth
        : `rgba(196,160,108,${0.06 + Math.random() * 0.12})`; // lighter dry dust
      g.beginPath();
      g.arc(Math.random() * w, Math.random() * h, r, 0, Math.PI * 2);
      g.fill();
    }
    // two worn wheel ruts running along the track (slightly darker, packed) at ~30%/70% width
    for (const cx of [w * 0.3, w * 0.7]) {
      const grad = g.createLinearGradient(cx - 22, 0, cx + 22, 0);
      grad.addColorStop(0, 'rgba(120,86,50,0)');
      grad.addColorStop(0.5, 'rgba(120,86,50,0.32)');
      grad.addColorStop(1, 'rgba(120,86,50,0)');
      g.fillStyle = grad;
      g.fillRect(cx - 22, 0, 44, h);
    }
    // dusty, lighter edges (cart kicks dust to the verge)
    for (const [x0, x1, c0, c1] of [[0, 26, 'rgba(206,176,120,0.55)', 'rgba(206,176,120,0)'], [w - 26, w, 'rgba(206,176,120,0)', 'rgba(206,176,120,0.55)']] as const) {
      const grad = g.createLinearGradient(x0, 0, x1, 0);
      grad.addColorStop(0, c0 as string);
      grad.addColorStop(1, c1 as string);
      g.fillStyle = grad;
      g.fillRect(x0 as number, 0, (x1 as number) - (x0 as number), h);
    }
    // scattered small pebbles + grit
    for (let i = 0; i < 90; i++) {
      const s = 1 + Math.random() * 3;
      const tone = 90 + Math.random() * 80;
      g.fillStyle = `rgba(${tone},${tone - 8},${tone - 20},${0.4 + Math.random() * 0.4})`;
      g.beginPath();
      g.arc(Math.random() * w, Math.random() * h, s, 0, Math.PI * 2);
      g.fill();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export interface RoadMesh {
  mesh: THREE.Mesh;
  /** After the bridge GLB has loaded and we know the actual deck heights where the
   *  road meets it, lift the road's cross-sections just before/after the gap so the
   *  surface connects flush with the bridge instead of a hard step. Idempotent —
   *  safe to call again when deck heights change. */
  applyBridgeRamps(entryY: number, exitY: number): void;
}

/** Build the road as a ribbon mesh following the track centreline. */
export function createRoadMesh(path: TrackPath): RoadMesh {
  const pts = path.points;
  const n = pts.length;
  const hw = path.halfWidth;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // total length, so the texture repeats a WHOLE number of times around the loop —
  // otherwise the v coordinate snaps from large back to 0 at the closure and the road
  // markings garble right where the lap joins ("where the end and start meet").
  let total = 0;
  for (let i = 0; i < n; i++) total += Math.hypot(pts[(i + 1) % n].x - pts[i].x, pts[(i + 1) % n].z - pts[i].z);
  const rep = total / Math.max(1, Math.round(total / REPEAT_EVERY));

  // n+1 cross-sections: the last duplicates the first with a continuous v, so the
  // closing quad's UV runs smoothly into the start instead of seaming.
  const cumAt: number[] = []; // cumulative arc length at cross-section i
  let along = 0;
  for (let i = 0; i <= n; i++) {
    const idx = i % n;
    const prev = pts[(idx - 1 + n) % n];
    const next = pts[(idx + 1) % n];
    const cur = pts[idx];
    let tx = next.x - prev.x;
    let tz = next.z - prev.z;
    const tl = Math.hypot(tx, tz) || 1;
    tx /= tl;
    tz /= tl;
    const px = tz; // perpendicular in xz plane
    const pz = -tx;
    const y = 0.02;
    positions.push(cur.x + px * hw, y, cur.z + pz * hw); // left
    positions.push(cur.x - px * hw, y, cur.z - pz * hw); // right
    const v = along / rep;
    uvs.push(0, v, 1, v);
    cumAt.push(along);
    along += Math.hypot(pts[(idx + 1) % n].x - cur.x, pts[(idx + 1) % n].z - cur.z);
  }

  const jz = path.jumpZone;
  const bz = path.bridgeZone;
  const az = path.archBridgeZone;
  for (let i = 0; i < n; i++) {
    const midProgress = ((cumAt[i] + cumAt[i + 1]) / 2) / total;
    // skip quads in the jump zone (water gap) OR a bridge zone (the wooden bridge deck fills
    // that span as the drivable surface) — leaves a clean hole for water to show through.
    if (jz && midProgress >= jz.startProgress && midProgress <= jz.endProgress) continue;
    if (bz && midProgress >= bz.startProgress && midProgress <= bz.endProgress) continue;
    if (az && midProgress >= az.startProgress && midProgress <= az.endProgress) continue;
    const a = i * 2;
    const b = i * 2 + 1;
    const c = (i + 1) * 2;
    const d = (i + 1) * 2 + 1;
    indices.push(a, b, c, b, d, c);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals(); // PBR (MeshStandardMaterial) needs normals or it renders black
  const roadTex = roadTexture();
  let roadMat: THREE.Material;
  if (PREMIUM_RENDER) {
    roadTex.colorSpace = THREE.SRGBColorSpace; // correct albedo under ACES tone mapping
    roadMat = new THREE.MeshStandardMaterial({ map: roadTex, side: THREE.DoubleSide, roughness: 0.95, metalness: 0 });
  } else {
    roadMat = new THREE.MeshBasicMaterial({ map: roadTex, side: THREE.DoubleSide });
  }
  const mesh = new THREE.Mesh(geo, roadMat);
  mesh.receiveShadow = PREMIUM_RENDER;

  const BASE_Y = 0.02;
  return {
    mesh,
    applyBridgeRamps(entryY, exitY) {
      const jz = path.jumpZone;
      if (!jz) return;
      const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const sp = jz.startProgress;
      const ep = jz.endProgress;
      const RAMP = 0.03; // approach length in progress (~5 % of the loop) — gradual climb
      for (let i = 0; i <= n; i++) {
        const p = cumAt[i] / total;
        let y = BASE_Y;
        if (p >= sp - RAMP && p < sp) {
          const t = (p - (sp - RAMP)) / RAMP; // 0 → 1 climbing into the bridge
          y = BASE_Y + entryY * t;
        } else if (p >= sp && p <= ep) {
          // cross-sections sitting inside the gap are invisible (their quads are skipped),
          // BUT the cross-section right at sp is shared with the last rendered quad, so it
          // still needs to be at entryY for that quad to slope correctly. Lerp through.
          const t = (ep - sp) > 0 ? (p - sp) / (ep - sp) : 0;
          y = BASE_Y + entryY + (exitY - entryY) * t;
        } else if (p > ep && p <= ep + RAMP) {
          const t = 1 - (p - ep) / RAMP; // 1 → 0 descending off the bridge
          y = BASE_Y + exitY * t;
        }
        arr[i * 6 + 1] = y;     // left vertex Y
        arr[i * 6 + 4] = y;     // right vertex Y
      }
      posAttr.needsUpdate = true;
    },
  };
}

/**
 * A checkered start/finish line laid flat across the road at the first sample.
 * Built as an explicit ground quad (corners from the tangent + perpendicular) so
 * it always sits square across the road, whatever direction the start faces.
 */
export function createStartLine(path: TrackPath): THREE.Mesh {
  const a = path.points[0];
  const b = path.points[1 % path.points.length];
  let tx = b.x - a.x;
  let tz = b.z - a.z;
  const tl = Math.hypot(tx, tz) || 1;
  tx /= tl;
  tz /= tl;
  const px = tz; // perpendicular, across the road
  const pz = -tx;
  const hw = path.halfWidth;
  const half = 3; // half-depth along the track
  const y = 0.05;
  const corner = (s: number, a2: number) => [a.x + px * hw * s + tx * half * a2, y, a.z + pz * hw * s + tz * half * a2];
  const positions: number[] = [
    ...corner(1, 1), ...corner(-1, 1), ...corner(1, -1), ...corner(-1, -1),
  ];
  const tex = pixTex(32, 8, (g, w, h) => {
    for (let yy = 0; yy < h; yy++)
      for (let xx = 0; xx < w; xx++) {
        g.fillStyle = (xx + yy) % 2 === 0 ? '#ffffff' : '#202020';
        g.fillRect(xx, yy, 1, 1);
      }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
  geo.setIndex([0, 2, 1, 1, 2, 3]);
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
}
