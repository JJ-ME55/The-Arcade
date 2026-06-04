// @ts-nocheck
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TrackPath } from '../logic/trackPath';
import { BARRIER_OFFSET } from '../logic/barrier';
import { TUNNEL_PROGRESS } from './trackStructures';
import { makeTreeGeometry, makeTreeMaterial } from './proceduralTree';
import { makeRockGeometry, makeHillGeometry, makeWindmillGeometry, makeWaterfallGeometry, propMaterial } from './proceduralProps';
import type { Obstacle } from '../logic/collision';

const M = '/critter-kart/models/Track structures - Sunny meadow/';

export interface TrackDressing {
  group: THREE.Group;
  /** Solid scenery footprints the karts collide against. Filled in as models load async,
   *  so callers should hold the reference and read it each frame (it grows over ~1s). */
  obstacles: Obstacle[];
  /** Call each frame with the player's position to distance-cull instanced props (only the
   *  copies near the kart are drawn). Safe to call before models finish loading. */
  updateCulling: (px: number, pz: number) => void;
}

interface Frame {
  x: number;
  z: number;
  tx: number;
  tz: number;
}

function frameAt(track: TrackPath, p: number): Frame {
  const a = track.pointAtProgress(p);
  const b = track.pointAtProgress(p + 0.004);
  let tx = b.x - a.x;
  let tz = b.z - a.z;
  const l = Math.hypot(tx, tz) || 1;
  return { x: a.x, z: a.z, tx: tx / l, tz: tz / l };
}

// rotation.y that aligns a model's local +X with the path tangent
const tangentYaw = (f: Frame) => Math.atan2(-f.tz, f.tx);

/**
 * Dresses the track entirely in the Sunny-Meadow Meshy art set: a wooden barrier fence
 * down both edges, scattered trees/rocks/bushes/hay/logs, mid-ground embankments, a
 * waterfall or two, a start/finish archway over the line, and a ring of background hills
 * around the whole horizon. Loads async and clones each model along the spline. The kart
 * collision still uses the invisible barrier list in barrier.ts — this is purely visual.
 *
 * All *_TARGET sizes and spacings are eyeball values; tune freely.
 */
