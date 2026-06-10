import Phaser from 'phaser';
import {
  TILE, WORLD_WIDTH, SURFACE_ROW, SKY_ROWS, FUEL, HEAT, HULL, ECON, CAM,
} from '../config/gameplay';
import { Terrain, type DeathCause, type Tile, type ItemId } from '../core/types';
import { App, type RunConfig, randomSeedString } from '../core/state';
import { World } from '../world/world';
import { TileRenderer, type GlowCell } from '../world/tileRenderer';
import { BoulderSystem } from '../world/hazards';
import { Pod, type PodInput } from '../entities/pod';
import { Hud } from '../ui/hud';
import { TouchControls } from '../ui/touch';
import { SurfaceMenu } from '../ui/shop';
import { Fx } from '../systems/fx';
import { Darkness, type GlintPoint } from '../systems/darkness';
import { Sound } from '../systems/audio';
import { tickStreak, claimCompletedGoals } from '../systems/retention';
import { createRun, addOre, cargoValue } from '../systems/run';
import { deriveStats, type DerivedStats } from '../systems/stats';
import { biomeAt, biomeIndexAt, BIOMES } from '../config/biomes';
import { ORE_BY_ID, ORES, oreSpawnWeight } from '../config/ores';
import { FOSSILS, ARTIFACTS } from '../config/specials';
import { ITEMS } from '../config/items';
import { hash2, weightedIndex } from '../core/rng';
import { computeScore } from '../systems/score';
import { Button } from '../ui/widgets';
import { uiHit, swallowHit } from '../ui/hit';
import { COL, textStyle, title } from '../ui/theme';
import { getActiveSeason, awardSeasonPoints, podTint } from '../systems/season';
import type { SeasonDef } from '../config/seasons';
import { saveRun, clearRun, type RunSave } from '../systems/runsave';
import { aggregateMods, MODIFIER_BY_ID } from '../config/modifiers';
import { nextTransmission, type Transmission } from '../config/transmissions';

export class GameScene extends Phaser.Scene {
  private run!: ReturnType<typeof createRun>;
  private world!: World;
  private stats!: DerivedStats;
  private pod!: Pod;
  private tiles!: TileRenderer;
  private boulders!: BoulderSystem;
  private hud!: Hud;
  private touch!: TouchControls;
  private fx!: Fx;
  private darkness!: Darkness;
  private menu!: SurfaceMenu;

  private bgImgs: Phaser.GameObjects.Image[] = [];
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private paused = false;
  private ended = false;
  private surfaceArmed = false;
  private thrustOn = false;
  private startPx = 0;
  private startPy = 0;
  private warnedFull = 0;
  private pauseRoot?: Phaser.GameObjects.Container;
  private itemBar: { id: string; cont: Phaser.GameObjects.Container; count: Phaser.GameObjects.Text }[] = [];
  private activeSeason: SeasonDef | null = null;
  private onHidden?: () => void;
  private onResize?: () => void;
  private lastAmbBiome = -1;
  private hitStopUntil = 0;
  private lastBiomeBanner = -1;
  private coreReached = false;
  private commsRoot?: Phaser.GameObjects.Container;
  private outpostBtn?: Button;
  private outpostHint?: Phaser.GameObjects.Text;
  private parallax!: Phaser.GameObjects.TileSprite;
  private glowBuf: GlowCell[] = [];
  private glintBuf: GlintPoint[] = [];

  constructor() {
    super('Game');
  }

  create(): void {
    this.ended = false;
    this.paused = false;
    this.surfaceArmed = false;

    const resume = App.resumeData as RunSave | null;
    App.resumeData = null;

    let cfg: RunConfig;
    if (resume) {
      this.run = resume.run;
      cfg = { seed: this.run.seed, mode: this.run.mode, loadout: this.run.loadout, modifiers: this.run.modifiers };
    } else {
      cfg = App.runConfig ?? { seed: randomSeedString(), mode: 'free', loadout: 'prospector', modifiers: [] };
      this.run = createRun(cfg);
    }
    App.runConfig = cfg;

    this.activeSeason = getActiveSeason();
    const seasonFind = this.activeSeason
      ? { id: this.activeSeason.find.id, rarity: this.activeSeason.find.rarity, minDepth: this.activeSeason.find.minDepth }
      : null;
    if (this.activeSeason) this.makeSeasonTexture(this.activeSeason);
    this.world = new World(this.run.seedNum, seasonFind, resume ? this.run.overrides : undefined);
    this.stats = deriveStats(this.run);

    // backgrounds (sky + each biome), crossfaded by depth
    const order = ['bg_sky', ...BIOMES.map((b) => 'bg_' + b.id)];
    this.bgImgs = order.map((k, i) =>
      this.add.image(0, 0, k).setOrigin(0).setDisplaySize(this.scale.width, this.scale.height).setScrollFactor(0).setDepth(-100).setAlpha(i === 0 ? 1 : 0),
    );

    // slow parallax rock layer seen through tunnels — spatial depth underground
    this.parallax = this.add
      .tileSprite(0, 0, this.scale.width, this.scale.height, 'cave_bg')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-50)
      .setAlpha(0);

    this.tiles = new TileRenderer(this, this.world);
    this.drawSurface();

    const startCol = Math.floor(WORLD_WIDTH / 2);
    this.startPx = (startCol + 0.5) * TILE;
    this.startPy = SURFACE_ROW * TILE - TILE * 0.42 - 1;
    const px = resume ? resume.podX : this.startPx;
    const py = resume ? resume.podY : this.startPy;
    this.pod = new Pod(this, this.world, this.run, this.stats, px, py);
    this.pod.gravityMul = aggregateMods(this.run.modifiers).gravityMul;
    if (resume) this.surfaceArmed = this.world.depthMeters(Math.floor(py / TILE)) > 12;
    this.pod.setTint(podTint(App.meta.selectedPod));
    this.lastBiomeBanner = biomeIndexAt(this.world.depthMeters(Math.floor(py / TILE)));
    this.coreReached = this.run.depthMax >= BIOMES[BIOMES.length - 1].depthStart;

