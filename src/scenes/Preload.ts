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

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      // non-fatal: procedural overlays / plain backgrounds stay as the fallback
      console.warn('[preload] asset failed, using fallback:', file.key);
    });
  }

  create(): void {
    generateAllTextures(this);
    // overlay the authored mineral art on top of the procedural `ore_<id>` overlays
    for (const o of ORES) {
      const srcKey = 'src_ore_' + o.id;
      // smaller embedded nugget (not a tile-filling blob) so dense ore fields don't read as a rash
      if (this.textures.exists(srcKey)) bakeFitted(this, srcKey, 'ore_' + o.id, TILE, 0.56);
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
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  ct.refresh();
}
