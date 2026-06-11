/* pool-scene.js — clean GLB-based 8-ball table.
   Loads assets/pool_table_traditional.glb, strips props (lamp, cues),
   re-racks the model's own numbered balls for 8-ball, and exposes
   window.pool = { setFelt(hex), setWood(name), setCamera(name) }.
   Felt/wood recoloring re-hues the baked base-color texture per region,
   preserving all baked shading, normal + roughness maps. */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const FELT_GREEN = '#2F7D46'; // sentinel: "classic green" = original baked cloth

// —— renderer / scene / camera ——
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.98;   // JJ 2026-06: "it's all a little light" — deepen the whole image
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0a0c12');

const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 300);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.495;
controls.minDistance = 3;
controls.maxDistance = 40;

// —— lighting: bright, clean studio ——
scene.add(new THREE.HemisphereLight(0x8d9cb8, 0x1e2026, 0.9));
scene.add(new THREE.AmbientLight(0x404550, 0.5));

const key = new THREE.SpotLight(0xfff3dd, 300, 60, 0.85, 0.45, 1.1);
key.position.set(-1, 14, 1);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.near = 4; key.shadow.camera.far = 30;
key.shadow.bias = -0.0003;
scene.add(key); scene.add(key.target);

const even = new THREE.DirectionalLight(0xf2ead8, 0.7);
even.position.set(-4, 11, 3);
scene.add(even);
const rim = new THREE.DirectionalLight(0xbcd0ff, 0.35);
rim.position.set(9, 5, -7);
scene.add(rim);

// —— floor: simple soft-gradient disc ——
(function floor(){
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(256,256,40, 256,256,256);
  g.addColorStop(0, '#1a1d26'); g.addColorStop(0.55, '#12141c'); g.addColorStop(1, '#0a0c12');
  x.fillStyle = g; x.fillRect(0,0,512,512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.CircleGeometry(45, 48),
    new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }));
  m.rotation.x = -Math.PI/2; m.position.y = 0; m.receiveShadow = true;
  scene.add(m);
})();

// ===================================================================
//  LOAD MODEL
// ===================================================================
const loader = new GLTFLoader();
const state = { feltHex: FELT_GREEN, wood: 'Cherry' };
let tableMat = null, recolor = null;
let bbox = null, center = null, feltY = 0, longAxis = 'x';
let cueBallPos = new THREE.Vector3(), rackCenter = new THREE.Vector3();

// model ships duplicated coincident faces (baked double-sidedness) — they
// z-fight and sample mismatched texels (black/checker artifacts). Keep first copy.
function dedupeTriangles(geo){
  const pos = geo.attributes.position, idx = geo.index;
  if (!idx) return;
  const seen = new Set(), keep = [];
  const vkey = (i) => Math.round(pos.getX(i)*5000) + ',' + Math.round(pos.getY(i)*5000) + ',' + Math.round(pos.getZ(i)*5000);
  for (let t = 0; t < idx.count; t += 3){
    const ks = [vkey(idx.getX(t)), vkey(idx.getX(t+1)), vkey(idx.getX(t+2))].sort().join('|');
    if (seen.has(ks)) continue;
    seen.add(ks);
    keep.push(idx.getX(t), idx.getX(t+1), idx.getX(t+2));
  }
  if (keep.length < idx.count) geo.setIndex(keep);
}

