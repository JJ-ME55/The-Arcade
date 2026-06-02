/**
 * Bake the Side Pocket pool ball sprite ATLAS — AAA edition.
 *
 * This is the second-generation bake script. The first one (bake-
 * ball-sprites.js) baked nine static spheres; markings were then
 * layered procedurally at runtime. JJ playtest 2026-06 confirmed this
 * fundamentally cannot match Miniclip's rolling visual because Miniclip
 * — per ex-Miniclip dev Ivo Alves's CV — uses the Cocos2d sprite
 * builder pipeline to pre-render 3D balls with painted textures at
 * many rotation frames, then swaps the right frame at runtime based on
 * the ball's accumulated roll angle. The disc/stripe you see "whip
 * around" is the textured 3D sphere actually rotated in 3D space.
 *
 * This script reproduces that exact pipeline:
 *   1. For each of 16 ball variants (cue + 8 + 1-7 solid + 9-15 stripe),
 *      build a UV-mapped texture canvas (base colour, optional stripe
 *      band, white number disc, painted digit) and apply to a Three.js
 *      SphereGeometry as the MeshPhysicalMaterial map.
 *   2. Render that lit textured sphere at 32 rotation positions around
 *      the X-axis (the rolling axis when the ball moves in +Z).
 *   3. Save each frame as a transparent PNG.
 *
 * Output: 16 × 32 = 512 PNG frames at
 *   pool/public/assets/sprites/balls/ball_{0..15}_frame_{00..31}.png
 *
 * Runtime (canvas.ts) just picks the right frame based on the ball's
 * accumulated roll angle and motion direction, then drawImage's it.
 * No procedural marking overlay — the marking IS in the sprite,
 * already correctly rotated.
 *
 * Usage:
 *   cd pool
 *   node scripts/bake-ball-atlas.js
 *   # ~5 minutes for 512 frames
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// ──────────────────────────────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────────────────────────────

const SPRITE_SIZE = 256;   // px per frame (in iframe ball is ~38px, so 256² gives generous downscaling resolution)
const FRAMES_PER_BALL = 32;
const BALL_IDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const OUT_DIR = path.join(__dirname, '..', 'public', 'assets', 'sprites', 'balls');
const TMP_DIR = path.join(__dirname, '..', '.bake-tmp');

// Ball colour palette — must match canvas.ts SOLID_COLORS and the
// Round 2 designer's brand palette.
const SOLID_COLORS = {
  1: '#F4B924',  // yellow
  2: '#1F5BB3',  // blue
  3: '#C6312A',  // red
  4: '#5B2680',  // purple
  5: '#E2691C',  // orange
  6: '#1E7A3A',  // green
  7: '#6E2618',  // burgundy
};
const CUE_COLOR = '#FAF6E4';
const EIGHT_COLOR = '#0E0E10';
const STRIPE_WHITE = '#FAF6E4';

// ──────────────────────────────────────────────────────────────────────
// HTML scene — same as bake-ball-sprites.js but with textured spheres
// ──────────────────────────────────────────────────────────────────────

/**
 * Generate the HTML page that loads Three.js as an ES module and exposes
 * window.__renderFrame(ballConfig, rotation) so the Node side can drive
 * the bake one frame at a time.
 */
