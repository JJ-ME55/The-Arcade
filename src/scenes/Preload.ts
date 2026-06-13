import Phaser from 'phaser';
import { generateAllTextures } from '../core/textures';
import { ORES } from '../config/ores';
import { TILE } from '../config/gameplay';

/**
 * Authored ore/gem art (the DesignHandoff CGI minerals) keyed by our ore id. Metals live
 * under world/ore_*, the precious tiers under world/gem_*. Loaded as source images then
 * baked down to a TILE-sized embedded-overlay texture (`ore_<id>`) over the procedural one.
 */
const ORE_FILE: Record<string, string> = {
  coal: 'world/ore_coal',
  copper: 'world/ore_copper',
  iron: 'world/ore_iron',
  aluminium: 'world/ore_aluminium',
  silver: 'world/ore_silver',
  gold: 'world/ore_gold',
  platinum: 'world/ore_platinum',
  titanium: 'world/ore_titanium',
  emerald: 'world/gem_emerald',
  sapphire: 'world/gem_sapphire',
  ruby: 'world/gem_ruby',
  diamond: 'world/gem_diamond',
  aurelium: 'world/gem_aurelium',
};

export class Preload extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    this.load.setPath('assets');
    for (const o of ORES) {
      const f = ORE_FILE[o.id];
      if (f) this.load.image('src_ore_' + o.id, f + '.png');
    }
    // CGI machine/cabinet shells used as composited screen backgrounds.
    const shells: [string, string][] = [
      ['shell_menu_hero', 'shells/Drill_HOMESCREEN.png'],
      ['shell_menu_monitor', 'shells/menu-monitor.png'],
      ['shell_lb_cab', 'shells/leaderboard-cab.png'],
      ['shell_gameover', 'shells/gameover-plaque.png'],
      ['shell_shop_upgrades', 'shells/Junk_Yard_Shop.png'],
      ['shell_shop_fuel', 'shells/Fuel_Screen.png'],
      ['shell_shop_processor', 'shells/mineral_processing.png'],
      // CGI surface building exteriors (transparent) — stand on the surface, opened by walking in
      ['bld_fuel', 'buildings/fuel.png'],
      ['bld_auto', 'buildings/outpost.png'],
      ['bld_proc', 'buildings/proc.png'],
    ];
    for (const [k, p] of shells) this.load.image(k, p);

    // authored fossil art for the Collection vault (our fossil id -> handoff file)
    const FOSSIL_FILE: Record<string, string> = {
      ammonite: 'ammonite',
      trilobite: 'trilobite',
      fern: 'fern',
      dino_tooth: 'tooth',
      dino_rib: 'ribs',
      dino_skull: 'skull',
      mammoth_tusk: 'tusk',
    };
    for (const [id, f] of Object.entries(FOSSIL_FILE)) this.load.image('fossil_' + id, 'world/fossil_' + f + '.png');

    // authored upgrade sprites for the Outpost shop (7 categories × 6 tiers)
    for (const c of ['drill', 'fuel', 'cargo', 'hull', 'engine', 'radiator', 'scanner']) {
      for (let n = 0; n < 6; n++) this.load.image(`up_${c}_${n}`, `sprites/${c}_${n}.png`);
    }

    // authored photoreal terrain — soil/rock are sliced into world-position tiles by the renderer
    this.load.image('soil_tex', 'tiles/soil.png');
    this.load.image('rock_tex', 'tiles/rock.png');
    this.load.image('sky_authored', 'tiles/sky.png');
    // V2 photoreal grass cross-section (blades over soil on black) — keyed to a transparent
    // fringe in create() and drawn as a surface overlay (see Game.drawSurface)
    this.load.image('grass_src', 'tiles/grass.png');

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      // non-fatal: procedural overlays / plain backgrounds stay as the fallback
      console.warn('[preload] asset failed, using fallback:', file.key);
    });
  }

  create(): void {
    generateAllTextures(this);
    // Lift the authored terrain out of near-black and soften its internal speckle. A Phaser tint
    // can only DARKEN, so the brightness has to be baked into the source bitmap here, before the
    // TileRenderer slices it. Soil reads as mid-brown earth; rock gets a stronger lift (it was the
    // darkest) so ore and rock are both legible at any screen brightness.
    adjustTexture(this, 'soil_tex', 'brightness(1.36) contrast(0.86) saturate(1.05)');
    adjustTexture(this, 'rock_tex', 'brightness(1.58) contrast(0.92) saturate(1.02)');
    // photoreal grass: key the black sky out of the top of the V2 cross-section, leaving a
    // transparent-topped fringe of blades over a thin soil lip; the soil lip is also faded out at
    // the bottom so the overlay melts into the real soil instead of leaving a hard dark seam.
    if (this.textures.exists('grass_src')) keyOutBlack(this, 'grass_src', 'grass_tex', 0.36, 0.1, 0.2, 0.32);
    // the V2 building exteriors sit on a black backdrop — key it to transparency so they stand on
    // the grass/surface, not in a black box. Tight thresholds keep their own dark metalwork intact.
    for (const k of ['bld_fuel', 'bld_auto', 'bld_proc']) {
      if (this.textures.exists(k)) keyOutBlack(this, k, k, 1, 0.05, 0.12);
    }

    // overlay the authored mineral art on top of the procedural `ore_<id>` overlays — bigger and
    // more saturated (no outline) so nuggets POP against the lifted dirt instead of camouflaging
    for (const o of ORES) {
      const srcKey = 'src_ore_' + o.id;
      if (this.textures.exists(srcKey)) bakeFitted(this, srcKey, 'ore_' + o.id, TILE, 0.7, 'brightness(1.18) saturate(1.5)');
    }

    // brighten the upgrade sprites so they read on the shop's dark CRT screens (they were near-black)
    for (const c of ['drill', 'fuel', 'cargo', 'hull', 'engine', 'radiator', 'scanner']) {
      for (let n = 0; n < 6; n++) adjustTexture(this, `up_${c}_${n}`, 'brightness(1.32) saturate(1.12) contrast(1.04)');
    }

    const el = document.getElementById('boot-loader');
    if (el) {
      el.classList.add('hidden');
      window.setTimeout(() => el.remove(), 500);
    }
    this.scene.start('MainMenu');
  }
}

