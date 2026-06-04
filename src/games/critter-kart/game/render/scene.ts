// @ts-nocheck
import * as THREE from 'three';
import { pixTex } from './textures';
import { TrackPath } from '../logic/trackPath';
import { createRoadMesh, createStartLine, RoadMesh } from './trackRender';

const SKY = 0x87b7e8;

/** Master toggle for the "premium" render pass (tone mapping, IBL, PBR ground, shadows,
 *  gradient sky, golden-hour sun). Flip to `false` for an instant A/B against the old
 *  flat look. Read by both createScene (here) and GameCanvas (renderer + per-frame sun). */
export const PREMIUM_RENDER = true;

/** Ground/road surfaces were MeshBasic (unlit) — they ignored all lighting, which is the
 *  main thing dragging the look down. In premium mode use a PBR material so the sun, sky
 *  and environment actually shade them; otherwise keep the original flat material. */
function surfaceMaterial(map: THREE.Texture): THREE.Material {
  if (PREMIUM_RENDER) {
    map.colorSpace = THREE.SRGBColorSpace; // so albedo reads correctly under ACES tone mapping
    return new THREE.MeshStandardMaterial({ map, roughness: 0.97, metalness: 0 });
  }
  return new THREE.MeshBasicMaterial({ map });
}

/** A soft vertical gradient sky (light blue up high → warm pale haze at the horizon),
 *  used as the scene background in premium mode instead of a single flat colour. */