loader.load('assets/pool_table_traditional.glb', (gltf) => {
  const root = gltf.scene;

  // strip props — table + balls only
  const HIDE = ['ceiling_light_low', 'pool_cue', 'pool_cue001'];
  root.traverse(o => { if (HIDE.includes(o.name)) o.visible = false; });

  // find table + balls
  let tableMesh = null; const ballMeshes = [];
  root.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    o.material.shadowSide = THREE.DoubleSide;   // model has flipped winding — fixes leg shadows bleeding onto the felt
    dedupeTriangles(o.geometry);
    if (o.name.startsWith('pooltable')) tableMesh = o;
    if (o.name.startsWith('billiard_ball')) ballMeshes.push(o);
  });
  tableMat = tableMesh.material;
  tableMat.side = THREE.DoubleSide;           // FBX negative-scale export culls top faces otherwise
  tableMat.roughness = Math.min(tableMat.roughness ?? 1, 0.9);
  if (tableMat.normalScale) tableMat.normalScale.multiplyScalar(0.45);   // soften baked grain bump
  stripNetFaces(tableMesh);                   // v4: no net pockets
  // Clean shadow: cast from solid geometry only. The visible mesh uses an
  // alpha cutout (alphaTest) for the net weave, and that cutout was
  // bleeding the net pattern into the shadow. A plain depth material (no
  // map/alphaTest) makes the table cast a solid silhouette instead.
  // JJ 2026-06: "the shadow still shows the net, block it out."
  tableMesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });

  // normalise: long side of the table = 11.2 units, base on y=0, centred
  root.updateMatrixWorld(true);
  const pre = new THREE.Box3().setFromObject(tableMesh);
  const size = pre.getSize(new THREE.Vector3());
  const longDim = Math.max(size.x, size.z);
  const s = 11.2 / longDim;
  root.scale.setScalar(s);
  root.updateMatrixWorld(true);
  const post = new THREE.Box3().setFromObject(tableMesh);
  const c0 = post.getCenter(new THREE.Vector3());
  root.position.x -= c0.x; root.position.z -= c0.z;
  root.position.y -= post.min.y;
  root.updateMatrixWorld(true);

  bbox = new THREE.Box3().setFromObject(tableMesh);
  center = bbox.getCenter(new THREE.Vector3());
  const dims = bbox.getSize(new THREE.Vector3());
  longAxis = dims.x >= dims.z ? 'x' : 'z';
  scene.add(root);

  key.target.position.copy(center); key.target.updateMatrixWorld();

  setupBalls(ballMeshes);
  setupRecolor();
  addPocketCups(tableMesh);
  applyColors();
  setCamera('Cinematic', true);

  window.dispatchEvent(new Event('pool-ready'));
}, undefined, (e) => {
  document.querySelector('.hint').textContent = 'MODEL LOAD ERROR: ' + (e.message || e);
});

// ===================================================================
//  BALLS — identify by UV atlas cell, re-rack for 8-ball
// ===================================================================
function ballNumber(mesh){
  // atlas: 3 cols × 6 rows; v=0 top. centroid → cell → number
  const uv = mesh.geometry.attributes.uv;
  let u = 0, v = 0;
  for (let i = 0; i < uv.count; i++){ u += uv.getX(i); v += uv.getY(i); }
  u /= uv.count; v /= uv.count;
  const col = Math.min(2, Math.floor(u * 3));
  const rowCenters = [0.08, 0.25, 0.42, 0.58, 0.75, 0.92];
  let row = 0, best = 1e9;
  rowCenters.forEach((rc, i) => { const d = Math.abs(v - rc); if (d < best){ best = d; row = i; } });
  const MAP = [[0,0,0],[13,14,15],[10,11,12],[7,8,9],[4,5,6],[1,2,3]];
  return MAP[row][col];
}