function buildHTML() {
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    html, body { margin: 0; padding: 0; background: transparent; }
    canvas { display: block; }
  </style>
</head>
<body>
  <canvas id="c" width="${SPRITE_SIZE}" height="${SPRITE_SIZE}"></canvas>
  <script type="module">
    import * as THREE from '../node_modules/three/build/three.module.min.js';
    window.THREE = THREE;

    const renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById('c'),
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(${SPRITE_SIZE}, ${SPRITE_SIZE}, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1.05, 1.05, 1.05, -1.05, 0.1, 10);
    camera.position.set(0, 5, 0);
    camera.lookAt(0, 0, 0);

    // Lighting — single overhead-left key + hemisphere fill. Same setup
    // as the previous bake so the look stays consistent.
    const key = new THREE.DirectionalLight(0xffffff, 2.8);
    key.position.set(-2.5, 5, -2.5);
    scene.add(key);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xc8c8c8, 0.65));
    scene.add(new THREE.AmbientLight(0xffffff, 0.15));

    const geometry = new THREE.SphereGeometry(1, 128, 128);

    // Reusable sphere — we swap its material per ball.
    let currentMesh = null;
    let currentMaterial = null;
    let currentTexture = null;

    /**
     * Build a 1024×512 equirectangular texture canvas for one ball variant.
     * Layout: base colour fill, optional stripe band, white disc with digit
     * at v≈0.9 (close to the +Y north pole so it ends up "on top" when
     * the ball is at rest in canonical orientation).
     *
     * UV convention in Three.js SphereGeometry:
     *   u: longitude (0..1 wraps around)
     *   v: latitude (0 = south pole, 1 = north pole)
     * Canvas y is flipped — y=0 at top of canvas corresponds to v=1.
     */
    function buildBallTexture(ballId) {
      const W = 1024, H = 512;
      const cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      const c = cv.getContext('2d');

      const isStripe = ballId >= 9 && ballId <= 15;
      const baseN = isStripe ? ballId - 8 : ballId;

      // Base colour fill.
      let baseColour;
      if (ballId === 0)        baseColour = '${CUE_COLOR}';
      else if (ballId === 8)   baseColour = '${EIGHT_COLOR}';
      else if (isStripe)       baseColour = '${STRIPE_WHITE}';
      else                     baseColour = ${JSON.stringify(SOLID_COLORS)}[baseN];

      c.fillStyle = baseColour;
      c.fillRect(0, 0, W, H);

      // Cue ball: no markings, just the off-white sphere. Return early.
      if (ballId === 0) return cv;

      // Stripe band for 9-15 — horizontal band at the equator that
      // wraps around the ball perpendicular to the disc axis. v=0.30
      // to v=0.70 means the band covers ~40% of the latitude range
      // centred on the equator. Canvas y inverted, so:
      //   v=0.30 → y = (1 - 0.30) * H = 358
      //   v=0.70 → y = (1 - 0.70) * H = 154
      if (isStripe) {
        const stripeColour = ${JSON.stringify(SOLID_COLORS)}[baseN];
        const yTop    = H * (1 - 0.70);  // 154
        const yBot    = H * (1 - 0.30);  // 358
        c.fillStyle = stripeColour;
        c.fillRect(0, yTop, W, yBot - yTop);
      }

      // White number disc at the north pole region. Centred at u=0.5,
      // v=0.88 (close to top, but not so high that the equirectangular
      // stretch makes it grotesque). Disc radius 110px on a 1024-wide
      // canvas → about 10° of arc.
      const discCx = W * 0.5;
      const discCy = H * (1 - 0.88);  // y = 0.12 * 512 = ~62
      const discR  = 110;

      c.fillStyle = '#FFFFFF';
      c.beginPath();
      c.arc(discCx, discCy, discR, 0, Math.PI * 2);
      c.fill();

      // Number digit on the disc. Dark navy for legibility on white,
      // same colour our procedural drawNumberDot used. Bold weight,
      // proportional to disc radius.
      c.fillStyle = '#14192A';
      c.font = 'bold ' + Math.round(discR * 1.05) + 'px "Bitter", Georgia, serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(String(ballId === 8 ? 8 : ballId), discCx, discCy);

      // (Earlier draft put a second mirrored disc at the south pole so
      // the back of the ball wouldn't look uniform. That created a
      // visible mirrored digit when the ball rolled past 180° —
      // confusing. Real billiard balls DO have white at both poles,
      // but the digit only goes on one. The plain-colour back is fine
      // — at speed nobody can read it anyway, and at rest the disc is
      // visible on the top.)

      return cv;
    }

    /**
     * Set up the sphere for a given ball variant.
     */
    window.__setBall = (ballId) => {
      // Dispose previous if any.
      if (currentTexture) { currentTexture.dispose(); currentTexture = null; }
      if (currentMaterial) { currentMaterial.dispose(); currentMaterial = null; }
      if (currentMesh) { scene.remove(currentMesh); currentMesh = null; }

      const texCanvas = buildBallTexture(ballId);
      currentTexture = new THREE.CanvasTexture(texCanvas);
      currentTexture.colorSpace = THREE.SRGBColorSpace;
      currentTexture.anisotropy = 8;
      currentTexture.needsUpdate = true;

      currentMaterial = new THREE.MeshPhysicalMaterial({
        map:                currentTexture,
        roughness:          0.18,
        clearcoat:          1.0,
        clearcoatRoughness: 0.04,
        metalness:          0.0,
      });

      currentMesh = new THREE.Mesh(geometry, currentMaterial);
      scene.add(currentMesh);
    };

    /**
     * Render one frame at the given rotation. We pre-rotate the sphere
     * by π/2 around X so the disc axis (originally UV north pole at +Y)
     * sits along +Z instead — this makes the stripe (a latitude band
     * on the texture) wrap perpendicular to the camera axis, appearing
     * as a HORIZONTAL BAND across the middle of the visible ball from
     * above (rather than the ring-at-edge you'd get without the
     * pre-rotation). The rolling rotation is applied on top of this
     * pre-rotation, still around X — so as rotationRad increases the
     * disc moves around the visible ball (front edge → bottom →
     * back edge → top centre → front edge).
     */
    window.__renderFrame = (rotationRad) => {
      if (!currentMesh) return;
      currentMesh.rotation.set(Math.PI / 2 + rotationRad, 0, 0);
      renderer.render(scene, camera);
    };

    window.__ready = true;
  </script>
