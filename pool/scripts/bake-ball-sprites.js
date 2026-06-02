/**
 * Bake ball base sprites for Side Pocket — 3D-rendered glossy spheres.
 *
 * Renders each ball colour as a 3D-shaded sphere using Three.js inside
 * a headless Chromium (Puppeteer). The output is a set of high-quality
 * sphere base PNGs that the runtime canvas.ts uses as the ball
 * background, with number disc + stripe band + number digit layered
 * procedurally on top.
 *
 * Background: JJ playtest 2026-06 compared our procedural canvas2D
 * sphere shading to Miniclip 8 Ball Pool's actual rendering and found
 * ours visibly flat by comparison. Miniclip uses 3D-rendered sprites
 * baked offline. This script reproduces that pipeline using free,
 * code-generated 3D — no external assets, no AI services, no paid
 * downloads. Three.js generates a perfect SphereGeometry in code and
 * renders it with proper PBR materials (clearcoat, roughness,
 * physically-correct lighting) at 512×512 with antialiasing.
 *
 * Output: public/games/pool/assets/sprites/balls/sphere_{name}.png
 * Variants: cue, eight, yellow, blue, red, purple, orange, green, burgundy
 * (Stripe balls reuse sphere_cue.png as their white base.)
 *
 * Usage:
 *   cd pool
 *   npm install puppeteer three --save-dev   # one-time
 *   node scripts/bake-ball-sprites.js
 *
 * Re-run any time the colour palette or lighting needs to change.
 * Outputs are committed to git so the runtime doesn't need to bake.
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// ──────────────────────────────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────────────────────────────

// Ball colours — must match the SOLID_COLORS table in canvas.ts so the
// procedural marking overlay sits on the right base tone. Cue and 8
// use their own colours; the seven solid colours map to balls 1–7 in
// canonical American pool order.
const COLOURS = {
  cue:      '#FAF6E4',
  eight:    '#0E0E10',
  yellow:   '#F4B924',
  blue:     '#1F5BB3',
  red:      '#C6312A',
  purple:   '#5B2680',
  orange:   '#E2691C',
  green:    '#1E7A3A',
  burgundy: '#6E2618',
};

const SIZE = 512;
// Output to pool/public/assets/sprites/balls/ so webpack's CopyPlugin
// picks them up into dist/, which then ships to public/games/pool/.
// Outputting directly to the deployed path would survive a build cycle
// but be wiped on the next `rm -rf public/games/pool && cp dist/*`.
const OUT_DIR = path.join(__dirname, '..', 'public', 'assets', 'sprites', 'balls');
const TMP_DIR = path.join(__dirname, '..', '.bake-tmp');

// ──────────────────────────────────────────────────────────────────────
// Set up a temp HTML file that imports Three.js from local node_modules
// via an ES module relative URL. Puppeteer navigates to it via file://
// so no CDN / network is needed.
// ──────────────────────────────────────────────────────────────────────

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
  <canvas id="c" width="${SIZE}" height="${SIZE}"></canvas>
  <script type="module">
    import * as THREE from '../node_modules/three/build/three.module.min.js';
    window.THREE = THREE;

    const renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById('c'),
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(${SIZE}, ${SIZE}, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1.05, 1.05, 1.05, -1.05, 0.1, 10);
    camera.position.set(0, 5, 0);
    camera.lookAt(0, 0, 0);

    const geometry = new THREE.SphereGeometry(1, 128, 128);
    const material = new THREE.MeshPhysicalMaterial({
      color:              0xffffff,
      roughness:          0.18,
      clearcoat:          1.0,
      clearcoatRoughness: 0.04,
      metalness:          0.0,
    });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    // Single key light — overhead-left. JJ playtest reference shots
    // show Miniclip's balls have exactly ONE clear specular highlight,
    // not two. A fill light here was creating a second pin-prick
    // reflection on the dark side, which looked wrong. We rely on
    // higher ambient to keep the shadow side from going totally dead.
    const key = new THREE.DirectionalLight(0xffffff, 2.8);
    key.position.set(-2.5, 5, -2.5);
    scene.add(key);

    // Hemisphere light — gives a soft gradient fill (sky/ground) that
    // brightens the shadow side WITHOUT creating a second specular.
    // Unlike a DirectionalLight, this is a directional gradient ambient
    // that doesn't punch specular highlights into the clearcoat layer.
    const hemi = new THREE.HemisphereLight(0xffffff, 0xc8c8c8, 0.65);
    scene.add(hemi);

    // Low ambient — keeps blacks (especially 8-ball) from going dead.
    scene.add(new THREE.AmbientLight(0xffffff, 0.15));

    // Exposed to Node side via page.evaluate.
    window.__bake = (hex) => {
      material.color = new THREE.Color(hex);
      material.needsUpdate = true;
      renderer.render(scene, camera);
    };
    window.__ready = true;
  </script>
</body>
</html>`;
}

// ──────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(TMP_DIR, { recursive: true });

  // Write the bake page to a temp file so the ES module import resolves
  // against the on-disk node_modules. file:// URLs honour relative imports.
  const htmlPath = path.join(TMP_DIR, 'bake.html');
  fs.writeFileSync(htmlPath, buildHTML(), 'utf8');

  // WebGL in headless Chromium needs the right combination of flags.
  // `swiftshader` (the default software GL) is being deprecated in newer
  // Chromium; the `--enable-unsafe-swiftshader` flag re-enables it.
  // We also try the new headless mode ('shell') which has better GL
  // support than the old --headless=new.
  console.log(`[bake] launching headless Chromium…`);
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
  await page.setViewport({ width: SIZE, height: SIZE, deviceScaleFactor: 1 });

  // Pipe page console + errors to the Node console for debuggability.
  page.on('console', (msg) => console.log(`[page:${msg.type()}]`, msg.text()));
  page.on('pageerror', (err) => console.log(`[page error]`, err.message));

  const fileUrl = 'file://' + htmlPath.replace(/\\/g, '/');
  console.log(`[bake] loading ${fileUrl}`);
  await page.goto(fileUrl, { waitUntil: 'load' });

  await page.waitForFunction('window.__ready === true', { timeout: 20000 });

  for (const [name, colour] of Object.entries(COLOURS)) {
    await page.evaluate((hex) => window.__bake(hex), colour);
    // Tiny tick to ensure the render is complete before screenshot.
    await new Promise(r => setTimeout(r, 100));

    const canvas = await page.$('#c');
    const buf = await canvas.screenshot({
      omitBackground: true,
      type: 'png',
    });

    const outPath = path.join(OUT_DIR, `sphere_${name}.png`);
    fs.writeFileSync(outPath, buf);
    const kb = (buf.length / 1024).toFixed(1);
    console.log(`[bake] wrote sphere_${name}.png (${kb} KB, ${colour})`);
  }

  await browser.close();
  console.log(`[bake] complete — ${Object.keys(COLOURS).length} sprites in ${OUT_DIR}`);

  // Leave .bake-tmp around for inspection; rm if you want to be tidy.
})().catch((err) => {
  console.error(`[bake] FAILED:`, err);
  process.exit(1);
});