function setupBalls(ballMeshes){
  // world-space ball radius + felt height from where the balls already sit
  const bb = new THREE.Box3().setFromObject(ballMeshes[0]);
  const r = bb.getSize(new THREE.Vector3()).x / 2;
  feltY = bb.getCenter(new THREE.Vector3()).y;

  // play field: WPA proportions of the outer footprint (112×62 → 100×50)
  const dims = bbox.getSize(new THREE.Vector3());
  const L = (longAxis === 'x' ? dims.x : dims.z) * (100 / 112);
  const playLong = L;

  const along = (d) => longAxis === 'x' ? new THREE.Vector3(d, 0, 0) : new THREE.Vector3(0, 0, d);
  const across = (d) => longAxis === 'x' ? new THREE.Vector3(0, 0, d) : new THREE.Vector3(d, 0, 0);

  const footSpot = center.clone().add(along(playLong / 4)); footSpot.y = feltY;
  const headSpot = center.clone().add(along(-playLong / 4)); headSpot.y = feltY;
  rackCenter.copy(footSpot);
  cueBallPos.copy(headSpot);

  // 8-ball rack: 8 centre of row 3, solid+stripe rear corners
  const RACK = [[1],[9,2],[10,8,3],[11,4,12,5],[6,13,7,14,15]];
  const slot = {};
  const pitch = r * 2 * Math.cos(Math.PI / 6) * 1.004;
  RACK.forEach((row, ri) => row.forEach((num, j) => {
    slot[num] = footSpot.clone()
      .add(along(ri * pitch))
      .add(across((j - ri / 2) * r * 2 * 1.004));
  }));
  slot[0] = headSpot.clone();

  for (const m of ballMeshes){
    const num = ballNumber(m);
    const p = slot[num];
    if (!p) continue;
    scene.attach(m);                       // keep world transform, re-parent
    // mesh origin ≠ geometry centre: rotate first, then place by measured offset
    m.rotation.set(0, Math.random() * Math.PI * 2, 0);
    m.updateMatrixWorld(true);
    const gc = new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3());
    const off = gc.sub(m.position);
    m.position.set(p.x - off.x, feltY - off.y, p.z - off.z);
  }
}

// ===================================================================
//  RECOLOR — GPU shader re-hue; original texture (and its alpha-baked
//  nets + shadow decals) stays pristine. Color swaps are uniform writes.
// ===================================================================
// v4: clean satin wood — flat color treatment lifted from the stylised build.
// Always applied (Cherry included); kills baked grain noise, keeps form shading.
const WOODS = {
  Cherry: '#7A1A10',
  Oak:    '#9A6E40',
  Walnut: '#46291B',
  Black:  '#161310',
};

const GLSL_HSL = `
vec3 pp_rgb2hsl(vec3 c){
  float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));
  float l = (mx + mn) * 0.5, h = 0.0, s = 0.0, d = mx - mn;
  if (d > 0.0001){
    s = l > 0.5 ? d / (2.0 - mx - mn) : d / (mx + mn);
    if (mx == c.r) h = mod((c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0), 6.0) / 6.0;
    else if (mx == c.g) h = ((c.b - c.r) / d + 2.0) / 6.0;
    else h = ((c.r - c.g) / d + 4.0) / 6.0;
  }
  return vec3(h, s, l);
}
float pp_hue2rgb(float p, float q, float t){
  t = fract(t);
  if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
  if (t < 0.5) return q;
  if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
  return p;
}
vec3 pp_hsl2rgb(vec3 hsl){
  if (hsl.y < 0.001) return vec3(hsl.z);
  float q = hsl.z < 0.5 ? hsl.z * (1.0 + hsl.y) : hsl.z + hsl.y - hsl.z * hsl.y;
  float p = 2.0 * hsl.z - q;
  return vec3(pp_hue2rgb(p, q, hsl.x + 1.0/3.0), pp_hue2rgb(p, q, hsl.x), pp_hue2rgb(p, q, hsl.x - 1.0/3.0));
}
uniform float uFeltOn;
uniform vec3  uFeltHSL;
uniform float uWoodOn;
uniform vec3  uWoodHSL;
`;

const RECOLOR_BLOCK = `
{
  vec3 hsl = pp_rgb2hsl(diffuseColor.rgb);
  bool isFelt = hsl.y > 0.10 && hsl.x > 0.18 && hsl.x < 0.52;
  bool isIvory = hsl.y < 0.18 && hsl.z > 0.60;   // rail sights / chalk — keep
  if (uFeltOn > 0.5 && isFelt){
    float l = clamp(hsl.z * (uFeltHSL.z / 0.14), 0.0, 0.92);
    diffuseColor.rgb = pp_hsl2rgb(vec3(uFeltHSL.x, uFeltHSL.y, l));
  } else if (uWoodOn > 0.5 && !isFelt && !isIvory){
    // flat satin: compress baked grain to a whisper of tonal variance
    float l = clamp(uWoodHSL.z * (0.55 + 1.6 * hsl.z), 0.0, 0.85);
    diffuseColor.rgb = pp_hsl2rgb(vec3(uWoodHSL.x, uWoodHSL.y, l));
  }
}
`;