</body>
</html>`;
}

// ──────────────────────────────────────────────────────────────────────
// Main bake loop
// ──────────────────────────────────────────────────────────────────────

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(TMP_DIR, { recursive: true });

  const htmlPath = path.join(TMP_DIR, 'bake-atlas.html');
  fs.writeFileSync(htmlPath, buildHTML(), 'utf8');

  console.log(`[atlas] launching headless Chromium…`);
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--allow-file-access-from-files',
      '--enable-webgl',
      '--enable-unsafe-swiftshader',
      '--enable-features=Vulkan',
      '--use-angle=swiftshader',
      '--disable-gpu-sandbox',
      '--ignore-gpu-blacklist',
      '--ignore-gpu-blocklist',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: SPRITE_SIZE, height: SPRITE_SIZE, deviceScaleFactor: 1 });
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`[page:${msg.type()}]`, msg.text());
    }
  });
  page.on('pageerror', (err) => console.log(`[page error]`, err.message));

  const fileUrl = 'file://' + htmlPath.replace(/\\/g, '/');
  await page.goto(fileUrl, { waitUntil: 'load' });
  await page.waitForFunction('window.__ready === true', { timeout: 20000 });

  const startedAt = Date.now();
  let totalBytes = 0;
  let totalFrames = 0;

  for (const ballId of BALL_IDS) {
    await page.evaluate((id) => window.__setBall(id), ballId);
    // Tiny wait for the GPU upload to settle after material swap.
    await new Promise(r => setTimeout(r, 50));

    for (let i = 0; i < FRAMES_PER_BALL; i++) {
      const rotation = (i / FRAMES_PER_BALL) * Math.PI * 2;
      await page.evaluate((r) => window.__renderFrame(r), rotation);
      await new Promise(r => setTimeout(r, 20));

      const canvas = await page.$('#c');
      const buf = await canvas.screenshot({ omitBackground: true, type: 'png' });
      const frameStr = String(i).padStart(2, '0');
      const outPath = path.join(OUT_DIR, `ball_${ballId}_frame_${frameStr}.png`);
      fs.writeFileSync(outPath, buf);
      totalBytes += buf.length;
      totalFrames++;
    }
    console.log(`[atlas] ball ${ballId}: ${FRAMES_PER_BALL} frames written`);
  }

  await browser.close();
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  const mb = (totalBytes / 1024 / 1024).toFixed(2);
  console.log(`[atlas] complete — ${totalFrames} frames, ${mb} MB total, ${elapsed}s`);
})().catch((err) => {
  console.error(`[atlas] FAILED:`, err);
  process.exit(1);
});
