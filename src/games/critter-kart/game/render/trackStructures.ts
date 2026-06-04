// @ts-nocheck
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TrackPath } from '../logic/trackPath';
import { WATER_Y } from './scene';
import { makeBridgeGeometry, makeArchedBridgeGeometry, makeBridgeMaterial, makeUpperDeckGeometry, type DeckSample } from './proceduralBridge';

export interface TrackStructures {
  group: THREE.Group;
  /** Progress (along the track) at which the ramp begins / ends. ramp end == jz.startProgress. */
  rampStartProgress: number;
  rampEndProgress: number;
  /** Progress of the ramp's highest point (NOT necessarily rampEndProgress — the model's
   *  geometry might peak slightly before the model's footprint ends). Launch fires here. */
  rampPeakProgress: number;
  /** Pre-baked ramp surface Y at the given track progress, or null if outside the ramp's
   *  progress range (or the GLB hasn't loaded). Hot-path safe — just an array lerp. */
  rampSurfaceY(progress: number): number | null;
  /** The Y the kart reaches at the very top of the ramp — used by the launch impulse. */
  rampTopY: number;
}

/** Progress along the lap where the drive-through tunnel sits. dressing.ts reads this to
 *  frame it with hills/rocks so it doesn't look like a lone tunnel in a field. */
export const TUNNEL_PROGRESS = 0.671;

/** Inner edge of the optional upper deck (world units off the centre-line). Shared by the deck
 *  mesh, its solid channel walls, and the Y-pin so they all agree on where the channel begins. */
export const UPPER_DECK_INNER = 5;

// Ramp footprint along the track. Width matches the road (so it spans the drivable
// surface) and length gives a clear approach for the kart to ride up before launching.
const RAMP_WIDTH = 36;       // = 2 × halfWidth; spans the road exactly
const RAMP_LEN_WORLD = 30;   // along the track tangent
const RAMP_HEIGHT_WORLD = 5; // launches the kart up to ~5 units — clears the gap at speed

/**
 * Loads track-specific Meshy structures:
 *   - Stone lake — sized to the gap, water surface aligned to WATER_Y
 *   - Ramp jump — placed just before the lake; pre-baked heightmap drives the kart's
 *                 Y while its wheels ride the slope, then a launch impulse fires off the top
 */