// v4: remove the woven net bags — every face whose texels live in the
// low-alpha weave region of the atlas gets dropped.
// v4: dark closed pocket throats — stripping the nets left see-through holes;
// drop a matte dark cup into each opening so it reads like a ball-return pocket
// (darkened, not hollow). Pocket centres found by raycasting the felt for gaps.
function addPocketCups(tableMesh){
  const ray = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  const top = bbox.max.y + 1;
  // cloth height at table centre
  ray.set(new THREE.Vector3(0, top, 0), down);
  let hit = ray.intersectObject(tableMesh, false);
  const clothY = hit.length ? hit[0].point.y : feltY - 0.16;

  const dims = bbox.getSize(new THREE.Vector3());
  const halfL = (longAxis === 'x' ? dims.x : dims.z) / 2;
  const halfS = (longAxis === 'x' ? dims.z : dims.x) / 2;
  const band = halfS * 2 * (6 / 62);
  const cL = halfL - band, cS = halfS - band;
  // candidate centres: 4 corners + 2 sides (in along/across coords)
  const cand = [
    [ cL,  cS], [ cL, -cS], [-cL,  cS], [-cL, -cS],
    [ 0,  cS + 0.06], [ 0, -(cS + 0.06)],
  ];
  const toWorld = (a, c) => longAxis === 'x'
    ? new THREE.Vector3(a, 0, c) : new THREE.Vector3(c, 0, a);

  // unlit dark gradient throat — darkens as it recedes, reads as a closed
  // ball-return pocket; immune to the overhead lamp so it never lights up gray
  const tcv = document.createElement('canvas'); tcv.width = 8; tcv.height = 256;
  {
    const x = tcv.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#241E18');   // rim (canvas top → cup top)
    g.addColorStop(0.35, '#0E0B09');
    g.addColorStop(1, '#050403');   // deep floor
    x.fillStyle = g; x.fillRect(0, 0, 8, 256);
  }
  const throatTex = new THREE.CanvasTexture(tcv);
  throatTex.colorSpace = THREE.SRGBColorSpace;
  const wallMat = new THREE.MeshBasicMaterial({ map: throatTex, side: THREE.DoubleSide });
  const floorMat = new THREE.MeshBasicMaterial({ color: '#050403' });

  for (const [a, c] of cand){
    // nudge toward true hole centre: search local minimum of felt surface height
    let best = null, bestY = Infinity;
    for (let da = -0.35; da <= 0.35; da += 0.175){
      for (let dc = -0.35; dc <= 0.35; dc += 0.175){
        const p = toWorld(a + da, c + dc);
        ray.set(new THREE.Vector3(p.x, top, p.z), down);
        const h = ray.intersectObject(tableMesh, false);
        const y = h.length ? h[0].point.y : -99;     // miss = open hole
        if (y < bestY){ bestY = y; best = p; }
      }
    }
    if (!best) best = toWorld(a, c);
    // only place where there's genuinely a gap (well below cloth)
    if (bestY > clothY - 0.12) continue;

    const isCorner = Math.abs(c) > 0.2 && Math.abs(a) > 0.2;
    const rTop = isCorner ? 0.44 : 0.40;
    const rBot = isCorner ? 0.32 : 0.28;
    const depth = 0.56;
    const rimY = clothY - 0.015;                 // just below cloth: hole frames the throat, no surface ring
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(rTop, rBot, depth, 32, 1, true), wallMat);
    cup.position.set(best.x, rimY - depth / 2, best.z);
    scene.add(cup);
    const bottom = new THREE.Mesh(new THREE.CircleGeometry(rBot, 32), floorMat);
    bottom.rotation.x = -Math.PI / 2;
    bottom.position.set(best.x, rimY - depth, best.z);   // covers the lit model shelf
    scene.add(bottom);

    // Shadow filler — stripping the net left a real HOLE in the table
    // geometry, so light leaked through each pocket and the floor shadow
    // had 6 gaps. This disc is invisible in the main render (no colour,
    // no depth write) but still castShadow, so it plugs the shadow gap
    // without covering the visible recessed pocket. JJ 2026-06: "the
    // shadow still has gaps — make the pockets opaque."
    const filler = new THREE.Mesh(
      new THREE.CircleGeometry(rTop * 1.05, 32),
      new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })
    );
    filler.rotation.x = -Math.PI / 2;
    filler.position.set(best.x, clothY - 0.02, best.z);
    filler.castShadow = true;
    scene.add(filler);
  }
}