function gradientSky(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#5fa8e8'); // zenith
  grad.addColorStop(0.55, '#9fc9f2');
  grad.addColorStop(1, '#e9f0ec'); // warm pale horizon (blends into fog)
  g.fillStyle = grad;
  g.fillRect(0, 0, 2, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** World Y of the lake's water surface. Matched to the road's drive height (0) so
 *  the Stone Lake GLB's top sits flush with the road instead of sinking below it.
 *  Kart's splash trigger fires when state.y crosses this from above. */
export const WATER_Y = 0;

/** Tile size (world units) for the grass texture. */
const GRASS_TILE = 48;

/** Build the grass ground as a CIRCULAR disc centred on the track, radius `radius`. A disc
 *  (not a square) so the background hill basin can nest in close around it without the
 *  square's corners poking up through the hills. If the track has a jumpZone, a hole is cut
 *  for the lake (which sits at y = WATER_Y, below the grass) to show through. */
function buildGround(track: TrackPath, grassTex: THREE.Texture, cx: number, cz: number, radius: number): THREE.Mesh {
  // Shape is built in XY; after rotation.x = -PI/2 → XY maps to (X, -Z). So shape Y = -world Z.
  const SEG = 96;
  const shape = new THREE.Shape();
  for (let i = 0; i <= SEG; i++) {
    const a = (i / SEG) * Math.PI * 2;
    const sx = cx + Math.cos(a) * radius;
    const sy = -cz + Math.sin(a) * radius;
    i === 0 ? shape.moveTo(sx, sy) : shape.lineTo(sx, sy);
  }

  // Cut a rotated-rectangle hole in the grass over a progress range so the water below shows
  // through (shape coords: x = worldX, y = -worldZ). Used for the jump-zone lake AND the
  // bridge-zone water. widthMult scales how far the water spreads either side of the road.
  const cutHole = (zone: { startProgress: number; endProgress: number }, widthMult: number) => {
    const start = track.pointAtProgress(zone.startProgress);
    const end = track.pointAtProgress(zone.endProgress);
    let tx = end.x - start.x;
    let tz = end.z - start.z;
    const gapLen = Math.hypot(tx, tz) || 1;
    tx /= gapLen;
    tz /= gapLen;
    const px = tz;
    const pz = -tx;
    const midX = (start.x + end.x) / 2;
    const midZ = (start.z + end.z) / 2;
    const halfLen = gapLen / 2;
    const halfW = track.halfWidth * widthMult;
    const corners: [number, number][] = [
      [midX + tx * halfLen + px * halfW, midZ + tz * halfLen + pz * halfW],
      [midX + tx * halfLen - px * halfW, midZ + tz * halfLen - pz * halfW],
      [midX - tx * halfLen - px * halfW, midZ - tz * halfLen - pz * halfW],
      [midX - tx * halfLen + px * halfW, midZ - tz * halfLen + pz * halfW],
    ];
    const hole = new THREE.Path();
    hole.moveTo(corners[0][0], -corners[0][1]);
    for (let i = 1; i < corners.length; i++) hole.lineTo(corners[i][0], -corners[i][1]);
    hole.lineTo(corners[0][0], -corners[0][1]);
    shape.holes.push(hole);
  };
  if (track.jumpZone) cutHole(track.jumpZone, 3);
  if (track.bridgeZone) cutHole(track.bridgeZone, 1.7); // matches the bridge width (water shows a bit beyond the rails)
  if (track.archBridgeZone) cutHole(track.archBridgeZone, 1.7);

  const geo = new THREE.ShapeGeometry(shape);
  // World-position-based UVs so the grass tiles at a fixed world scale (shape x = worldX,
  // shape y = -worldZ — sign irrelevant for a symmetric tiling texture).
  const pos = geo.getAttribute('position');
  const uvs = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uvs[i * 2] = pos.getX(i) / GRASS_TILE;
    uvs[i * 2 + 1] = pos.getY(i) / GRASS_TILE;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  const mesh = new THREE.Mesh(geo, surfaceMaterial(grassTex));
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = PREMIUM_RENDER;
  return mesh;
}

/**
 * Builds the world for a given track: a grass plane (with a hole at the lake), the
 * curved road ribbon, and a start/finish line, with horizon fog for the mode-7
 * distance feel. The lake mesh itself (Stone Lake GLB) is added by createTrackStructures
 * — the hole here is what makes it visible from above.
 */
export function createScene(track: TrackPath): { scene: THREE.Scene; road: RoadMesh; sun: THREE.DirectionalLight } {
  const scene = new THREE.Scene();
  // View distance scales with the track so the enclosing background basin's hill rim stays
  // visible instead of being fogged away (the basin is centred on the track, ~2.4× its radius).
  let _cx = 0, _cz = 0;
  for (const p of track.points) { _cx += p.x; _cz += p.z; }
  _cx /= track.points.length; _cz /= track.points.length;
  let _maxR = 0;
  for (const p of track.points) _maxR = Math.max(_maxR, Math.hypot(p.x - _cx, p.z - _cz));
  // Ground disc radius: just beyond the farthest props. The background basin's hill rim
  // begins right at this edge (see dressing.ts) and peaks at ~0.85·basinRadius, so fog must
  // reach a bit past that peak to keep the ridge visible without fogging it away.
  const groundR = _maxR + 140;
  const basinRimPeak = (groundR / 0.55) * 0.85; // matches the basin sizing in dressing.ts
  scene.fog = new THREE.Fog(SKY, 200, basinRimPeak + _maxR + 140);

  let sun: THREE.DirectionalLight;
  if (PREMIUM_RENDER) {
    scene.background = gradientSky();
    // Hemisphere fill: warm sky tint from above, grass-green bounce from below — gives the
    // whole scene natural ambient colour the flat AmbientLight couldn't. The scene.environment
    // IBL map (set in GameCanvas) does the soft reflections on the PBR karts/props on top.
    scene.add(new THREE.HemisphereLight(0xbfdcff, 0x6f8f4a, 0.85));
    // Golden-hour key light, low and warm, casting soft shadows. Positioned each frame to
    // follow the player (see GameCanvas) so the shadow map stays crisp over the action.
    sun = new THREE.DirectionalLight(0xfff1d6, 2.4);
    sun.position.set(60, 90, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); // 1k is plenty for the small player-following frustum, and cheaper
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.6;
    const cam = sun.shadow.camera;
    cam.near = 1;
    cam.far = 400;
    cam.left = cam.bottom = -140;
    cam.right = cam.top = 140;
    cam.updateProjectionMatrix();
    scene.add(sun);
    scene.add(sun.target); // target is moved to the player each frame
  } else {
    scene.background = new THREE.Color(SKY);
    scene.add(new THREE.AmbientLight(0xffffff, 0.95));
    sun = new THREE.DirectionalLight(0xffffff, 0.5);
    sun.position.set(40, 80, 20);
    scene.add(sun);
  }

  // grass (tiling) — speckled with tufts + the odd flower for the meadow look
  const grassTex = pixTex(128, 128, (g, w, h) => {
    g.fillStyle = '#5fae46';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = ['#57a23f', '#67b84e', '#54993c', '#6cc154'][i % 4];
      g.fillRect((Math.random() * w) | 0, (Math.random() * h) | 0, 2, 2);
    }
    for (let i = 0; i < 28; i++) {
      const x = (Math.random() * w) | 0;
      const y = (Math.random() * h) | 0;
      g.fillStyle = ['#f2d04a', '#ef6f9a', '#ffffff'][i % 3]; // flower petals
      g.fillRect(x, y, 2, 2);
      g.fillStyle = '#f7e58a';
      g.fillRect(x, y - 2, 1, 1);
    }
  });
  grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
  // Circular grass disc centred on the track, ending just past the props where the hills
  // begin (UVs in buildGround already tile at a fixed world scale, so no repeat needed).
  scene.add(buildGround(track, grassTex, _cx, _cz, groundR));

  const road = createRoadMesh(track);
  scene.add(road.mesh);
  scene.add(createStartLine(track));

  return { scene, road, sun };
}