export function createTrackDressing(track: TrackPath, loader: GLTFLoader): TrackDressing {
  const group = new THREE.Group();
  const obstacles: Obstacle[] = [];
  const hw = track.halfWidth;
  const total = track.totalLength;
  // Distance-culled instanced prop types: each frame only the copies near the player are
  // drawn, so the world stays full of props but the GPU renders a fraction of the triangles.
  type Cullable = { positions: { x: number; z: number }[]; batches: { inst: THREE.InstancedMesh; mats: THREE.Matrix4[] }[] };
  const cullables: Cullable[] = [];

  // Place a model CENTRED on (x,z) with its base on the ground (Meshy/Kenney models aren't
  // centred on their pivots). Also flags shadows.
  const place = (m: THREE.Object3D, scale: number, x: number, z: number, yaw: number) => {
    m.scale.setScalar(scale);
    m.rotation.y = yaw;
    m.position.set(x, 0, z);
    m.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(m);
    const c = box.getCenter(new THREE.Vector3());
    m.position.x += x - c.x;
    m.position.z += z - c.z;
    m.position.y -= box.min.y;
    // Props RECEIVE shadows but do NOT cast — casting from hundreds of props would re-render
    // the whole scene into the shadow map every frame (the main perf cost). Only karts cast.
    m.traverse((o) => { const mm = o as THREE.Mesh; if (mm.isMesh) mm.receiveShadow = true; });
    group.add(m);
    return m;
  };

  // One-off decorations that are LOCAL to a spot (not background) — toggled visible by
  // distance in updateCulling so they don't render across the whole map.
  const localProps: { obj: THREE.Object3D; x: number; z: number }[] = [];

  // Collapse MANY copies of one model into GPU-instanced draw calls (one per submesh) instead
  // of N separate cloned meshes — this is the big smoothness win (draw calls, not triangles,
  // are what choke the browser). Scales the model to `target`, centres + grounds its geometry
  // once, then writes one matrix per {x,z,yaw}. receiveShadow only (props never cast).
  const _v = new THREE.Vector3();
  const _q = new THREE.Quaternion();
  const _w = new THREE.Matrix4();
  const _one = new THREE.Vector3(1, 1, 1);
  const _scale = new THREE.Vector3(1, 1, 1);
  const UP = new THREE.Vector3(0, 1, 0);
  const instanceModel = (gltf: GLTF, target: number, placements: { x: number; z: number; yaw: number }[]) => {
    if (!placements.length) return;
    const root = gltf.scene;
    root.updateMatrixWorld(true);
    const size = new THREE.Vector3();
    new THREE.Box3().setFromObject(root).getSize(size);
    const s = target / (Math.max(size.x, size.y, size.z) || 1);
    root.scale.setScalar(s);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const c = box.getCenter(new THREE.Vector3());
    root.position.set(-c.x, -box.min.y, -c.z); // centre on origin, base on ground
    root.updateMatrixWorld(true);
    const type: Cullable = { positions: placements.map((p) => ({ x: p.x, z: p.z })), batches: [] };
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const L = mesh.matrixWorld.clone(); // submesh's model-space matrix (scaled/centred/grounded)
      const inst = new THREE.InstancedMesh(mesh.geometry, mesh.material, placements.length);
      inst.castShadow = false;
      inst.receiveShadow = true;
      inst.frustumCulled = false; // we manage which instances draw via per-frame count
      inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      // Pre-bake every instance's world matrix; updateCulling picks the visible subset each frame.
      const mats = placements.map((p) => {
        _q.setFromAxisAngle(UP, p.yaw);
        _w.compose(_v.set(p.x, 0, p.z), _q, _one);
        return new THREE.Matrix4().multiplyMatrices(_w, L);
      });
      inst.count = 0; // filled by the first updateCulling
      group.add(inst);
      type.batches.push({ inst, mats });
    });
    cullables.push(type);
  };

  // Each frame: draw only prop instances within RANGE of the player. RANGE comfortably
  // exceeds how far the chase camera sees, so culling is invisible (props are already fogged
  // by then), but it slashes rendered triangles to just the slice of track around the kart.
  const CULL_RANGE2 = 330 * 330; // tighter = far fewer props drawn at once (camera can't see past it anyway)
  const vis: number[] = []; // scratch, reused each call to avoid per-frame allocation/GC
  const updateCulling = (px: number, pz: number) => {
    for (const type of cullables) {
      vis.length = 0;
      const pos = type.positions;
      for (let i = 0; i < pos.length; i++) {
        const dx = pos[i].x - px, dz = pos[i].z - pz;
        if (dx * dx + dz * dz < CULL_RANGE2) vis.push(i);
      }
      for (const b of type.batches) {
        for (let k = 0; k < vis.length; k++) b.inst.setMatrixAt(k, b.mats[vis[k]]);
        b.inst.count = vis.length;
        b.inst.instanceMatrix.needsUpdate = true;
      }
    }
    for (const lp of localProps) {
      const dx = lp.x - px, dz = lp.z - pz;
      lp.obj.visible = dx * dx + dz * dz < 620 * 620;
    }
  };

  const overJump = (p: number) =>
    !!track.jumpZone && p > track.jumpZone.startProgress - 0.04 && p < track.jumpZone.endProgress + 0.04;

  // True if (x,z) sits clear of the road by `clearR` — i.e. far enough from the NEAREST
  // point on the whole track that the prop won't intrude on the racing surface. Catches the
  // case where an offset on the inside of a curve wraps back over the road (same idea as the
  // barrier keep-distance check).
  const clearOfRoad = (x: number, z: number, clearR: number) => track.nearest(x, z).distance >= hw + clearR;

  // Scatter a model along the track on alternating sides, at a fixed world-distance step,
  // offset `off` beyond the track centre, skipping the lake/ramp jump zone AND any spot where
  // it would poke onto the road. If `collideR` is given, register a footprint circle so karts
  // bump it. `clearR` is the road-clearance margin (defaults to ~half the prop size).
  // The first/last stretch of the lap (around the start line) is where the worst opening-frames
  // hitch happens — lots of heavy props decoding/uploading at once. Keep that strip light
  // (only trees + bushes go there); heavy Meshy props pass `avoidStart` to skip it.
  const nearStart = (p: number) => p < 0.1 || p > 0.9;
  type ScatterOpts = { jitterYaw?: boolean; collideR?: number; clearR?: number; avoidStart?: boolean };
  type Placement = { x: number; z: number; yaw: number; s: number };
  const gather = (off: number, step: number, start: number, target: number, opts: ScatterOpts): Placement[] => {
    const clearR = opts.clearR ?? target * 0.5;
    const pls: Placement[] = [];
    let side = 1;
    for (let d = start; d < total; d += step) {
      const p = d / total;
      if (overJump(p)) { side = -side; continue; }
      if (opts.avoidStart && nearStart(p)) { side = -side; continue; } // keep the start strip light
      const f = frameAt(track, p);
      const x = f.x + f.tz * off * side;
      const z = f.z - f.tx * off * side;
      if (!clearOfRoad(x, z, clearR)) { side = -side; continue; } // would intrude on the road → skip
      pls.push({ x, z, yaw: tangentYaw(f) + (opts.jitterYaw ? d : 0), s: 0.85 + (d % 5) * 0.07 });
      if (opts.collideR) obstacles.push({ x, z, r: opts.collideR });
      side = -side;
    }
    return pls;
  };
  // Meshy-GLB scatter (loads + instances the model).
  const scatter = (file: string, target: number, off: number, step: number, start: number, opts: ScatterOpts = {}) => {
    const pls = gather(off, step, start, target, opts);
    loader.loadAsync(M + file).then((g) => instanceModel(g, target, pls));
  };

  // --- procedural-prop helpers (rocks/hills/windmill/waterfall — our own low-poly meshes) ---
  const procMat = propMaterial();
  // Instance a procedural geometry across placements, scaled so its xz footprint ≈ target.
  const instanceProc = (geo: THREE.BufferGeometry, target: number, pls: Placement[]) => {
    if (!pls.length) return;
    geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    const natural = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) || 1;
    const baseS = target / natural;
    const inst = new THREE.InstancedMesh(geo, procMat, pls.length);
    inst.castShadow = false;
    inst.receiveShadow = true;
    inst.frustumCulled = false;
    pls.forEach((p, i) => {
      const s = baseS * p.s;
      _q.setFromAxisAngle(UP, p.yaw);
      _w.compose(_v.set(p.x, 0, p.z), _q, _scale.set(s, s, s));
      inst.setMatrixAt(i, _w);
    });
    inst.instanceMatrix.needsUpdate = true;
    group.add(inst);
  };
  const scatterProc = (geo: THREE.BufferGeometry, target: number, off: number, step: number, start: number, opts: ScatterOpts = {}) => {
    instanceProc(geo, target, gather(off, step, start, target, opts));
  };
  // Place a single procedural mesh, scaled so its longest dimension ≈ target, base on ground.
  const placeProc = (geo: THREE.BufferGeometry, target: number, x: number, z: number, yaw: number): THREE.Object3D => {
    geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    const max = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z) || 1;
    const m = new THREE.Mesh(geo, procMat);
    m.scale.setScalar(target / max);
    m.rotation.y = yaw;
    m.position.set(x, 0, z);
    m.receiveShadow = true;
    group.add(m);
    return m;
  };
  // Build the reused procedural geometries once.
  const rockGeo = makeRockGeometry();
  const hillGeo = makeHillGeometry();

  // --- trackside scenery, Mario-Kart style: FEW, LARGE, deliberate landmark props with open
  //     grass between them (not dense uniform scatter). Bigger spacing = fewer copies = fewer
  //     triangles; the road-clearance guard scales with size so the bigger they are, the
  //     further off the track they're forced to sit. ---
  // Trees: our own ~350-tri low-poly tree (not the 245k Meshy one), so we can place plenty
  // for cheap. One instanced draw call, no culling needed. Varied yaw + scale so they don't
  // look stamped. Trunk gets a small collision footprint.
  {
    const treeGeo = makeTreeGeometry();
    const treeMat = makeTreeMaterial();
    const placements: { x: number; z: number; yaw: number; s: number }[] = [];
    let side = 1;
    for (let d = 40; d < total; d += 90) {
      const p = d / total;
      if (overJump(p)) { side = -side; continue; }
      const f = frameAt(track, p);
      const x = f.x + f.tz * (BARRIER_OFFSET + 24) * side;
      const z = f.z - f.tx * (BARRIER_OFFSET + 24) * side;
      if (!clearOfRoad(x, z, 14)) { side = -side; continue; }
      placements.push({ x, z, yaw: d * 1.7, s: 0.8 + (d % 5) * 0.1 });
      obstacles.push({ x, z, r: 3.5 });
      side = -side;
    }
    const inst = new THREE.InstancedMesh(treeGeo, treeMat, placements.length);
    inst.castShadow = false;
    inst.receiveShadow = true;
    inst.frustumCulled = false;
    placements.forEach((p, i) => {
      _q.setFromAxisAngle(UP, p.yaw);
      _w.compose(_v.set(p.x, 0, p.z), _q, _scale.set(p.s, p.s, p.s));
      inst.setMatrixAt(i, _w);
    });
    inst.instanceMatrix.needsUpdate = true;
    group.add(inst);
  }
  scatterProc(hillGeo, 105, BARRIER_OFFSET + 95, 760, 160, { avoidStart: true });        // few colossal hills, set well back (procedural)
  scatterProc(rockGeo, 18, BARRIER_OFFSET + 12, 360, 95, { jitterYaw: true, collideR: 8, avoidStart: true }); // procedural rock clusters
  scatter('Stacked hay bales.glb', 9, BARRIER_OFFSET + 7, 400, 70, { collideR: 4.5, avoidStart: true });
  scatter('Hollow log mushroom.glb', 13, BARRIER_OFFSET + 16, 480, 130, { jitterYaw: true, collideR: 6, avoidStart: true }); // no '+' in the filename: Vercel decodes it to a space → 404
  scatter('Flowering bush trio.glb', 9, BARRIER_OFFSET + 6, 150, 20, { jitterYaw: true, collideR: 3.5 }); // light — fine near start

  // --- frame the drive-through tunnel with hills + rocks so it reads as cut through a
  //     hillside, not a lone arch in a field. Pushed well out and road-clearance-guarded so
  //     they never sit on the track (the tunnel model itself supplies the hill over the road). ---
  for (const side of [1, -1]) {
    for (const dp of [-0.02, 0.02]) { // one hill just before and after the mouth, each side
      const f = frameAt(track, TUNNEL_PROGRESS + dp);
      const off = BARRIER_OFFSET + 55; // well clear of the road
      const x = f.x + f.tz * off * side;
      const z = f.z - f.tx * off * side;
      if (!clearOfRoad(x, z, 28)) continue;
      localProps.push({ obj: placeProc(hillGeo, 48, x, z, tangentYaw(f)), x, z });
    }
  }
  for (const side of [1, -1]) {
    const f = frameAt(track, TUNNEL_PROGRESS);
    const off = BARRIER_OFFSET + 8;
    const x = f.x + f.tz * off * side;
    const z = f.z - f.tx * off * side;
    if (!clearOfRoad(x, z, 7)) continue; // skip (no road-blocking rock, no mid-road collision)
    localProps.push({ obj: placeProc(rockGeo, 12, x, z, tangentYaw(f) + side), x, z });
    obstacles.push({ x, z, r: 5 });
  }

  // --- wooden barrier fence: both edges, GPU-instanced into a couple of draw calls for the
  //     whole run (collision is handled separately by barrier.ts; this is the visible edge) ---
  {
    const placements: { x: number; z: number; yaw: number }[] = [];
    for (const side of [1, -1]) {
      for (let d = 0; d < total; d += 24) {
        const p = d / total;
        if (overJump(p)) continue;
        const f = frameAt(track, p);
        const x = f.x + f.tz * BARRIER_OFFSET * side;
        const z = f.z - f.tx * BARRIER_OFFSET * side;
        if (!clearOfRoad(x, z, 2)) continue; // skip any that wrap onto the road on tight corners
        placements.push({ x, z, yaw: tangentYaw(f) });
      }
    }
    loader.loadAsync(M + 'Racing barrier.glb').then((g) => instanceModel(g, 7, placements));
  }

  // --- waterfall backdrops: a couple, well off the track (procedural) ---
  {
    const wfGeo = makeWaterfallGeometry();
    for (const [prog, side] of [[0.28, 1], [0.68, -1]] as const) {
      const f = frameAt(track, prog);
      const off = BARRIER_OFFSET + 80;
      const x = f.x + f.tz * off * side, z = f.z - f.tx * off * side;
      localProps.push({ obj: placeProc(wfGeo, 34, x, z, tangentYaw(f) + Math.PI / 2), x, z });
    }
  }

  // --- start/finish archway straddling the line (scaled by WIDTH so the opening clears the road) ---
  loader.loadAsync(M + 'Start - finish banner archway.glb').then((g) => {
    const f = frameAt(track, 0);
    const m = g.scene;
    m.updateMatrixWorld(true);
    const size = new THREE.Vector3();
    new THREE.Box3().setFromObject(m).getSize(size);
    const targetWidth = 2 * hw + 18; // posts clear the road on both sides
    localProps.push({ obj: place(m, targetWidth / (size.x || 1), f.x, f.z, tangentYaw(f) + Math.PI / 2), x: f.x, z: f.z });
  });

  // --- single enclosing "basin": a huge ring of hills with a flat centre that the whole
  //     track sits inside. ONE draw call instead of many hill clones (the perf fix). Centred
  //     on the track, scaled to enclose it, and sunk so our grass + dirt road cover the flat
  //     middle while only the hill rim shows as the horizon. SINK / radius tune by eye. ---
  loader.loadAsync(M + 'Sunny meadow base.glb').then((g) => {
    const pts = track.points;
    let cx = 0, cz = 0;
    for (const p of pts) { cx += p.x; cz += p.z; }
    cx /= pts.length; cz /= pts.length;
    let maxR = 0;
    for (const p of pts) maxR = Math.max(maxR, Math.hypot(p.x - cx, p.z - cz));

    const m = g.scene;
    m.updateMatrixWorld(true);
    const size = new THREE.Vector3();
    new THREE.Box3().setFromObject(m).getSize(size);
    // The model is flat from the centre out to ~55% of its radius, then the hills rise and
    // peak at ~85% (measured from the geometry). Size it so the rise (0.55·radius) begins
    // right at our grass-disc edge (maxR + 140) — hills nest compactly just past the props.
    const FLAT_FRAC = 0.55;
    const radius = (maxR + 140) / FLAT_FRAC;
    const scale = (radius * 2) / (Math.max(size.x, size.z) || 1);
    m.scale.set(scale, scale * 0.6, scale); // squash height a touch so hills aren't too steep
    m.position.set(0, 0, 0);
    m.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(m);
    const c = box.getCenter(new THREE.Vector3());
    m.position.x += cx - c.x;
    m.position.z += cz - c.z;
    // Pin the flat floor to just under our grass (-6) so the bowl's centre tucks below the
    // play area and the hills rise from the grass edge upward — open sky above the ridge.
    const FLOOR_Y = -6;
    const floorLocal = box.min.y + 0.21 * (box.max.y - box.min.y); // floor sits at ~0.21 of the height range
    m.position.y += FLOOR_Y - floorLocal;
    m.traverse((o) => { const mm = o as THREE.Mesh; if (mm.isMesh) mm.receiveShadow = true; });
    group.add(m);
  });

  // --- windmill: a tall landmark on the horizon, just inside the hill ring (procedural) ---
  {
    const pts = track.points;
    let cx = 0, cz = 0;
    for (const p of pts) { cx += p.x; cz += p.z; }
    cx /= pts.length; cz /= pts.length;
    let maxR = 0;
    for (const p of pts) maxR = Math.max(maxR, Math.hypot(p.x - cx, p.z - cz));
    const radius = (maxR + 140) / 0.55; // same basin sizing
    const a = Math.PI * 0.28; // sits off to one side of the skyline
    const r = radius * 0.5; // at the far edge of the flat meadow, hills rising behind it
    const x = cx + Math.cos(a) * r;
    const z = cz + Math.sin(a) * r;
    localProps.push({ obj: placeProc(makeWindmillGeometry(), 70, x, z, Math.atan2(cx - x, cz - z)), x, z });
  }

  return { group, obstacles, updateCulling };
}