function stripNetFaces(mesh){
  const img = mesh.material.map && mesh.material.map.image;
  if (!img) return;
  const cw = img.width, ch = img.height;
  const cnv = document.createElement('canvas'); cnv.width = cw; cnv.height = ch;
  const c2 = cnv.getContext('2d', { willReadFrequently: true });
  c2.drawImage(img, 0, 0);
  const px = c2.getImageData(0, 0, cw, ch).data;
  const g = mesh.geometry, uv = g.attributes.uv, idx = g.index;
  if (!idx || !uv) return;
  const alphaAt = (u, v) => {
    const sx = Math.min(cw-1, Math.max(0, Math.round(u * cw)));
    const sy = Math.min(ch-1, Math.max(0, Math.round(v * ch)));
    return px[(sy * cw + sx) * 4 + 3];
  };
  const keep = [];
  // the woven-net block of the atlas (u 0.73–0.87, v 0.53–0.95)
  const inNetBlock = (u, v) => u > 0.73 && u < 0.87 && v > 0.53 && v < 0.95;
  for (let t = 0; t < idx.count; t += 3){
    const a = idx.getX(t), b = idx.getX(t+1), c = idx.getX(t+2);
    let low = 0, blk = 0;
    if (alphaAt(uv.getX(a), uv.getY(a)) < 24) low++;
    if (alphaAt(uv.getX(b), uv.getY(b)) < 24) low++;
    if (alphaAt(uv.getX(c), uv.getY(c)) < 24) low++;
    if (alphaAt((uv.getX(a)+uv.getX(b)+uv.getX(c))/3, (uv.getY(a)+uv.getY(b)+uv.getY(c))/3) < 24) low++;
    if (inNetBlock(uv.getX(a), uv.getY(a))) blk++;
    if (inNetBlock(uv.getX(b), uv.getY(b))) blk++;
    if (inNetBlock(uv.getX(c), uv.getY(c))) blk++;
    if (low >= 3 || blk >= 2) continue;        // weave alpha OR net atlas block → drop
    keep.push(a, b, c);
  }
  if (keep.length < idx.count) g.setIndex(keep);
}