export function createTrackStructures(track: TrackPath, loader: GLTFLoader): TrackStructures {
  const group = new THREE.Group();
  const struct: TrackStructures = {
    group,
    rampStartProgress: 0,
    rampEndProgress: 0,
    rampPeakProgress: 0,
    rampSurfaceY: () => null,
    rampTopY: 0,
  };

  if (!track.jumpZone) return struct;
  const jz = track.jumpZone;

  const start = track.pointAtProgress(jz.startProgress);
  const end = track.pointAtProgress(jz.endProgress);
  let tx = end.x - start.x;
  let tz = end.z - start.z;
  const gapLen = Math.hypot(tx, tz) || 1;
  tx /= gapLen;
  tz /= gapLen;
  const midX = (start.x + end.x) / 2;
  const midZ = (start.z + end.z) / 2;

  // ============ STONE LAKE ============
  const lakeLen = gapLen;
  const lakeWidth = track.halfWidth * 6;
  loader.load('/critter-kart/models/Track structures - Sunny meadow/Stone lake.glb', (gltf) => {
    const m = gltf.scene;
    const origBox = new THREE.Box3().setFromObject(m);
    const origSize = origBox.getSize(new THREE.Vector3());
    const sx = lakeLen / (origSize.x || 1);
    const sz = lakeWidth / (origSize.z || 1);
    const sy = (sx + sz) / 2;
    m.scale.set(sx, sy, sz);
    m.rotation.y = Math.atan2(-tz, tx); // model local +X aligns with track tangent
    m.updateMatrixWorld(true);

    const WATER_SURFACE_BBOX_FRACTION = 0.15;
    const newBox = new THREE.Box3().setFromObject(m);
    const c = newBox.getCenter(new THREE.Vector3());
    const sizeY = newBox.max.y - newBox.min.y;
    const waterSurfaceLocalY = newBox.min.y + WATER_SURFACE_BBOX_FRACTION * sizeY;
    m.position.x += midX - c.x;
    m.position.z += midZ - c.z;
    m.position.y += WATER_Y - waterSurfaceLocalY;
    m.traverse((o) => { const mm = o as THREE.Mesh; if (mm.isMesh) mm.receiveShadow = true; });
    group.add(m);
  });

  // ============ RAMP JUMP ============
  // Place the ramp so its TOP coincides with the lake's start edge: kart drives up, then
  // launches at the moment its progress crosses jz.startProgress.
  const rampLenProgress = RAMP_LEN_WORLD / track.totalLength;
  struct.rampEndProgress = jz.startProgress;
  struct.rampStartProgress = jz.startProgress - rampLenProgress;

  let rampHeights: Float32Array | null = null;
  const SAMPLES = 30;
  struct.rampSurfaceY = (progress) => {
    if (!rampHeights) return null;
    if (progress < struct.rampStartProgress || progress > struct.rampEndProgress) return null;
    const t = (progress - struct.rampStartProgress) / (struct.rampEndProgress - struct.rampStartProgress || 1);
    const idx = t * (SAMPLES - 1);
    const i0 = Math.floor(idx);
    const i1 = Math.min(SAMPLES - 1, i0 + 1);
    const f = idx - i0;
    return rampHeights[i0] * (1 - f) + rampHeights[i1] * f;
  };

  loader.load('/critter-kart/models/Track structures - Sunny meadow/Ramp jump.glb', (gltf) => {
    const m = gltf.scene;

    // Scale non-uniformly to a known footprint. Model local axes assumed: +Z = length
    // (kart's direction of travel up the ramp), +X = width, +Y = height. Verified from
    // bbox inspection: Z is the longest, Y has classic wedge density profile.
    const origBox = new THREE.Box3().setFromObject(m);
    const origSize = origBox.getSize(new THREE.Vector3());
    const sx = RAMP_WIDTH / (origSize.x || 1);
    const sz = RAMP_LEN_WORLD / (origSize.z || 1);
    const sy = RAMP_HEIGHT_WORLD / (origSize.y || 1);
    m.scale.set(sx, sy, sz);

    // Align model local +Z with the track tangent at the ramp's midpoint, so the slope
    // direction matches the kart's direction of travel.
    const rampMidProg = (struct.rampStartProgress + struct.rampEndProgress) / 2;
    const a = track.pointAtProgress(rampMidProg);
    const b = track.pointAtProgress(Math.min(1, rampMidProg + 0.001));
    let ttx = b.x - a.x;
    let ttz = b.z - a.z;
    const tl = Math.hypot(ttx, ttz) || 1;
    ttx /= tl;
    ttz /= tl;
    // Local +Z points DOWNHILL on this model — flip 180° so the high end (launch tip)
    // faces the lake and the low end (wide base) faces the kart on approach.
    m.rotation.y = Math.atan2(ttx, ttz) + Math.PI;
    m.updateMatrixWorld(true);

    // Centre horizontally on the ramp's midpoint, drop so bbox bottom = 0 (road level).
    const newBox = new THREE.Box3().setFromObject(m);
    const c = newBox.getCenter(new THREE.Vector3());
    m.position.x += a.x - c.x;
    m.position.z += a.z - c.z;
    m.position.y += 0 - newBox.min.y; // bottom of artwork flush with the road
    m.updateMatrixWorld(true);

    m.traverse((o) => { const mm = o as THREE.Mesh; if (mm.isMesh) { mm.castShadow = true; mm.receiveShadow = true; } });
    group.add(m);

    // Pre-bake the ramp surface heightmap by raycasting from above at each progress
    // sample along the centreline. Avoids per-frame raycasting against a 700k-vert mesh.
    rampHeights = new Float32Array(SAMPLES);
    const raycaster = new THREE.Raycaster();
    const downVec = new THREE.Vector3(0, -1, 0);
    const origin = new THREE.Vector3();
    let lastValid = 0;
    for (let s = 0; s < SAMPLES; s++) {
      const t = s / (SAMPLES - 1);
      const p = struct.rampStartProgress + t * (struct.rampEndProgress - struct.rampStartProgress);
      const pt = track.pointAtProgress(p);
      origin.set(pt.x, 200, pt.z);
      raycaster.set(origin, downVec);
      const hits = raycaster.intersectObject(m, true);
      if (hits.length > 0) {
        rampHeights[s] = hits[0].point.y;
        lastValid = hits[0].point.y;
      } else {
        rampHeights[s] = lastValid;
      }
    }
    // Find the heightmap's actual peak (the model's geometry may peak slightly before
    // the end of the sample range; we want to launch the kart AT the high point, not after).
    let peakIdx = 0;
    for (let s = 1; s < SAMPLES; s++) {
      if (rampHeights[s] > rampHeights[peakIdx]) peakIdx = s;
    }
    struct.rampTopY = rampHeights[peakIdx];
    struct.rampPeakProgress = struct.rampStartProgress +
      (peakIdx / (SAMPLES - 1)) * (struct.rampEndProgress - struct.rampStartProgress);
  });

  // ============ TUNNEL ============
  // A big hill-tunnel the whole road drives THROUGH, placed later in the lap. Purely visual
  // (the opening clears the road, so no collision) — scaled tall so the kart + chase camera
  // pass under it cleanly, oriented so its hole (the model's long +X axis) runs along the
  // track. dressing.ts frames it with embankments/rocks so it doesn't stand alone.
  loader.load('/critter-kart/models/Track structures - Sunny meadow/Tunnel.glb', (gltf) => {
    const m = gltf.scene;
    const a = track.pointAtProgress(TUNNEL_PROGRESS);
    const b = track.pointAtProgress(TUNNEL_PROGRESS + 0.004);
    let tx = b.x - a.x;
    let tz = b.z - a.z;
    const l = Math.hypot(tx, tz) || 1;
    tx /= l;
    tz /= l;

    const size = new THREE.Vector3();
    new THREE.Box3().setFromObject(m).getSize(size);
    const TUNNEL_HEIGHT = 52; // world height — smaller so it reads as a real tunnel you whoosh through
    const scale = TUNNEL_HEIGHT / (size.y || 1);
    m.scale.setScalar(scale);
    // The hole runs along the model's local +Z (not +X), so align +Z with the track tangent
    // — this is what makes the road run straight THROUGH the opening rather than into its side.
    m.rotation.y = Math.atan2(tx, tz);
    m.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(m);
    const c = box.getCenter(new THREE.Vector3());
    m.position.x += a.x - c.x;
    m.position.z += a.z - c.z;
    m.position.y -= box.min.y; // sit on the ground
    m.traverse((o) => { const mm = o as THREE.Mesh; if (mm.isMesh) mm.receiveShadow = true; });
    group.add(m);
  });

  // ============ BRIDGE (second water crossing — drive-over) ============
  // A lowered water pool with a procedural wooden bridge spanning the road. The road + ground
  // are already cut here (trackRender + scene), and the bridge deck sits at road height (y≈0)
  // so karts just drive across — no jump, no Y physics (handled by the flat road they're on).
  if (track.bridgeZone) {
    const bz = track.bridgeZone;
    const a = track.pointAtProgress(bz.startProgress);
    const b = track.pointAtProgress(bz.endProgress);
    let tx = b.x - a.x;
    let tz = b.z - a.z;
    const gapLen = Math.hypot(tx, tz) || 1;
    tx /= gapLen;
    tz /= gapLen;
    const midX = (a.x + b.x) / 2;
    const midZ = (a.z + b.z) / 2;
    const yaw = Math.atan2(tx, tz); // align bridge local +Z (its length) with the track tangent
    const hw = track.halfWidth;

    // Water pool below the bridge — a generous flat square that more than covers the hole
    // (the surrounding opaque ground hides the excess), so no rotation alignment is needed.
    const waterSide = Math.hypot(gapLen, hw * 1.7 * 2) + 30;
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(waterSide, waterSide),
      new THREE.MeshStandardMaterial({ color: 0x2f8fd0, roughness: 0.22, metalness: 0.15 }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(midX, -15, midZ);
    water.receiveShadow = true;
    group.add(water);

    // The wooden bridge deck (flush at y=0) spanning the gap. Rail on the RIGHT only (openSide=-1
    // = left), so the right keeps you on (solid wall added in GameCanvas) and you can drop off the left.
    const bridge = new THREE.Mesh(makeBridgeGeometry(gapLen + 10, hw * 2 + 8, -1), makeBridgeMaterial());
    bridge.position.set(midX, 0, midZ);
    bridge.rotation.y = yaw;
    bridge.traverse((o) => { const mm = o as THREE.Mesh; if (mm.isMesh) { mm.castShadow = true; mm.receiveShadow = true; } });
    group.add(bridge);
  }

  // ============ ARCHED BRIDGE (humpback — kart Y follows the arch, see GameCanvas) ============
  if (track.archBridgeZone) {
    const az = track.archBridgeZone;
    const a = track.pointAtProgress(az.startProgress);
    const b = track.pointAtProgress(az.endProgress);
    let tx = b.x - a.x;
    let tz = b.z - a.z;
    const gapLen = Math.hypot(tx, tz) || 1;
    tx /= gapLen;
    tz /= gapLen;
    const midX = (a.x + b.x) / 2;
    const midZ = (a.z + b.z) / 2;
    const yaw = Math.atan2(tx, tz);
    const hw = track.halfWidth;

    const waterSide = Math.hypot(gapLen, hw * 1.7 * 2) + 30;
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(waterSide, waterSide),
      new THREE.MeshStandardMaterial({ color: 0x2f8fd0, roughness: 0.22, metalness: 0.15 }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(midX, -15, midZ);
    water.receiveShadow = true;
    group.add(water);

    // Deck length == the gap (NOT gapLen+10): the +10 made the deck arch rise faster than the
    // kart's progress-based Y-pin, so the surface sat above the wheels and the kart sank in.
    const bridge = new THREE.Mesh(makeArchedBridgeGeometry(gapLen, hw * 2 + 8), makeBridgeMaterial());
    bridge.position.set(midX, 0, midZ);
    bridge.rotation.y = yaw;
    bridge.traverse((o) => { const mm = o as THREE.Mesh; if (mm.isMesh) { mm.castShadow = true; mm.receiveShadow = true; } });
    group.add(bridge);
  }

  // ============ OPTIONAL UPPER DECK (raised speed line on one side of a stretch) ============
  if (track.upperDeckZone) {
    const ud = track.upperDeckZone;
    const hw = track.halfWidth;
    const profile = (p: number) => {
      if (p <= ud.startProgress || p >= ud.endProgress) return 0;
      if (p < ud.rampUpEnd) return ud.height * (p - ud.startProgress) / (ud.rampUpEnd - ud.startProgress);
      if (p > ud.rampDownStart) return ud.height * (ud.endProgress - p) / (ud.endProgress - ud.rampDownStart);
      return ud.height;
    };
    const N = 48;
    const samples: DeckSample[] = [];
    for (let s = 0; s <= N; s++) {
      const p = ud.startProgress + (s / N) * (ud.endProgress - ud.startProgress);
      const a = track.pointAtProgress(p);
      const b = track.pointAtProgress(Math.min(1, p + 0.002));
      let tx = b.x - a.x, tz = b.z - a.z;
      const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      samples.push({ x: a.x, z: a.z, nx: tz, nz: -tx, y: profile(p), boost: p >= ud.boostStart && p <= ud.boostEnd });
    }
    const deck = new THREE.Mesh(makeUpperDeckGeometry(samples, UPPER_DECK_INNER, hw, ud.side), makeBridgeMaterial());
    deck.traverse((o) => { const mm = o as THREE.Mesh; if (mm.isMesh) { mm.castShadow = true; mm.receiveShadow = true; } });
    group.add(deck);
  }

  return struct;
}