    this.boulders = new BoulderSystem(this, this.world, this.tiles, () => ({
      col: Math.floor(this.pod.px / TILE),
      row: Math.floor(this.pod.py / TILE),
      px: this.pod.px,
      py: this.pod.py,
    }));
    this.boulders.onCrush = (dmg) => {
      this.hitStop(75);
      this.damageHull(dmg, 'crushed');
    };

    this.pod.onDigStart = (tx, ty) => {
      Sound.dig(hash2(this.world.seed, tx, ty, 5));
    };
    this.pod.onDigComplete = (tx, ty, tile) => this.onDig(tx, ty, tile);
    this.pod.onLand = (speed) => this.onLand(speed);

    this.fx = new Fx(this);
    this.darkness = new Darkness(this);
    this.hud = new Hud(this);
    this.touch = new TouchControls(this, 70);
    this.menu = new SurfaceMenu(this, this.run, () => this.stats, () => this.recompute(), this.fx, () => {
      this.surfaceArmed = false;
      App.saveNow();
    });

    this.buildItemBar();

    // Surface outpost prompt — always available when you're on the surface, so it's
    // obvious how to sell / refuel / repair / upgrade (not just after a dive).
    this.outpostBtn = new Button(this, this.scale.width / 2, 134, 264, 50, '⌂  ENTER OUTPOST', () => {
      if (!this.menu.isOpen) this.openOutpost();
    }, { fill: COL.brand, border: COL.brand, textColor: 0x1a1400, fontSize: 20, fixed: true });
    this.outpostBtn.setScrollFactor(0).setDepth(1450).setVisible(false);
    this.outpostHint = this.add
      .text(this.scale.width / 2, 168, 'sell · refuel · repair · upgrade', textStyle(13, COL.dim))
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1450)
      .setVisible(false);
    this.tweens.add({ targets: this.outpostBtn, scaleX: 1.04, scaleY: 1.04, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // camera
    const cam = this.cameras.main;
    cam.setBounds(0, -SKY_ROWS * TILE - 200, WORLD_WIDTH * TILE, 100000);
    cam.startFollow(this.pod.sprite, true, CAM.lerp, CAM.lerp, 0, 40);
    cam.centerOn(px, py); // snap (no initial pan, esp. on resume)
    cam.setBackgroundColor('#05050a');
    cam.fadeIn(260, 0, 0, 0);

    // input
    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('LEFT,RIGHT,UP,DOWN,W,A,S,D,SPACE') as Record<string, Phaser.Input.Keyboard.Key>;
    kb.on('keydown-ESC', () => this.togglePause());
    kb.on('keydown-P', () => this.togglePause());
    const itemKeys = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'];
    itemKeys.forEach((k, i) => kb.on('keydown-' + k, () => this.useItem(ITEMS[i]?.id)));

    // autosave on background (meta + suspend the run so it can be resumed)
    this.onHidden = () => {
      App.saveNow();
      this.persistRun();
    };
    this.game.events.on('hidden', this.onHidden);
    this.onResize = () => this.relayout();
    this.scale.on('resize', this.onResize);
    this.events.once('shutdown', () => this.cleanup());

    this.relayout();
    Sound.click();
    Sound.startAmbience();
    this.showModifierBanner();
    if (App.meta.settings.showTutorial) this.showTutorial();
  }

  private showModifierBanner(): void {
    const mod = this.run.modifiers.map((id) => MODIFIER_BY_ID[id]).filter(Boolean)[0];
    if (!mod) return;
    const t = this.add
      .text(this.scale.width / 2, 150, `MUTATOR:  ${mod.name}`, textStyle(20, mod.color))
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1300)
      .setAlpha(0);
    t.setStroke('#000000', 4);
    this.tweens.add({ targets: t, alpha: 1, duration: 300, yoyo: true, hold: 1800, onComplete: () => t.destroy() });
  }

  /** First-run control hints — dismisses on first input, never nags again. */
  private showTutorial(): void {
    const c = this.add.container(0, 0).setScrollFactor(0).setDepth(2400);
    const W = this.scale.width;
    const H = this.scale.height;
    const dim = this.add
      .rectangle(0, 0, W, H, 0x05050a, 0.72)
      .setOrigin(0)
      .setInteractive(new Phaser.Geom.Rectangle(0, 0, 1, 1), swallowHit);
    c.add(dim);
    c.add(this.add.text(W / 2, H * 0.34, 'HOW TO DIG', textStyle(28, COL.brand)).setOrigin(0.5));
    const lines = [
      'Move:  joystick  /  arrow keys',
      'Fly up:  push UP  /  hold thrust',
      'Dig:  push DOWN, LEFT or RIGHT into dirt',
      'You can NEVER dig straight up.',
      'Fuel, cargo & hull all pull you back —',
      'return to the surface to sell & upgrade.',
    ];
    c.add(this.add.text(W / 2, H * 0.46, lines.join('\n'), textStyle(16, COL.text, { align: 'center', lineSpacing: 8 })).setOrigin(0.5));
    c.add(this.add.text(W / 2, H * 0.66, 'tap to begin', textStyle(15, COL.dim)).setOrigin(0.5));
    this.paused = true;
    dim.once('pointerdown', () => {
      this.paused = false;
      c.destroy(true);
      App.meta.settings.showTutorial = false;
      App.saveNow();
    });
  }

  /** Bake the seasonal find overlay (a festive star) in the season's colours. */
  private makeSeasonTexture(season: SeasonDef): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const cx = TILE / 2;
    const cy = TILE / 2;
    g.fillStyle(season.find.glow, 0.2);
    g.fillCircle(cx, cy, TILE * 0.42);
    g.fillStyle(season.find.color, 1);
    const spikes = 5;
    const outer = TILE * 0.3;
    const inner = TILE * 0.13;
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (Math.PI * i) / spikes - Math.PI / 2;
      pts.push(new Phaser.Geom.Point(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
    }
    g.fillPoints(pts, true);
    g.fillStyle(0xffffff, 0.85);
    g.fillCircle(cx - 3, cy - 4, 2.5);
    g.generateTexture('sp_season', TILE, TILE);
    g.destroy();
  }

  // ---- surface decoration ----
  private drawSurface(): void {
    const g = this.add.graphics().setDepth(8);
    const groundY = SURFACE_ROW * TILE;
    const startCol = Math.floor(WORLD_WIDTH / 2);
    const building = (cx: number, w: number, h: number, color: number, label: string) => {
      const x = cx * TILE - w / 2;
      g.fillStyle(0x000000, 0.3);
      g.fillRect(x + 3, groundY - h + 3, w, h);
      g.fillStyle(color, 1);
      g.fillRect(x, groundY - h, w, h);
      g.fillStyle(0xffffff, 0.12);
      g.fillRect(x, groundY - h, w, 6);
      this.add
        .text(cx * TILE, groundY - h - 12, label, textStyle(11, COL.dim))
        .setOrigin(0.5)
        .setDepth(8);
    };
    building(startCol - 4, 56, 64, 0x3a5f4a, 'FUEL');
    building(startCol + 0.5, 70, 80, 0x4a3f6a, 'OUTPOST');
    building(startCol + 5, 56, 58, 0x5a4a3a, 'PROCESSOR');
    // horizon line
    g.fillStyle(0x000000, 0.25);
    g.fillRect(0, groundY - 2, WORLD_WIDTH * TILE, 4);
  }

  // ---- item quick bar (right side, touch + shows hotkeys) ----
  private buildItemBar(): void {
    const order = ITEMS.slice(0, 6);
    order.forEach((it, i) => {
      const y = 150 + i * 64;
      const cont = this.add.container(this.scale.width - 38, y).setScrollFactor(0).setDepth(1400);
      const g = this.add.graphics();
      g.fillStyle(COL.panel, 0.8);
      g.fillRoundedRect(-28, -26, 56, 52, 10);
      g.lineStyle(2, it.color, 0.9);
      g.strokeRoundedRect(-28, -26, 56, 52, 10);
      g.fillStyle(it.color, 1);
      g.fillCircle(0, -6, 9);
      const count = this.add.text(0, 10, '0', textStyle(13, COL.text)).setOrigin(0.5);
      const key = this.add.text(-20, -18, `${i + 1}`, textStyle(10, COL.faint)).setOrigin(0.5);
      cont.add([g, count, key]);
      cont.setSize(56, 52);
      cont.setInteractive(new Phaser.Geom.Rectangle(-28, -26, 56, 52), uiHit);
      cont.on('pointerdown', () => this.useItem(it.id));
      this.itemBar.push({ id: it.id, cont, count });
    });
  }

  private refreshItemBar(): void {
    for (const slot of this.itemBar) {
      const n = this.run.items[slot.id as ItemId] ?? 0;
      slot.count.setText(String(n));
      slot.cont.setAlpha(n > 0 ? 1 : 0.4);
    }
  }

  private recompute(): DerivedStats {
    this.stats = deriveStats(this.run);
    this.run.fuelMax = this.stats.fuelMax;
    this.run.hullMax = this.stats.hullMax;
    this.run.cargoMax = this.stats.cargoMax;
    this.run.fuel = Math.min(this.run.fuel, this.run.fuelMax);
    this.run.hull = Math.min(this.run.hull, this.run.hullMax);
    this.pod.setStats(this.stats);
    return this.stats;
  }

  // ---- main loop ----
  update(time: number, delta: number): void {
    if (this.ended) return;
    const dt = Math.min(delta / 1000, 1 / 30);

    if (this.paused || this.menu.isOpen) {
      Sound.setThrust(false);
      this.thrustOn = false;
      return;
    }

    // hit-stop: brief freeze on big impacts for weight (render only, no sim)
    if (time < this.hitStopUntil) {
      this.tiles.update();
      this.updateDarkness(dt);
      this.touch.draw();
      return;
    }

    this.run.elapsedMs += delta;
    const input = this.gatherInput();
    const status = this.pod.update(dt, input);

    // dynamic look-ahead: bias the view toward where you're going — down while digging
    // or falling, up while flying. (Positive followOffset.y shifts the view up.)
    const offTarget = status.digDir === 'down' || this.pod.vy > 150 ? -120 : this.pod.vy < -120 ? 56 : -16;
    const cam0 = this.cameras.main;
    cam0.followOffset.y += (offTarget - cam0.followOffset.y) * Math.min(1, dt * 2.2);

    // fuel drain
    let burn = FUEL.idleDrainPerSec;
    if (status.thrusting) burn += FUEL.thrustDrainPerSec;
    if (status.driving) burn += FUEL.drivePerSec;
    this.run.fuel = Math.max(0, this.run.fuel - burn * dt * this.stats.fuelEff);

    // thrust sound + fx
    if (status.thrusting !== this.thrustOn) {
      this.thrustOn = status.thrusting;
      Sound.setThrust(status.thrusting);
    }
    if (status.thrusting && Math.random() < 0.6) {
      this.fx.digBurst(this.pod.px, this.pod.py + TILE * 0.4, 0xffa030);
    }

    this.boulders.update(dt);
    this.updateHazards(dt);
    this.updateHeat(dt);
    this.updateDepth();

    this.tiles.update();
    this.updateBackground(dt);

    // surface / outpost
    const depth = this.world.depthMeters(Math.floor(this.pod.py / TILE));
    if (depth > 12) this.surfaceArmed = true;
    // open the outpost the moment you crest back to the surface (you fly up your own
    // shaft into open sky, so don't require landing on solid ground)
    if (this.surfaceArmed && depth <= 0 && this.pod.vy > -40) {
      this.openOutpost();
    }
    // show the manual OUTPOST prompt whenever resting on the surface
    const atSurface = depth <= 0 && this.pod.onGround && !this.menu.isOpen;
    this.outpostBtn?.setVisible(atSurface);
    this.outpostHint?.setVisible(atSurface);

    // HUD
    const haul = cargoValue(this.run, this.stats.sellMul);
    this.hud.update(this.run, this.stats, {
      depth,
      biomeName: biomeAt(depth).name,
      haulValue: haul,
    });
    this.refreshItemBar();

    // parallax drift + fade-in below the surface
    const cam = this.cameras.main;
    this.parallax.tilePositionX = cam.scrollX * 0.45;
    this.parallax.tilePositionY = cam.scrollY * 0.45;
    this.parallax.setAlpha(Phaser.Math.Clamp((depth - 2) / 50, 0, 0.85));

    this.updateDarkness(dt);
    this.touch.draw();

    // death checks
    if (this.run.hull <= 0) this.endRun('hull');
    else if (this.run.fuel <= 0 && depth > 1) this.endRun('fuel');
  }

  private gatherInput(): PodInput {
    let x = 0;
    let thrust = false;
    let down = false;
    const k = this.keys;
    if (k.LEFT.isDown || k.A.isDown) x -= 1;
    if (k.RIGHT.isDown || k.D.isDown) x += 1;
    if (k.UP.isDown || k.W.isDown || k.SPACE.isDown) thrust = true;
    if (k.DOWN.isDown || k.S.isDown) down = true;
    const t = this.touch.getInput();
    if (t.x !== 0) x = t.x;
    if (t.thrust) thrust = true;
    if (t.down) down = true;
    return { x: Phaser.Math.Clamp(x, -1, 1), thrust, down };
  }

  // ---- digging results ----
  private onDig(tx: number, ty: number, tile: Tile): void {
    this.run.fuel = Math.max(0, this.run.fuel - FUEL.digPerTile * this.stats.fuelEff);
    App.meta.stats.totalDug++;
    this.tiles.markDirty(tx, ty);
    this.boulders.poke();
    const biome = biomeAt(this.world.depthMeters(ty));
    const cxp = tx * TILE + TILE / 2;
    const cyp = ty * TILE + TILE / 2;
    const debrisColor = tile.ore
      ? ORE_BY_ID[tile.ore]?.color ?? biome.palette.dirt
      : tile.t === Terrain.Stone
        ? biome.palette.stone
        : tile.t === Terrain.HardStone
          ? biome.palette.hard
          : biome.palette.dirt;
    this.fx.digBurst(cxp, cyp, biome.palette.dirt);
    this.fx.debris(cxp, cyp, debrisColor);

    if (tile.special) {
      this.resolveSpecial(tile.special, tx, ty);
      return;
    }
    if (tile.ore) {
      const ore = ORE_BY_ID[tile.ore];
      if (!ore) return;
      const fit = addOre(this.run, tile.ore);
      const cx = tx * TILE + TILE / 2;
      const cy = ty * TILE + TILE / 2;
      if (fit) {
        this.fx.collect(cx, cy, ore.glow);
        Sound.collect(ore.tier);
        if (ore.tier >= 4) {
          this.hitStop(60);
          this.fx.popText(this.pod.px, this.pod.py - 30, ore.name.toUpperCase() + '!', ore.glow, 24);
          Sound.jackpot();
        } else if (ore.tier >= 2) {
          this.fx.floatText(cx, cy, '+' + ore.name, ore.glow, 14);
        }
      } else if (this.time.now - this.warnedFull > 1500) {
        this.warnedFull = this.time.now;
        this.fx.floatText(this.pod.px, this.pod.py - 30, 'CARGO FULL', COL.danger, 16);
        Sound.warn();
      }
    }
  }

  private resolveSpecial(special: string, tx: number, ty: number): void {
    const [kind, id] = special.split(':');
    const depth = this.world.depthMeters(ty);
    const cx = tx * TILE + TILE / 2;
    const cy = ty * TILE + TILE / 2;
    if (kind === 'geode') {
      // Easter egg: ~1-in-40 geodes are golden — an Aurelium jackpot moment.
      const golden = hash2(this.world.seed, tx, ty, 888) < 0.025;
      if (golden) {
        const aur = ORE_BY_ID['aurelium'];
        if (!addOre(this.run, 'aurelium')) {
          this.run.cash += aur.value;
          this.run.cashBanked += aur.value;
        }
        this.hitStop(90);
        this.fx.explosion(cx, cy, 0xffe14d);
        this.fx.explosion(cx, cy, 0xffffff);
        this.fx.popText(this.pod.px, this.pod.py - 34, '✦ GOLDEN GEODE — AURELIUM! ✦', 0xffe14d, 22);
        Sound.jackpot();
        Sound.milestone();
        return;
      }
      // crack into a random gem (deterministic by tile)
      const weights = ORES.map((o) => (o.tier >= 1 ? oreSpawnWeight(o, depth + 200) : 0));
      const idx = weightedIndex(hash2(this.world.seed, tx, ty, 909), weights);
      const ore = ORES[Math.max(0, idx)];
      const fit = addOre(this.run, ore.id);
      if (!fit) {
        this.run.cash += ore.value;
        this.run.cashBanked += ore.value;
      }
      this.fx.explosion(cx, cy, ore.glow);
      this.fx.popText(this.pod.px, this.pod.py - 30, 'GEODE → ' + ore.name, ore.glow, 20);
      Sound.jackpot();
    } else if (kind === 'fossil') {
      const f = FOSSILS.find((x) => x.id === id) ?? FOSSILS[0];
      if (!this.run.fossilsFound.includes(f.id)) this.run.fossilsFound.push(f.id);
      if (!App.meta.collection.fossils.includes(f.id)) App.meta.collection.fossils.push(f.id);
      this.fx.collect(cx, cy, 0xfff0c0);
      this.fx.popText(this.pod.px, this.pod.py - 30, 'FOSSIL: ' + f.name, 0xffe9b0, 20);
      Sound.milestone();
    } else if (kind === 'artifact') {
      const a = ARTIFACTS.find((x) => x.id === id) ?? ARTIFACTS[0];
      this.run.cash += a.value;
      this.run.cashBanked += a.value;
      if (!this.run.artifactsFound.includes(a.id)) this.run.artifactsFound.push(a.id);
      if (!App.meta.collection.artifacts.includes(a.id)) App.meta.collection.artifacts.push(a.id);
      this.fx.explosion(cx, cy, 0xeaddff);
      this.fx.popText(this.pod.px, this.pod.py - 30, a.name + '  +$' + a.value.toLocaleString(), 0xeaddff, 20);
      Sound.jackpot();
    } else if (kind === 'lockbox' || kind === 'cache') {
      const base = kind === 'cache' ? 8000 : 2500;
      const cash = Math.round(base * (1 + depth / 600) * (0.7 + hash2(this.world.seed, tx, ty, 71) * 0.6));
      this.run.cash += cash;
      this.run.cashBanked += cash;
      this.fx.explosion(cx, cy, 0xffd27a);
      this.fx.popText(this.pod.px, this.pod.py - 30, (kind === 'cache' ? 'CACHE' : 'LOCKBOX') + ' +$' + cash.toLocaleString(), 0xffd27a, 20);
      Sound.sell();
      // caches sometimes hold a tool
      if (kind === 'cache' && hash2(this.world.seed, tx, ty, 73) < 0.5) {
        const tool = hash2(this.world.seed, tx, ty, 75) < 0.5 ? 'nanobots' : 'reserveFuel';
        this.run.items[tool as ItemId] = (this.run.items[tool as ItemId] ?? 0) + 1;
      }
    } else if (kind === 'wreck') {
      const cash = Math.round(3000 * (1 + depth / 500) * (0.7 + hash2(this.world.seed, tx, ty, 81) * 0.6));
      this.run.cash += cash;
      this.run.cashBanked += cash;
      this.fx.explosion(cx, cy, 0xff6b8a);
      this.fx.popText(this.pod.px, this.pod.py - 30, 'LOST POD — salvage +$' + cash.toLocaleString(), 0xff9db0, 18);
      Sound.sell();
      const lines = [
        'This pod ran dry. Its pilot did not.',
        'The cargo bay is full. The cockpit is empty.',
        'Scratched into the hull: "DON\'T LOOK DOWN."',
        'Still warm. You don\'t think about why.',
      ];
      const line = lines[Math.floor(hash2(this.world.seed, tx, ty, 83) * lines.length)];
      this.showTransmission({ depth, from: 'SALVAGE', color: 0xff6b8a, text: line });
      const tool = hash2(this.world.seed, tx, ty, 85) < 0.5 ? 'reserveFuel' : 'nanobots';
      this.run.items[tool as ItemId] = (this.run.items[tool as ItemId] ?? 0) + 1;
    } else if (kind === 'goody') {
      // surprise goody box — randomised (deterministic per tile) delight
      const roll = hash2(this.world.seed, tx, ty, 201);
      const amt = hash2(this.world.seed, tx, ty, 203);
      const m = App.meta;
      let msg = '';
      let color = 0xffe14d;
      if (roll < 0.45) {
        const t = 3 + Math.floor(amt * 6);
        m.tickets += t;
        this.run.ticketsEarned += t;
        msg = `🎟 ${t} TICKETS!`;
      } else if (roll < 0.65) {
        const c = Math.round(2200 * (1 + depth / 500) * (0.7 + amt * 0.8));
        this.run.cash += c;
        this.run.cashBanked += c;
        msg = `+$${c.toLocaleString()}`;
        color = COL.cash;
      } else if (roll < 0.78) {
        this.run.fuel = this.run.fuelMax;
        msg = 'FUEL CACHE — FULL TANK';
        color = COL.fuel;
      } else if (roll < 0.88) {
        const it = ITEMS[Math.floor(amt * ITEMS.length)];
        this.run.items[it.id] = (this.run.items[it.id] ?? 0) + 1;
        msg = `+1 ${it.name.toUpperCase()}`;
        color = it.color;
      } else if (roll < 0.96) {
        const t = 10 + Math.floor(amt * 11);
        m.tickets += t;
        this.run.ticketsEarned += t;
        msg = `🎟 ${t} TICKETS!`;
      } else if (roll < 0.99) {
        m.cores += 1;
        msg = '◈ +1 CORE';
        color = COL.accent;
      } else {
        m.tickets += 50;
        this.run.ticketsEarned += 50;
        msg = '🎟 JACKPOT — 50 TICKETS!';
      }
      App.save();
      this.hitStop(70);
      this.fx.explosion(cx, cy, color);
      this.fx.popText(this.pod.px, this.pod.py - 34, 'GOODY BOX!  ' + msg, color, 20);
      Sound.jackpot();
      Sound.milestone();
    } else if (kind === 'season' && this.activeSeason) {
      const f = this.activeSeason.find;
      this.run.cash += f.cash;
      this.run.cashBanked += f.cash;
      const newly = awardSeasonPoints(this.run, this.activeSeason.id, f.points);
      this.fx.explosion(cx, cy, f.glow);
      this.fx.popText(this.pod.px, this.pod.py - 30, `${f.name}  +$${f.cash.toLocaleString()}  +${f.points}★`, f.glow, 20);
      Sound.jackpot();
      let yy = 70;
      for (const r of newly) {
        this.fx.popText(this.pod.px, this.pod.py - yy, 'SEASON UNLOCK: ' + r.name, this.activeSeason.accent, 17);
        yy += 30;
      }
    }
  }

  private onLand(speed: number): void {
    const dmg = (speed - 540) * 0.06;
    if (dmg > 1.5) {
      this.damageHull(dmg, 'hull');
      this.fx.digBurst(this.pod.px, this.pod.py + TILE * 0.4, 0x9a9a9a);
      this.fx.shake(Math.min(0.02, dmg * 0.002), 160);
    }
  }

  private damageHull(dmg: number, cause: DeathCause): void {
    if (this.ended) return;
    this.run.hull -= dmg;
    Sound.damage();
    this.cameras.main.flash(120, 120, 0, 0);
    if (this.run.hull <= 0) this.endRun(cause);
  }

  // ---- hazards ----
  private updateHazards(dt: number): void {
    const col = Math.floor(this.pod.px / TILE);
    const row = Math.floor(this.pod.py / TILE);
    const t = this.world.terrainAt(col, row);
    const resist = 1 - this.stats.heatResist / 100;
    if (t === Terrain.Lava) {
      this.run.hull -= HULL.lavaDamagePerSec * dt * resist;
      this.run.heat = Math.min(100, this.run.heat + HEAT.lavaContactHeat * dt);
      if (Math.random() < 0.25) this.fx.digBurst(this.pod.px, this.pod.py, 0xff7a2a);
      if (this.run.hull <= 0) this.endRun('lava');
    } else if (t === Terrain.Gas) {
      this.explodeGas(col, row, resist);
    }
  }

  private explodeGas(col: number, row: number, resist: number): void {
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (this.world.terrainAt(col + dx, row + dy) === Terrain.Gas) {
          this.world.clearTile(col + dx, row + dy);
          this.tiles.markDirty(col + dx, row + dy);
        }
      }
    this.fx.explosion(this.pod.px, this.pod.py, 0x6bff8a);
    this.hitStop(70);
    this.damageHull(HULL.gasExplosionDamage * resist, 'gas');
    Sound.explosion();
  }

  private updateHeat(dt: number): void {
    const depth = this.world.depthMeters(Math.floor(this.pod.py / TILE));
    const biome = biomeAt(depth);
    if (depth <= 1) {
      this.run.heat = Math.max(0, this.run.heat - HEAT.surfaceCoolPerSec * dt);
    } else if (biome.heatPressure > 0) {
      const gain = biome.heatPressure * 8.5 * (1 - (this.stats.heatResist / 100) * 0.85);
      this.run.heat = Math.min(100, this.run.heat + gain * dt);
    } else {
      const cool = HEAT.ambientCoolPerSec * (biome.heatPressure < 0 ? 1.8 : 1);
      this.run.heat = Math.max(0, this.run.heat - cool * dt);
    }
    if (this.run.heat >= 100) {
      this.run.hull -= HEAT.overheatDamagePerSec * dt;
      if (Math.random() < 0.1) this.cameras.main.flash(80, 120, 40, 0);
      if (this.run.hull <= 0) this.endRun('hull');
    }
  }

  private updateDepth(): void {
    const depth = this.world.depthMeters(Math.floor(this.pod.py / TILE));
    if (depth <= this.run.depthMax) return;
    this.run.depthMax = depth;

    // depth bounties
    for (const [d, reward] of ECON.depthBounties) {
      if (depth >= d && !this.run.bountiesClaimed.includes(d)) {
        this.run.bountiesClaimed.push(d);
        this.run.cash += reward;
        this.run.cashBanked += reward;
        this.fx.popText(this.pod.px, this.pod.py - 40, `${d}m DEPTH BONUS  +$${reward.toLocaleString()}`, COL.brand, 22);
        Sound.milestone();
      }
    }

    // biome-entry banner ("ENTERING: …")
    const bi = biomeIndexAt(depth);
    if (bi > this.lastBiomeBanner) {
      this.lastBiomeBanner = bi;
      this.showBiomeBanner(BIOMES[bi].name, BIOMES[bi].palette.accent);
    }

    // eerie transmissions
    const nx = nextTransmission(depth, this.run.transmissionIdx);
    if (nx) {
      this.run.transmissionIdx = nx.idx;
      this.showTransmission(nx.t);
    }

    // the Core finale
    if (!this.coreReached && depth >= BIOMES[BIOMES.length - 1].depthStart) {
      this.reachedCore();
    }
  }

  // ---- the journey: transmissions, biome banners, the Core ----
  private showBiomeBanner(name: string, color: number): void {
    const t1 = this.add.text(this.scale.width / 2, 300, 'ENTERING', textStyle(14, COL.dim)).setOrigin(0.5).setScrollFactor(0).setDepth(1250).setAlpha(0).setLetterSpacing(3);
    const t2 = this.add.text(this.scale.width / 2, 326, name.toUpperCase(), textStyle(30, color)).setOrigin(0.5).setScrollFactor(0).setDepth(1250).setAlpha(0);
    t2.setStroke('#000000', 5);
    for (const t of [t1, t2]) {
      this.tweens.add({ targets: t, alpha: 1, duration: 350, yoyo: true, hold: 1400, onComplete: () => t.destroy() });
    }
    Sound.milestone();
  }

  private showTransmission(t: Transmission): void {
    this.commsRoot?.destroy(true);
    const c = this.add.container(0, 0).setScrollFactor(0).setDepth(1280);
    const w = Math.min(this.scale.width - 60, 460);
    const x = (this.scale.width - w) / 2;
    const y = 150;
    const g = this.add.graphics();
    g.fillStyle(0x0a0a14, 0.92);
    g.fillRoundedRect(x, y, w, 88, 10);
    g.lineStyle(2, t.color, 0.9);
    g.strokeRoundedRect(x, y, w, 88, 10);
    g.fillStyle(t.color, 1);
    g.fillRoundedRect(x, y, 5, 88, 3);
    c.add(g);
    c.add(this.add.text(x + 18, y + 12, `◈ INCOMING — ${t.from}`, textStyle(12, t.color)).setLetterSpacing(1));
    const body = this.add.text(x + 18, y + 34, '', textStyle(15, COL.text, { wordWrap: { width: w - 36 }, lineSpacing: 3, fontStyle: 'italic' }));
    c.add(body);
    this.commsRoot = c;
    Sound.comms();

    // typewriter
    let i = 0;
    const timer = this.time.addEvent({
      delay: 22,
      repeat: t.text.length - 1,
      callback: () => {
        i++;
        body.setText(t.text.slice(0, i));
      },
    });
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 200 });
    this.time.delayedCall(5200, () => {
      timer.remove();
      if (this.commsRoot === c) this.commsRoot = undefined;
      this.tweens.add({ targets: c, alpha: 0, duration: 400, onComplete: () => c.destroy(true) });
    });
  }

  private reachedCore(): void {
    this.coreReached = true;
    const bonus = 250000;
    this.run.cash += bonus;
    this.run.cashBanked += bonus;
    if (!this.run.artifactsFound.includes('motherlode')) this.run.artifactsFound.push('motherlode');
    if (!App.meta.collection.artifacts.includes('motherlode')) App.meta.collection.artifacts.push('motherlode');
    if (!App.meta.achievements.includes('reached_core')) App.meta.achievements.push('reached_core');
    App.save();
    this.hitStop(140);
    this.cameras.main.flash(500, 255, 220, 120);
    this.fx.shake(0.02, 500);
    this.fx.explosion(this.pod.px, this.pod.py, 0xffe14d);
    const big = this.add.text(this.scale.width / 2, this.scale.height * 0.42, 'THE MOTHERLODE', title(40, COL.brand)).setOrigin(0.5).setScrollFactor(0).setDepth(1290).setAlpha(0);
    big.setStroke('#000000', 6);
    this.tweens.add({ targets: big, alpha: 1, scale: { from: 0.6, to: 1 }, duration: 500, ease: 'Back.out' });
    this.tweens.add({ targets: big, alpha: 0, delay: 2200, duration: 700, onComplete: () => big.destroy() });
    this.fx.popText(this.pod.px, this.pod.py - 50, '+$' + bonus.toLocaleString(), COL.brand, 22);
    Sound.jackpot();
    Sound.milestone();
  }

  private hitStop(ms: number): void {
    this.hitStopUntil = Math.max(this.hitStopUntil, this.time.now + ms);
  }

  /** Darkness + pod lamp + headlight + treasure glints (lamp widens with the Scanner). */
  private updateDarkness(dt: number): void {
    const cam = this.cameras.main;
    const depth = this.world.depthMeters(Math.floor(this.pod.py / TILE));
    const darkAmt = Phaser.Math.Clamp((depth - 25) / 1150, 0, 0.92);
    const lightR = (4.4 + this.stats.scannerRange * 0.7) * TILE;
    this.glintBuf.length = 0;
    if (darkAmt > 0.02) {
      this.tiles.getGlowCells(this.glowBuf);
      const litR2 = lightR * 0.85 * (lightR * 0.85); // already inside the lamp → no glint needed
      for (const g of this.glowBuf) {
        if (this.glintBuf.length >= 80) break;
        const dx = g.wx - this.pod.px;
        const dy = g.wy - this.pod.py;
        if (dx * dx + dy * dy < litR2) continue;
        this.glintBuf.push({
          sx: g.wx - cam.scrollX,
          sy: g.wy - cam.scrollY,
          kind: g.kind,
          phase: g.wx * 0.013 + g.wy * 0.029,
        });
      }
    }
    this.darkness.update(
      darkAmt,
      this.pod.px - cam.scrollX,
      this.pod.py - cam.scrollY,
      lightR,
      dt,
      this.pod.facing,
      this.glintBuf,
    );
  }

  private updateBackground(dt: number): void {
    const depth = this.world.depthMeters(Math.floor(this.pod.py / TILE));
    const active = depth <= 0 ? 0 : biomeIndexAt(depth) + 1;
    const sp = Math.min(1, dt * 3);
    for (let i = 0; i < this.bgImgs.length; i++) {
      const target = i === active ? 1 : 0;
      this.bgImgs[i].alpha += (target - this.bgImgs[i].alpha) * sp;
    }
    if (active !== this.lastAmbBiome) {
      this.lastAmbBiome = active;
      const bIdx = Math.max(0, active - 1);
      Sound.setAmbience(bIdx, BIOMES[bIdx].heatPressure > 0.5);
    }
  }

  // ---- items ----
  private useItem(id?: string): void {
    if (!id || this.paused || this.menu.isOpen || this.ended) return;
    if ((this.run.items[id as ItemId] ?? 0) <= 0) {
      Sound.warn();
      return;
    }
    const def = ITEMS.find((i) => i.id === id)!;
    const col = Math.floor(this.pod.px / TILE);
    const row = Math.floor(this.pod.py / TILE);
    let used = true;

    if (def.fuel) {
      this.run.fuel = Math.min(this.run.fuelMax, this.run.fuel + def.fuel);
      this.fx.popText(this.pod.px, this.pod.py - 30, '+FUEL', COL.fuel, 18);
    } else if (def.heal) {
      this.run.hull = Math.min(this.run.hullMax, this.run.hull + def.heal);
      this.fx.popText(this.pod.px, this.pod.py - 30, '+HULL', COL.hull, 18);
    } else if (def.blastRadius) {
      this.blast(col, row + 1, def.blastRadius);
    } else if (def.blinkUp) {
      this.teleportUp(def.blinkUp);
    } else if (def.toSurface) {
      this.pod.teleportTo(this.startPx, this.startPy);
      this.cameras.main.centerOn(this.pod.px, this.pod.py);
      this.fx.explosion(this.pod.px, this.pod.py, COL.accent);
    } else {
      used = false;
    }
    if (used) {
      this.run.items[id as ItemId] = (this.run.items[id as ItemId] ?? 0) - 1;
      Sound.click();
      this.refreshItemBar();
    }
  }

  private blast(col: number, row: number, radius: number): void {
    for (let dy = -radius; dy <= radius; dy++)
      for (let dx = -radius; dx <= radius; dx++) {
        const c = col + dx;
        const r = row + dy;
        const t = this.world.terrainAt(c, r);
        if (t === Terrain.Bedrock || t === Terrain.Sky) continue;
        const tile = this.world.getTile(c, r);
        if (tile.ore) addOre(this.run, tile.ore); // bonus: blasting frees ore
        this.world.clearTile(c, r);
        this.tiles.markDirty(c, r);
      }
    this.fx.explosion(col * TILE + TILE / 2, row * TILE + TILE / 2, COL.warn);
    Sound.explosion();
    this.boulders.poke();
  }

  private teleportUp(tiles: number): void {
    const col = Math.floor(this.pod.px / TILE);
    let row = Math.floor(this.pod.py / TILE);
    let best = row;
    for (let i = 1; i <= tiles + 4; i++) {
      const r = row - i;
      if (!this.world.solidAt(col, r) && !this.world.solidAt(col, r - 1)) {
        best = r;
        if (i >= tiles) break;
      }
    }
    this.pod.teleportTo((col + 0.5) * TILE, best * TILE + TILE / 2);
    this.cameras.main.centerOn(this.pod.px, this.pod.py);
    this.fx.explosion(this.pod.px, this.pod.py, COL.accent);
  }

  // ---- run suspend/resume ----
  private persistRun(): void {
    if (this.ended) return;
    this.run.overrides = this.world.serializeOverrides();
    void saveRun(this.run, this.pod.px, this.pod.py, this.activeSeason?.id ?? null);
  }

  // ---- outpost ----
  private openOutpost(): void {
    this.surfaceArmed = false;
    Sound.setThrust(false);
    this.menu.open();
    this.persistRun();
    App.saveNow();
  }

  // ---- pause ----
  private togglePause(): void {
    if (this.ended) return;
    if (this.menu.isOpen) {
      this.menu.close(); // ESC backs out of the outpost
      return;
    }
    if (this.paused) {
      this.paused = false;
      this.pauseRoot?.destroy(true);
      this.pauseRoot = undefined;
      return;
    }
    this.paused = true;
    Sound.setThrust(false);
    this.persistRun();
    const c = this.add.container(0, 0).setScrollFactor(0).setDepth(2500);
    const W = this.scale.width;
    const H = this.scale.height;
    const dim = this.add
      .rectangle(0, 0, W, H, 0x05050a, 0.8)
      .setOrigin(0)
      .setInteractive(new Phaser.Geom.Rectangle(0, 0, 1, 1), swallowHit);
    c.add(dim);
    c.add(this.add.text(W / 2, H / 2 - 120, 'PAUSED', textStyle(40, COL.brand)).setOrigin(0.5));
    c.add(new Button(this, W / 2, H / 2 - 20, 260, 56, 'RESUME', () => this.togglePause(), { fill: COL.brand, textColor: 0x1a1400, fixed: true }));
    c.add(new Button(this, W / 2, H / 2 + 56, 260, 50, 'ABANDON RUN', () => this.endRun('quit'), { accent: COL.danger, fixed: true }));
    this.pauseRoot = c;
  }

  // ---- end ----
  private endRun(cause: DeathCause): void {
    if (this.ended) return;
    this.ended = true;
    Sound.setThrust(false);
    void clearRun(); // the run is over — drop any suspend state
    if (cause !== 'quit') {
      Sound.explosion();
      this.fx.explosion(this.pod.px, this.pod.py, COL.warn);
      this.pod.sprite.setVisible(false);
    }

    const score = computeScore(this.run);
    const m = App.meta;
    m.runsPlayed++;
    m.totalCash += this.run.cashBanked;
    m.stats.totalDepth += this.run.depthMax;
    if (cause !== 'quit' && cause !== 'victory') m.stats.deaths++;
    if (this.run.cashBanked > m.stats.bestCashRun) m.stats.bestCashRun = this.run.cashBanked;
    if (score.total > m.bestScore) m.bestScore = score.total;
    if (this.run.depthMax > m.bestDepth) m.bestDepth = this.run.depthMax;
    const coresEarned =
      Math.floor(score.total / 50000) + Math.floor(this.run.depthMax / 400);
    m.cores += coresEarned;

    // comeback systems: daily streak (real runs only) + auto-claim completed goals
    const streak =
      this.run.depthMax >= 10 ? tickStreak() : { count: m.streak.count, ticketsAwarded: 0 };
    const goals = claimCompletedGoals();
    App.saveNow();

    this.pauseRoot?.destroy(true);
    // Phaser ignores fadeOut while another fade is mid-flight (e.g. the spawn fadeIn on an
    // instant death) and the completion event never fires — reset first, and keep a failsafe
    // timer so the death screen can never soft-lock.
    let started = false;
    const go = () => {
      if (started) return;
      started = true;
      this.scene.start('GameOver', { run: this.run, score, cause, coresEarned, streak, goals });
    };
    this.cameras.main.fadeEffect.reset();
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', go);
    this.time.delayedCall(700, go);
  }

  /** Reposition screen-anchored UI when the window resizes (RESIZE mode). */
  private relayout(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    for (const img of this.bgImgs) img.setDisplaySize(w, h).setPosition(0, 0);
    this.parallax?.setSize(w, h);
    for (let i = 0; i < this.itemBar.length; i++) this.itemBar[i].cont.setPosition(w - 38, 150 + i * 64);
    this.outpostBtn?.setPosition(w / 2, 134);
    this.outpostHint?.setPosition(w / 2, 168);
    this.hud?.relayout();
    this.darkness?.resize();
  }

  private cleanup(): void {
    Sound.setThrust(false);
    Sound.stopAmbience();
    if (this.onHidden) this.game.events.off('hidden', this.onHidden);
    if (this.onResize) this.scale.off('resize', this.onResize);
    this.tiles?.destroy();
    this.boulders?.destroy();
    this.touch?.destroy();
    this.menu?.destroy();
    this.darkness?.destroy();
  }
}