let shaderUniforms = null;
function setupRecolor(){
  // glTF ships alphaMode BLEND — self-sorting chaos on a 20k-tri mesh (phantom
  // walls, see-through felt). Render opaque with an alpha cutout for the net weave.
  tableMat.transparent = false;
  tableMat.alphaTest = 0.5;
  tableMat.depthWrite = true;
  tableMat.onBeforeCompile = (shader) => {
    shader.uniforms.uFeltOn  = { value: 0 };
    shader.uniforms.uFeltHSL = { value: new THREE.Vector3(0, 0, 0) };
    shader.uniforms.uWoodOn  = { value: 0 };
    shader.uniforms.uWoodHSL = { value: new THREE.Vector3(0, 0, 1) };
    shader.fragmentShader = GLSL_HSL + shader.fragmentShader.replace(
      '#include <map_fragment>',
      '#include <map_fragment>\n' + RECOLOR_BLOCK
    );
    shaderUniforms = shader.uniforms;
    applyColors();
  };
  tableMat.needsUpdate = true;

  recolor = (feltHex, woodName) => {
    if (!shaderUniforms) return;
    const feltOriginal = feltHex.toUpperCase() === FELT_GREEN;
    shaderUniforms.uFeltOn.value = feltOriginal ? 0 : 1;
    if (!feltOriginal){
      const c = new THREE.Color(feltHex).convertSRGBToLinear();
      const o = {}; c.getHSL(o);
      shaderUniforms.uFeltHSL.value.set(o.h, o.s, o.l);
    }
    const wood = WOODS[woodName] || WOODS.Cherry;
    shaderUniforms.uWoodOn.value = 1;                  // satin treatment always on
    {
      const c = new THREE.Color(wood).convertSRGBToLinear();
      const o = {}; c.getHSL(o);
      shaderUniforms.uWoodHSL.value.set(o.h, o.s, o.l);
    }
  };
}

function applyColors(){ if (recolor) recolor(state.feltHex, state.wood); }



// ===================================================================
//  CAMERA PRESETS
// ===================================================================
let camTween = null;
function flyTo(pos, target, instant){
  if (instant){ camera.position.copy(pos); controls.target.copy(target); controls.update(); return; }
  camTween = { t: 0, p0: camera.position.clone(), p1: pos, t0: controls.target.clone(), t1: target };
}
function setCamera(name, instant){
  if (!bbox) return;
  const dims = bbox.getSize(new THREE.Vector3());
  const h = bbox.max.y;
  const a = (d) => longAxis === 'x' ? new THREE.Vector3(d, 0, 0) : new THREE.Vector3(0, 0, d);
  const x = (d) => longAxis === 'x' ? new THREE.Vector3(0, 0, d) : new THREE.Vector3(d, 0, 0);
  const mid = center.clone(); mid.y = feltY || h;

  if (name === 'Overhead'){
    flyTo(mid.clone().add(new THREE.Vector3(0, 13.5, 0)).add(x(0.01)), mid, instant);
  } else if (name === 'Player'){
    const p = cueBallPos.clone().add(a(-3.4)); p.y = h + 1.35;
    const t = rackCenter.clone(); t.y = feltY;
    flyTo(p, t, instant);
  } else { // Cinematic
    const p = mid.clone().add(a(-7.6)).add(x(5.4)); p.y = h + 3.6;
    flyTo(p, mid, instant);
  }
}

// ===================================================================
//  PUBLIC API + LOOP
// ===================================================================
window.pool = {
  setFelt(hex){ state.feltHex = hex; applyColors(); },
  setWood(name){ state.wood = name; applyColors(); },
  setCamera(name){ setCamera(name, false); },
};
addEventListener('keydown', (e) => {
  if (e.key === '1') setCamera('Overhead');
  if (e.key === '2') setCamera('Player');
  if (e.key === '3') setCamera('Cinematic');
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

window.__dbg = { camera, controls, scene, THREE };
function renderOnce(){
  if (shaderUniforms) applyColors();   // reassert color uniforms — guards against
                                       // orphaned uniforms when the program recompiles
  controls.update(); renderer.render(scene, camera);
}
window.__render = renderOnce;
setInterval(renderOnce, 400);   // keeps frame fresh even when rAF is throttled (hidden iframe)
const clock = new THREE.Clock();
(function tick(){
  const dt = clock.getDelta();
  if (shaderUniforms) applyColors();   // cheap (4 uniform writes) — survives any recompile
  if (camTween){
    camTween.t = Math.min(1, camTween.t + dt / 0.9);
    const k = camTween.t < 0.5 ? 2*camTween.t*camTween.t : 1 - Math.pow(-2*camTween.t + 2, 2) / 2;
    camera.position.lerpVectors(camTween.p0, camTween.p1, k);
    controls.target.lerpVectors(camTween.t0, camTween.t1, k);
    if (camTween.t >= 1) camTween = null;
  }
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
})();
