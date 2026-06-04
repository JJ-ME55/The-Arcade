// @ts-nocheck
import * as THREE from 'three';
import { TrackPath } from '../logic/trackPath';
import { pixTex } from './textures';

export interface BoostPad {
  x: number;
  z: number;
  /** Half-length along the track direction — kart's xz must be inside this to trigger. */
  halfLen: number;
  /** Half-width across the track — match the pad's visible width. */
  halfWidth: number;
  /** Forward tangent of the pad (along the track) — only triggers when kart is moving along this. */
  tx: number;
  tz: number;
  triggered: boolean[]; // per-kart cooldown so a single pass doesn't re-fire each frame
}

/** Forward-pointing chevron arrow painted onto a track pad — neon orange + yellow on
 *  black for high contrast against the road. */
function arrowTexture(): THREE.CanvasTexture {
  // Small kart-sized pad: two bold electric-cyan chevrons on a glowing rounded panel so it
  // POPS against the warm dirt/grass and reads instantly as a boost (distinct from anything
  // else in the scene). Transparent elsewhere so it sits like paint on the road.
  const t = pixTex(96, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    // soft dark glow panel behind the arrows for contrast
    g.fillStyle = 'rgba(6,20,28,0.5)';
    g.beginPath();
    (g as any).roundRect ? (g as any).roundRect(6, 6, w - 12, h - 12, 14) : g.rect(6, 6, w - 12, h - 12);
    g.fill();
    const chevron = (yTop: number, yBottom: number, inset: number) => {
      g.beginPath();
      g.moveTo(w / 2, yTop);
      g.lineTo(w - inset, yBottom);
      g.lineTo(w - inset, yBottom + 22);
      g.lineTo(w / 2, yTop + 30);
      g.lineTo(inset, yBottom + 22);
      g.lineTo(inset, yBottom);
      g.closePath();
      g.fill();
    };
    const rows: [number, number][] = [[20, 56], [64, 100]];
    for (const [yt, yb] of rows) { g.fillStyle = 'rgba(0,0,0,0.6)'; chevron(yt - 3, yb + 3, 12); }  // outline
    for (const [yt, yb] of rows) { g.fillStyle = '#19e6ff'; chevron(yt, yb, 16); }                   // electric cyan
    for (const [yt, yb] of rows) { g.fillStyle = '#ccfbff'; chevron(yt + 7, yb - 5, 28); }           // white-hot inner
  });
  return t;
}

/** Build N boost pads scattered along the track (avoiding the bridge zone). They sit
 *  flat on the road, pointing in the direction of travel, and trigger a turbo boost
 *  on the kart that drives over them. Spots are deterministic per `seed` so each
 *  load lays them in the same place. */
export function buildBoostPads(track: TrackPath, numKarts: number, seed = 1, count = 3): { pads: BoostPad[]; meshes: THREE.Mesh[] } {
  const pads: BoostPad[] = [];
  const meshes: THREE.Mesh[] = [];
  const tex = arrowTexture();
  const PAD_LEN = 9;   // ~one kart long — small, so players have to fight for the line over it
  const PAD_WIDTH = 7; // ~one kart wide — only one kart really gets it
  const half = PAD_WIDTH / 2;

  // pick `count` evenly-spaced base progress positions, jittered by seed so it doesn't
  // feel like a metronome but is still reproducible. Avoid the jump zone.
  const jz = track.jumpZone;
  const positions: number[] = [];
  let s = (seed * 0.6180339887) % 1; // golden-ratio shuffle for nice spread
  while (positions.length < count) {
    s = (s + 0.6180339887) % 1;
    if (jz && s >= jz.startProgress - 0.04 && s <= jz.endProgress + 0.04) continue;
    positions.push(s);
  }

  for (const p of positions) {
    const a = track.pointAtProgress(p);
    const b = track.pointAtProgress((p + 0.005) % 1);
    let tx = b.x - a.x;
    let tz = b.z - a.z;
    const l = Math.hypot(tx, tz) || 1;
    tx /= l;
    tz /= l;

    const corners: number[] = [];
    const halfLen = PAD_LEN / 2;
    const px = tz; // across-track perpendicular
    const pz = -tx;
    // quad oriented along the track
    const c = (sl: number, sw: number) => {
      corners.push(a.x + tx * sl * halfLen + px * sw * half, 0.18, a.z + tz * sl * halfLen + pz * sw * half);
    };
    c(-1, -1); c(1, -1); c(-1, 1); c(1, 1);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(corners, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 0, 1, 1], 2));
    geo.setIndex([0, 2, 1, 1, 2, 3]);
    // depthWrite off + high renderOrder so the arrows always paint cleanly over the road
    // (no z-fighting), transparent so only the chevrons show.
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    mesh.renderOrder = 10; // DoubleSide so it shows regardless of the quad's facing (was likely back-face culled = invisible)

    pads.push({
      x: a.x,
      z: a.z,
      halfLen,
      halfWidth: half,
      tx,
      tz,
      triggered: new Array(numKarts).fill(false),
    });
    meshes.push(mesh);
  }
  return { pads, meshes };
}

/** True if (x, z) is inside the pad rectangle. */
export function padContains(pad: BoostPad, x: number, z: number): boolean {
  const dx = x - pad.x;
  const dz = z - pad.z;
  const along = dx * pad.tx + dz * pad.tz;
  const across = dx * pad.tz - dz * pad.tx; // perpendicular component
  return Math.abs(along) <= pad.halfLen && Math.abs(across) <= pad.halfWidth;
}
