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
const FRAMES_PER_BALL = 128;
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
    // Explicit camera.up so the projection is deterministic — without
    // this, Three.js falls back to a degenerate up vector when lookAt
    // direction is parallel to default up=(0,1,0). The previous bake
    // had this ambiguity which is why the disc landed at the wrong
    // screen position (JJ 2026-06: "rotation seems to happen in the
    // wrong direction"). With up=(0,0,-1) the screen +Y axis maps to
    // 3D -Z, so disc moving from +Y to +Z (rolling) appears to move
    // UP on screen — the natural visual for a ball rolling away from
    // the viewer in the bake's canonical orientation.
    camera.position.set(0, 5, 0);
    camera.up.set(0, 0, -1);
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
     * Build the UV-mapped sphere texture for one ball variant.
     * Disc is placed at the EQUATOR (v=0.5) where equirectangular
     * stretching is minimal — at v=0.5, a horizontal canvas pixel
     * maps 1:1 to longitude on the sphere. Disc near the pole (v=0.97)
     * is the bug JJ caught — the texture got stretched and the digit
     * rendered as a sideways smear.
     *
     * Layout:
     *   Stripe band: v=0.30..0.70 (for stripe balls), wraps the sphere
     *     around the equator
     *   Number disc: centered at u=0.5, v=0.5 — a circular patch
     *     containing the digit. The sphere is then pre-rotated in the
     *     bake's renderFrame so this disc ends up facing the camera at
     *     frame 0.
     */
    function buildBodyTexture(ballId) {
      const W = 1024, H = 512;
      const cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      const c = cv.getContext('2d');

      const isStripe = ballId >= 9 && ballId <= 15;
      const baseN = isStripe ? ballId - 8 : ballId;

      let baseColour;
      if (ballId === 0)        baseColour = '${CUE_COLOR}';
      else if (ballId === 8)   baseColour = '${EIGHT_COLOR}';
      else if (isStripe)       baseColour = '${STRIPE_WHITE}';
      else                     baseColour = ${JSON.stringify(SOLID_COLORS)}[baseN];

      c.fillStyle = baseColour;
      c.fillRect(0, 0, W, H);

      // Cue ball: no markings, just the off-white sphere. Return early.
      if (ballId === 0) return cv;

      // Stripe band — equator band, v=0.30..0.70.
      if (isStripe) {
        const stripeColour = ${JSON.stringify(SOLID_COLORS)}[baseN];
        const yTop = H * (1 - 0.70);
        const yBot = H * (1 - 0.30);
        c.fillStyle = stripeColour;
        c.fillRect(0, yTop, W, yBot - yTop);
      }

      // TWIN DISCS — one at u=0.5, mirror at u=0.0 (which wraps to
      // u=1.0 along the seam). The two discs are 180° apart on the
      // sphere, so as the ball rolls one disc is always on the front
      // hemisphere. When the original disc rotates past the silhouette
      // and fades, the mirror disc rotates in from the opposite edge.
      // JJ playtest 2026-06: "the miniclip balls roll seamlessly" —
      // this twin-disc trick is the standard arcade cheat for that
      // visual: the number never fully disappears as the ball rolls.
      //
      // Real billiard balls have only one disc; this is a sympathetic
      // departure from physical accuracy for game readability.
      const discCy = H * 0.5;
      const discR  = 60;  // slightly smaller so two discs don't crowd the visible ball

      // Original disc at u=0.5 (canvas x=512)
      const discCx1 = W * 0.5;
      c.fillStyle = '#FFFFFF';
      c.beginPath();
      c.arc(discCx1, discCy, discR, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#14192A';
      c.font = 'bold ' + Math.round(discR * 1.1) + 'px "Bitter", Georgia, serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(String(ballId === 8 ? 8 : ballId), discCx1, discCy);

      // Mirror disc at u=0.0 (canvas x=0) AND u=1.0 (canvas x=W) — the
      // texture wraps at the seam, so draw at both edges to cover the
      // seam cleanly. When the sphere rotates 180° around the rolling
      // axis (X), the mirror disc swings to the front. But the texture
      // for that disc also flips, so a normally-drawn digit appears
      // UPSIDE-DOWN when it becomes visible. We pre-rotate the digit
      // 180° in the canvas (using ctx.rotate around the disc centre)
      // so it lands upright when rolled to the visible position.
      const drawMirror = (cx) => {
        c.fillStyle = '#FFFFFF';
        c.beginPath();
        c.arc(cx, discCy, discR, 0, Math.PI * 2);
        c.fill();
        c.save();
        c.translate(cx, discCy);
        c.rotate(Math.PI);  // 180° pre-rotation cancels the rolling flip
        c.fillStyle = '#14192A';
        c.font = 'bold ' + Math.round(discR * 1.1) + 'px "Bitter", Georgia, serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(String(ballId === 8 ? 8 : ballId), 0, 0);
        c.restore();
      };
      drawMirror(0);   // u=0
      drawMirror(W);   // u=1 (same seam)

      return cv;
    }

    /**
     * Set up the textured sphere for a given ball variant.
     * Single UV-mapped texture — disc IS part of the sphere surface,
     * curves with it, never goes edge-on (the bug with the flat-disc
     * child mesh approach).
     */
    window.__setBall = (ballId) => {
      if (currentTexture)  { currentTexture.dispose();  currentTexture = null; }
      if (currentMaterial) { currentMaterial.dispose(); currentMaterial = null; }
      if (currentMesh)     { scene.remove(currentMesh); currentMesh = null; }

      const bodyCanvas = buildBodyTexture(ballId);
      currentTexture = new THREE.CanvasTexture(bodyCanvas);
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
     * Render one frame at the given rotation.
     *
     * The texture has the disc painted at UV (0.5, 0.5) — the equator.
     * In Three.js SphereGeometry default UV mapping, UV (0.5, 0.5)
     * maps to 3D -X direction (longitude 180°, equator).
     *
     * To put the disc at +Y (facing camera) at frame 0, we pre-rotate
     * the sphere by -π/2 around the Z axis (-X → +Y). Then we apply
     * the rolling rotation around X — this rotates the +Y point to
     * +Z (screen DOWN), then to -Y (back, invisible), then to -Z
     * (screen UP), back to +Y.
     *
     * Rotation order is 'ZYX' so the Z pre-rotation is applied FIRST
     * (to native orientation), then X is applied to the result. With
     * the default 'XYZ' order, X would be applied first and wouldn't
     * affect the -X disc position (rotation around its own axis), so
     * no rolling would be visible.
     *
     * Visibility cycle (with disc covering ~25° angular extent on the
     * sphere surface):
     *   - 0°:        disc fully visible at centre
     *   - 90°:       disc at screen DOWN edge, partial visible
     *   - 180°:      disc on back hemisphere, INVISIBLE
     *   - 270°:      disc at screen UP edge, partial visible
     *   - 360°:      back to centre
     *
     *   Disc is fully visible ~64% of the cycle (any rotation where
     *   the disc CENTRE is within ±115° of +Y, since disc extends
     *   25° from its centre).
     */
    window.__renderFrame = (rotationRad) => {
      if (!currentMesh) return;
      // Three.js SphereGeometry default UV: u=0.5, v=0.5 → 3D +X.
      // Z=+π/2 takes +X → +Y (disc faces camera). But the digit's
      // "up" direction (originally sphere +Y on the texture) ends up
      // at world -X, which means the digit prints SIDEWAYS in the
      // rendered image. An additional Y=-π/2 rotation spins the digit
      // around the disc-axis (+Y) so its "up" ends at world -Z which
      // is screen UP — digit appears upright. Y rotation around +Y
      // doesn't move the disc itself (it's on the rotation axis).
      // Then X=rotationRad rolls the disc around the X axis: +Y →
      // +Z → -Y → -Z → +Y as rotationRad goes 0 → 2π.
      // Three.js rotation 'XYZ' order applies Z FIRST, then Y, then X
      // (matrix = R_x * R_y * R_z, evaluated right-to-left). So:
      //   Z=+π/2 applied first  → disc at +X moves to +Y (faces camera)
      //   Y=-π/2 applied second → spins disc-axis to align digit upright
      //   X=rotationRad last    → rolling rotation
      currentMesh.rotation.order = 'XYZ';
      currentMesh.rotation.set(rotationRad, -Math.PI / 2, Math.PI / 2);
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
      // 3-digit pad — 128 frames goes 000-127. Was 2-digit when frame
      // count was 32 (00-31); kept 3 to leave headroom for future bumps.
      const frameStr = String(i).padStart(3, '0');
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