/** Redraw a loaded source image, scaled to fit (preserving aspect), centred in a square texture. */
function bakeFitted(
  scene: Phaser.Scene,
  srcKey: string,
  dstKey: string,
  size: number,
  fit: number,
  filter = 'none',
): void {
  const img = scene.textures.get(srcKey).getSourceImage() as CanvasImageSource & {
    width: number;
    height: number;
  };
  const sw = img.width;
  const sh = img.height;
  if (!sw || !sh) return;
  const s = Math.min((size * fit) / sw, (size * fit) / sh);
  const w = sw * s;
  const h = sh * s;
  if (scene.textures.exists(dstKey)) scene.textures.remove(dstKey);
  const ct = scene.textures.createCanvas(dstKey, size, size);
  if (!ct) return;
  const ctx = ct.getContext();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.filter = filter;
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  ctx.filter = 'none';
  ct.refresh();
}

/** Re-bake a loaded image through a canvas brightness/contrast filter, replacing it in place. */
function adjustTexture(scene: Phaser.Scene, key: string, filter: string): void {
  if (!scene.textures.exists(key)) return;
  const src = scene.textures.get(key).getSourceImage() as HTMLImageElement;
  const w = src.width;
  const h = src.height;
  if (!w || !h) return;
  scene.textures.remove(key);
  const ct = scene.textures.createCanvas(key, w, h);
  if (!ct) return;
  const ctx = ct.getContext();
  ctx.filter = filter;
  ctx.drawImage(src, 0, 0);
  ctx.filter = 'none';
  ct.refresh();
}

/**
 * Key the near-black background out of an image to transparency. Optionally crops to the top
 * `keep` fraction first (for cross-sections like grass, dropping the deep soil). Any pixel below
 * `t0` luminance becomes transparent; `t0`..`t1` feathers so edges don't hard-alias. Tight
 * thresholds (low t0/t1) only kill true black backgrounds and preserve dark detail in the art.
 */
function keyOutBlack(
  scene: Phaser.Scene,
  srcKey: string,
  dstKey: string,
  keep = 1,
  t0 = 0.06,
  t1 = 0.13,
  bottomFade = 0,
): void {
  const src = scene.textures.get(srcKey).getSourceImage() as HTMLImageElement;
  const w = src.width;
  const h = src.height;
  if (!w || !h) return;
  const ch = Math.round(h * keep);
  if (scene.textures.exists(dstKey)) scene.textures.remove(dstKey);
  const ct = scene.textures.createCanvas(dstKey, w, ch);
  if (!ct) return;
  const ctx = ct.getContext();
  ctx.drawImage(src, 0, 0);
  const data = ctx.getImageData(0, 0, w, ch);
  const px = data.data;
  const span = Math.max(0.001, t1 - t0);
  const fadeStart = bottomFade > 0 ? Math.floor(ch * (1 - bottomFade)) : ch;
  for (let i = 0; i < px.length; i += 4) {
    const lum = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) / 255;
    if (lum < t0) px[i + 3] = 0;
    else if (lum < t1) px[i + 3] = Math.round(((lum - t0) / span) * 255);
    // fade the bottom rows out so a cross-section overlay melts into what's below it (no hard seam)
    if (bottomFade > 0) {
      const row = (i >> 2) / w;
      if (row > fadeStart) {
        const f = 1 - (row - fadeStart) / (ch - fadeStart);
        px[i + 3] = Math.round(px[i + 3] * Math.max(0, f));
      }
    }
  }
  ctx.putImageData(data, 0, 0);
  ct.refresh();
}
