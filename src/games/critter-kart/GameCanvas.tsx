// @ts-nocheck
import { useEffect, useRef, type RefObject } from 'react';
import { useMultiplayerSync } from './game/multiplayer/context';
import * as THREE from 'three';
import { createGLTFLoader } from './game/render/loader';
import { createScene, PREMIUM_RENDER } from './game/render/scene';
import { archHeightAt } from './game/render/proceduralBridge';
import { makeTrainTrackGeometry, makeEngineGeometry, makeTenderGeometry, makeWagonGeometry, trainMaterial } from './game/render/proceduralTrain';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createTrackDressing } from './game/render/dressing';
import { createTrackStructures, UPPER_DECK_INNER } from './game/render/trackStructures';
import { WATER_Y } from './game/render/scene';
import { makeSplash, type Splash } from './game/render/splash';
import { Kart, ROSTER, type Racer } from './game/entities/Kart';
import { updateChaseCamera, placeChaseCamera } from './game/render/chaseCamera';
import { createKeyboard } from './game/input/keyboard';
import { stepKart, KartState, driftTier } from './game/logic/kartPhysics';
import { rampSteer } from './game/logic/steering';
import { TrackPath } from './game/logic/trackPath';
import { initLap, updateLap, currentLap, isFinished, LapState } from './game/logic/lap';
import { type BotParams } from './game/logic/ai';
import { resolveKartCollision, resolveObstacles, KART_RADIUS } from './game/logic/collision';
import { buildBarriers, resolveBarriers, BARRIER_OFFSET, BARRIER_HALF_DEPTH } from './game/logic/barrier';
import { positionOf, rankRacers, RacerProgress } from './game/logic/standings';
import { applyHit, rollCategoryItem, CATEGORY, ITEM, NO_ITEM } from './game/logic/items';
import { makeCategoryBalloon, makeProjectile, makeTrap, makeShield, makeStormCloud, makeLightning, disposeObject } from './game/render/itemVisuals';
import { buildBoostPads, padContains } from './game/render/boostPads';
import { SUNNY_MEADOW } from './game/tracks/sunnyMeadow';
import { TUNING } from './game/config/tuning';
import { prepareRace, playRace, stopRace, playCountdownBeep } from './audio';
import type { HudState } from './ui/hud';
import type { ResultRow } from './ui/data';

const FIXED = 1 / 60;
const COUNTDOWN = 3;
const NUM = 6; // full grid — player + 5 bots (all six characters race)
const PLAYER = 0;
const ITEM_BOX_ROWS = [0.12, 0.3, 0.48, 0.66, 0.84];
const ITEM_BOX_LAT = [-8, 0, 8];

/** Each bot is a distinct rival — different racing line, cornering style, top speed and
 *  item timing — so it feels like racing five different real people. Assigned to grid slots
 *  1..5 (slot 0 is the player).
 *
 *  DESIGN (post-playtest): every bot has the SAME top speed as the player (TUNING.maxSpeed = 45)
 *  — none are slower, none out-drag you. The whole field is dead-even on pace; the difference
 *  between them is purely STYLE (line, cornering, grip, item timing). Catch-up only ever speeds
 *  a trailing bot UP toward the leader (never below player pace), keeping the pack bunched for a
 *  genuine podium scrap decided by driving + items, not by raw speed. */
interface BotPersona {
  params: Partial<BotParams>; // cornering/line (NOT speedCap — top speed is set via maxSpeed)
  maxSpeed: number; // the bot's top speed — same as the player (TUNING.maxSpeed) for every bot.
  grip: { gripBase: number; gripAtTopSpeed: number }; // higher = holds corners better (fewer slides off-line)
  useDelay: number; // seconds after grabbing a balloon before it fires the item
  catchup: number;  // how hard its top speed ramps up when it's BEHIND (rubber-band; never below base)
}
const BOT_PERSONAS: BotPersona[] = [
  // FULL straight-line speed (56, same as you), but they now BRAKE PROPERLY for corners so they
  // stop running wide into the barriers at the higher speed (that's what was costing them 60-80s a
  // race). High grip holds a clean line; strong catch-up keeps them on your tail. Racing lines stay
  // centre/right (lineOffset ≥ -1) so none of them grind the left-side upper-deck wall on the bridge.
  // Blaze — front-runner: tight line, snap item use.
  { params: { cornerSlow: 0.62, minCornerFrac: 0.56, steerGain: 3.3, lineOffset: -1, lookahead: 0.04 }, maxSpeed: 56, grip: { gripBase: 0.9, gripAtTopSpeed: 0.8 }, useDelay: 0.2, catchup: 1.7 },
  // Ace — cornering specialist: smoothest line, grippiest, carries the cleanest corner speed.
  { params: { cornerSlow: 0.6, minCornerFrac: 0.58, steerGain: 3.5, lineOffset: 0, lookahead: 0.044 }, maxSpeed: 56, grip: { gripBase: 0.94, gripAtTopSpeed: 0.84 }, useDelay: 0.3, catchup: 1.9 },
  // Dash — relentless all-rounder: wide line, ferocious catch-up so it never gives up.
  { params: { cornerSlow: 0.68, minCornerFrac: 0.52, steerGain: 3.1, lineOffset: 5, lookahead: 0.042 }, maxSpeed: 56, grip: { gripBase: 0.9, gripAtTopSpeed: 0.8 }, useDelay: 0.4, catchup: 2.3 },
  // Nimble — light & tidy: rarely makes a mistake, brakes early.
  { params: { cornerSlow: 0.64, minCornerFrac: 0.56, steerGain: 3.4, lineOffset: 2, lookahead: 0.044 }, maxSpeed: 56, grip: { gripBase: 0.93, gripAtTopSpeed: 0.82 }, useDelay: 0.3, catchup: 2.0 },
  // Tank — heavy & deliberate: wider line, hangs on with relentless catch-up.
  { params: { cornerSlow: 0.68, minCornerFrac: 0.52, steerGain: 3.0, lineOffset: 8, lookahead: 0.046 }, maxSpeed: 56, grip: { gripBase: 0.9, gripAtTopSpeed: 0.8 }, useDelay: 0.45, catchup: 2.3 },
];
// (Bots are rail-driven now — see the RAIL BOTS block in the loop — so they no longer use a
// per-persona physics tuning. The personas' catchup + lineOffset still drive their rail behaviour.)

export interface GameHud {
  timeRef: RefObject<HTMLDivElement>;
  boostRef: RefObject<HTMLDivElement>;
  miniRef: RefObject<HTMLCanvasElement>;
  onState: (s: HudState) => void;
}

type Projectile = { mesh: THREE.Object3D; x: number; z: number; y: number; vy: number; heading: number; speed: number; kind: 'acorn' | 'bee'; owner: number; life: number; target: number };
type Trap = { mesh: THREE.Object3D; x: number; z: number; owner: number; age: number };
type ItemBox = { x: number; z: number; category: number; mesh: THREE.Object3D; respawnAt: number };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');
function fmt(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toFixed(2).padStart(5, '0')}`;
}
function angleLerp(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return a + d * t;
}

export default function GameCanvas({ racerId, hud, onFinish }: { racerId: string; hud: GameHud; onFinish: (r: ResultRow[]) => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  // Session 2c/2d: when MultiplayerProvider wraps this component (set by
  // MultiplayerLayer once a race is matched), `multi` returns the sync
  // helpers. When solo, it returns null and the rAF loop runs Fish's
  // local physics for all karts unchanged.
  const multi = useMultiplayerSync();
  const multiRef = useRef(multi);
  multiRef.current = multi;

  useEffect(() => {
    const mount = mountRef.current!;
    // V2 PLAYER refactor (2026-06-06): in multiplayer, the local user's
    // kart sits at whatever slot the server assigned to this client
    // (0 for host, 1 for first joiner, etc.). In solo mode `multi` is
    // null → PLAYER stays 0 → Fish's original code path is byte-identical.
    //
    // This single `const PLAYER` shadows the module-level constant at
    // line 37 for every reference inside this useEffect (~46 sites).
    // Each site means "the player's kart" semantically — none of them
    // mean "slot 0 specifically because of grid layout" (audited 2026-
    // 06-06). So the shadow is sufficient; no per-site changes needed.
    //
    // selfSlot is fixed for the duration of a race, so capturing it
    // once at effect-mount is correct.
    const PLAYER = multi?.selfSlot ?? 0;
    // BOT_PERSONAS has NUM-1 entries (5 personas for 5 non-player slots).
    // Fish's solo code did `BOT_PERSONAS[i - 1]` everywhere, assuming
    // i >= 1 because PLAYER was always 0. With dynamic PLAYER, a
    // non-player slot can be at i=0 (when PLAYER > 0), and
    // BOT_PERSONAS[0 - 1] = BOT_PERSONAS[-1] = undefined → crash on
    // any property access (.useDelay etc). Map non-player slot indices
    // [0..PLAYER-1, PLAYER+1..NUM-1] onto persona indices [0..NUM-2]:
    const botPersonaForSlot = (i: number) => i < PLAYER ? i : i - 1;
    // Dev diagnostics (FPS log, race breakdown, collision/progress probes, P/B debug keys) are OFF
    // by default for a clean console at launch — append ?debug to the URL to switch them back on.
    const DEBUG = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1)); // render at 1x — biggest fill-rate win on hi-DPI/integrated GPUs
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    if (PREMIUM_RENDER) {
      // Filmic tone mapping + soft shadows turn the flat look into a lit, depthful one.
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    mount.appendChild(renderer.domElement);

    const track = new TrackPath(SUNNY_MEADOW);
    const barriers = buildBarriers(track); // exact objects the karts collide against (also rendered)
    // Upper-deck channel wall: ONLY the OUTER edge (the far/left side), and ONLY along the entry +
    // flat sections (not the descent — so nothing is rubbed coming down, which was the "drag"). The
    // INNER edge (toward the road) is deliberately open — you can drop back down off the deck if you
    // misjudge the line. The outer wall keeps you from flying off the far side.
    if (track.upperDeckZone) {
      const ud = track.upperDeckZone;
      const STEP = 5; // ~one barrier length between segments
      const wallEnd = ud.rampDownStart; // stop before the descent so nothing is rubbed coming down
      const segs = Math.max(2, Math.round(((wallEnd - ud.startProgress) * track.totalLength) / STEP));
      for (let s = 0; s <= segs; s++) {
        const p = ud.startProgress + (s / segs) * (wallEnd - ud.startProgress);
        const a = track.pointAtProgress(p);
        const b = track.pointAtProgress(Math.min(1, p + 0.002));
        let tx = b.x - a.x, tz = b.z - a.z;
        const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
        const nx = tz, nz = -tx; // perp (matches the deck mesh + Y-pin convention)
        barriers.push({ x: a.x + nx * ud.side * track.halfWidth, z: a.z + nz * ud.side * track.halfWidth, tx, tz });
      }
    }
    // Flat-bridge RIGHT wall: a solid rail down the right edge so you can't drive off that side
    // (matches the rendered right railing). The LEFT is left open — drive off it and you drop.
    const BRIDGE_EDGE = track.halfWidth + 3.5; // bridge is hw*2+8 wide → rail sits ~here
    if (track.bridgeZone) {
      const bz = track.bridgeZone;
      const segs = Math.max(2, Math.round(((bz.endProgress - bz.startProgress) * track.totalLength) / 5));
      for (let s = 0; s <= segs; s++) {
        const p = bz.startProgress + (s / segs) * (bz.endProgress - bz.startProgress);
        const a = track.pointAtProgress(p);
        const b = track.pointAtProgress(Math.min(1, p + 0.002));
        let tx = b.x - a.x, tz = b.z - a.z;
        const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
        const nx = tz, nz = -tx; // +perp = RIGHT (matches the rendered rail side)
        barriers.push({ x: a.x + nx * BRIDGE_EDGE, z: a.z + nz * BRIDGE_EDGE, tx, tz });
      }
    }
    const { scene, sun } = createScene(track);
    // Image-based lighting: a neutral indoor-studio env map gives the PBR karts/props soft,
    // realistic reflections + ambient — the single cheapest "premium" upgrade. Generated once.
    let pmrem: THREE.PMREMGenerator | null = null;
    if (PREMIUM_RENDER) {
      pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    }
    const camera = new THREE.PerspectiveCamera(72, mount.clientWidth / mount.clientHeight, 0.1, 3000);

    prepareRace(); // pick + buffer the race track during the countdown so GO is instant

    // Single LoadingManager shared across every GLB the race needs (track structures,
    // dressing, karts, characters). onLoad fires when the active load count hits zero — i.e. when
    // the world is fully ready — and that flips the countdown gate below. Some loaders chain — a
    // kart's base GLB completes,
    // then its character GLB is loaded inside the callback — which means onLoad can
    // fire prematurely between those steps. We debounce: wait 250 ms after onLoad with
    // no new onStart, then declare ready. Any onStart in between cancels the timer
    // and re-flips the loading flag.
    const loadingManager = new THREE.LoadingManager();
    let assetsReady = false;
    let warmedUp = false; // the heavy shader-compile + warm-render pass runs ONCE
    let readyTimer: number | null = null;
    loadingManager.onStart = () => {
      if (readyTimer !== null) { clearTimeout(readyTimer); readyTimer = null; }
      // Only hold the countdown for the FIRST load batch. Once we've warmed up, a late chained load
      // (e.g. a kart's character GLB) must NOT re-pause the countdown — that was causing a freeze
      // mid 3-2-1 while a second warm-up blocked the main thread.
      if (!warmedUp) assetsReady = false;
    };
    // Pre-compile every material's shader (and warm GPU uploads) before the race starts, so we
    // don't get first-view hitches as new props/structures come into view on the opening lap.
    const ready = () => {
      readyTimer = null;
      if (!warmedUp) {
        try {
          // Prime culling at the start line so near props upload, compile every shader, then render
          // a couple of warm frames (incl. the shadow pass) so textures/geometry/shadow map are all
          // GPU-resident BEFORE the countdown reveals the scene. Runs ONCE (heavy, blocks the main
          // thread for a beat — fine while we're still holding on "3", but it must never re-run
          // mid-countdown or it freezes the count).
          const p0 = states[PLAYER];
          if (p0) {
            dressing.updateCulling(p0.x, p0.z);
            for (const child of structures.group.children) child.visible = true;
          }
          renderer.compile(scene, camera);
          renderer.render(scene, camera);
          renderer.render(scene, camera);
        } catch { /* non-fatal */ }
        warmedUp = true;
      }
      assetsReady = true;
      // Signal to the server that THIS client has finished loading.
      // Server's lobby:start handler is waiting for every human to
      // emit critterkart:ready before it locks startAtMs and kicks
      // off the countdown — without this, the 15s fallback timer
      // would fire instead and joiners with slower loads would
      // join the race already-in-progress (the desync JJ saw).
      if (multi && (multi as any).signalReady) {
        const tgId = (multi.members as any[])?.find(
          (m: any) => (m.slot ?? -1) === multi.selfSlot,
        )?.telegramUserId;
        if (tgId) {
          (multi as any).signalReady(tgId);
          console.log('[critter-kart/diag] emitted critterkart:ready', { tgId, selfSlot: multi.selfSlot });
        } else {
          console.warn('[critter-kart/diag] cannot emit critterkart:ready — no telegramUserId for selfSlot', multi.selfSlot);
        }
      }
    };
    loadingManager.onLoad = () => {
      if (readyTimer !== null) clearTimeout(readyTimer);
      readyTimer = window.setTimeout(ready, warmedUp ? 0 : 350);
    };
    loadingManager.onError = (url) => {
      console.error('[LoadingManager] failed:', url);
      // Don't hang the loading screen on a 404 — let the race start with the asset missing.
      if (readyTimer !== null) clearTimeout(readyTimer);
      readyTimer = window.setTimeout(ready, warmedUp ? 0 : 350);
    };
    // Real load fraction for the loading bar. Kept monotonic (max) because the manager's
    // total grows as more loads are queued, which would otherwise make the bar jump back.
    let loadProgress = 0;
    loadingManager.onProgress = (_url, loaded, total) => {
      if (total > 0) loadProgress = Math.max(loadProgress, loaded / total);
    };

    const loader = createGLTFLoader(loadingManager);
    const dressing = createTrackDressing(track, loader);
    scene.add(dressing.group);
    const propObstacles = dressing.obstacles; // grows as models load; read each frame
    // Track structures (bridge) — currently a no-op stub. Empty group added to the scene
    // so we keep the wire-up for when the bridge comes back over the lake.
    const structures = createTrackStructures(track, loader);
    scene.add(structures.group);

    // Active splash effects — per-frame the loop ticks each and removes expired ones.
    const splashes: Splash[] = [];

    // Ground boost pads — chevron arrows painted on the road that pump turbo into the
    // kart when driven over. Two of them, deterministically placed away from the bridge.
    const { pads: boostPads, meshes: boostPadMeshes } = buildBoostPads(track, NUM, 1, 3);
    for (const mesh of boostPadMeshes) scene.add(mesh);

    // --- TRAIN: its own continuous loop that crosses the race road at two spots (0.395, 0.769).
    // The loop runs from crossing A out into the meadow to crossing B, then back through the
    // infield to A — so the train circles the map and only meets the race road at the crossings.
    const TRAIN_PERIOD = 26; // seconds for a full lap of the train loop → ~13s between crossings
    const trainA = track.pointAtProgress(0.395);
    const trainB = track.pointAtProgress(0.769);
    let _tcx = 0, _tcz = 0;
    for (const p of track.points) { _tcx += p.x; _tcz += p.z; }
    _tcx /= track.points.length; _tcz /= track.points.length;
    const tmx = (trainA.x + trainB.x) / 2, tmz = (trainA.z + trainB.z) / 2;
    let tdx = _tcx - tmx, tdz = _tcz - tmz; // toward the track centroid (infield)
    const tdl = Math.hypot(tdx, tdz) || 1; tdx /= tdl; tdz /= tdl;
    const trainPath = new TrackPath({
      name: 'train',
      halfWidth: 4, laps: 1, samplesPerSegment: 20,
      control: [
        trainA,
        { x: tmx - tdx * 240, z: tmz - tdz * 240 }, // big sweep out into the outfield
        trainB,
        { x: tmx + tdx * 60, z: tmz + tdz * 60 },   // back through the infield
      ],
    });
    const trainMat = trainMaterial(); // one shared material for the rails + all rolling stock
    scene.add(new THREE.Mesh(makeTrainTrackGeometry(trainPath.points), trainMat));
    // TWO trains run the same loop at opposite ends (half a lap apart), so crossings come up about
    // twice as often WITHOUT speeding anything up. Geometry is built once and shared between both
    // sets of meshes. Each set is engine + tender + 2 carriages.
    const engineGeo = makeEngineGeometry(), tenderGeo = makeTenderGeometry();
    const wagonGeoA = makeWagonGeometry(0xf0e4c8), wagonGeoB = makeWagonGeometry(0x4f9e3a);
    const makeTrainSet = () => {
      const pieces = [
        new THREE.Mesh(engineGeo, trainMat), new THREE.Mesh(tenderGeo, trainMat),
        new THREE.Mesh(wagonGeoA, trainMat), new THREE.Mesh(wagonGeoB, trainMat),
      ];
      for (const m of pieces) { m.receiveShadow = true; scene.add(m); }
      return pieces;
    };
    const trains = [
      { pieces: makeTrainSet(), phaseOffset: 0 },    // train A
      { pieces: makeTrainSet(), phaseOffset: 0.5 },  // train B — exact opposite side of the loop
    ];
    // Distance (progress) of each piece BEHIND the engine, from real coupling lengths.
    const PIECE_LEN = [12, 7, 8, 8], COUPLE = 1.5;
    const CAR_OFFSET = PIECE_LEN.map((_, i) => {
      let d = 0;
      for (let j = 1; j <= i; j++) d += PIECE_LEN[j - 1] / 2 + COUPLE + PIECE_LEN[j] / 2;
      return d / trainPath.totalLength;
    });
    // Phase the train so the engine reaches crossing A (race progress 0.395 == trainPath 0) right
    // about when the player first gets there: estimate arrival from track length + top speed
    // (standing start + a couple of corners → ~0.72 of top speed average). Derived from `elapsed`
    // each frame (not accumulated), so timing is identical every race AND can't drift while the
    // loading screen holds the countdown. Higher chance the player meets the train on lap 1.
    const T_TO_CROSSING_A = (0.395 * track.totalLength) / (TUNING.maxSpeed * 0.72);
    const TRAIN_PHASE = -T_TO_CROSSING_A;

    // DEBUG: press B in-race to draw a magenta dot on every barrier the physics uses.
    // These dots should sit exactly on the visible red/white barriers — if a barrier
    // ever looks like it's in the road, a dot will be there too (or absent), telling us
    // whether it's a placement bug vs a collision bug.
    const debugWall = new THREE.Group();
    debugWall.visible = false;
    {
      const mat = new THREE.PointsMaterial({ color: 0xff00ff, size: 3 });
      const verts: number[] = [];
      for (const b of barriers) verts.push(b.x, 1.5, b.z);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      debugWall.add(new THREE.Points(g, mat));
    }
    scene.add(debugWall);
    const onDebugKey = (e: KeyboardEvent) => {
      if (!DEBUG) return; // P/B debug keys only active with ?debug
      if (e.key === 'b' || e.key === 'B') debugWall.visible = !debugWall.visible;
      // Press P to print the player's current lap progress (0..1) — used to pick spots for
      // placing track structures like the tunnel.
      if (e.key === 'p' || e.key === 'P') {
        console.clear(); // wipe any noise so the value is the only thing on screen
        console.log('%c[CK progress] ' + track.nearest(states[PLAYER].x, states[PLAYER].z).progress.toFixed(3), 'font-size:18px;font-weight:bold;color:#ffb300');
      }
    };
    window.addEventListener('keydown', onDebugKey);

    // V2 (2026-06-06): in multiplayer the server assigns each slot a
    // racerId (via members[].racerId on race:start). Honour that so
    // EVERY client sees the same characters at the same slots — without
    // this, non-host clients render Peralta as Pip and JJ as Bruno
    // because Fish's solo construction puts the chosen racer at slot 0
    // and cycles bots through the remaining slots. In solo, multi is
    // null → falls through to Fish's original construction.
    //
    // Must end up with exactly NUM gridRacers or the per-frame loop
    // dereferences gridRacers[undefined].
    let gridRacers: Racer[];
    if (multi?.members && multi.members.length === NUM) {
      gridRacers = multi.members.map((m: any) =>
        ROSTER.find(r => r.id === m.racerId) || ROSTER[0]
      );
    } else {
      // Solo path — Fish's original logic, untouched.
      const chosen = Math.max(0, ROSTER.findIndex((r) => r.id === racerId));
      const botPool = ROSTER.filter((_, i) => i !== chosen);
      gridRacers = [ROSTER[chosen], ...botPool.slice(0, NUM - 1)];
    }
    const WEIGHTS = gridRacers.map((r) => r.weight);
    const karts = gridRacers.map((r, i) => new Kart(r, loader, i === PLAYER)); // only the player casts a shadow (cheap, invisible diff)
    karts.forEach((k) => scene.add(k.mesh));

    const shieldRings = Array.from({ length: NUM }, () => {
      const r = makeShield();
      scene.add(r);
      return r;
    });
    const stormClouds = Array.from({ length: NUM }, () => {
      const c = makeStormCloud();
      scene.add(c);
      return c;
    });
    const lightning = Array.from({ length: NUM }, () => {
      const l = makeLightning();
      scene.add(l);
      return l;
    });
    const prevSlow = new Array(NUM).fill(false); // to detect the frame a storm slow begins
    const lightningTimer = new Array(NUM).fill(0); // seconds the strike stays visible
    const prevStun = new Array(NUM).fill(false); // to detect the frame a spin-out hit lands
    const lastSafe: Array<{ x: number; z: number; heading: number; speed: number } | null> = new Array(NUM).fill(null);
    const wasOnRamp = new Array(NUM).fill(false); // detects the frame a kart leaves the top of the ramp → triggers launch impulse
    const hopTimer = new Array(NUM).fill(0); // seconds left in the knock-up hop
    const flattenUntil = new Array(NUM).fill(0); // elapsed time a train-flattened kart stays squashed before respawning
    const onUpperDeck = new Array(NUM).fill(false); // committed to the optional raised deck this pass
    // RAIL BOTS: bots drive kinematically along the racing line — they advance by progress at a
    // speed pinned to the player's pace, so they can't leave the track, get stuck, or be out-dragged.
    const botProg = new Array(NUM).fill(0);  // continuous progress along the lap (laps + fraction)
    const botLat = new Array(NUM).fill(0);   // fixed racing-line lateral offset (their "line")
    const botSpeed = new Array(NUM).fill(0); // current rail speed (eased for smooth starts/stops)
    // --- DIAGNOSTICS: tally where each racer loses time so a single race reveals the real culprit ---
    const diagTrainHits = new Array(NUM).fill(0);   // times flattened by a train
    const diagRespawns = new Array(NUM).fill(0);    // anti-stuck Lakitu respawns
    const diagCrawl = new Array(NUM).fill(0);       // seconds spent at <6 u/s while racing (stuck/slow)
    const diagOffRoad = new Array(NUM).fill(0);     // seconds spent off the track while racing

    const pointAndPerp = (prog: number) => {
      const a = track.pointAtProgress(prog);
      const b = track.pointAtProgress(prog + 0.01);
      let tx = b.x - a.x;
      let tz = b.z - a.z;
      const l = Math.hypot(tx, tz) || 1;
      return { x: a.x, z: a.z, px: tz / l, pz: -tx / l };
    };
    const itemBoxes: ItemBox[] = [];
    // The three lanes are fixed categories so you can choose: left = ATTACK (red), centre = SPEED
    // (blue), right = DEFENCE (yellow). The exact item is still rolled (by position) on pickup.
    const LANE_CATEGORY = [CATEGORY.ATTACK, CATEGORY.SPEED, CATEGORY.DEFENSE];
    for (const prog of ITEM_BOX_ROWS) {
      const pp = pointAndPerp(prog);
      ITEM_BOX_LAT.forEach((lat, laneIdx) => {
        const category = LANE_CATEGORY[laneIdx];
        const mesh = makeCategoryBalloon(category);
        mesh.position.set(pp.x + pp.px * lat, 5, pp.z + pp.pz * lat);
        mesh.rotation.y = Math.atan2(pp.pz, -pp.px); // emblem faces back down the track toward oncoming karts
        scene.add(mesh);
        itemBoxes.push({ x: mesh.position.x, z: mesh.position.z, category, mesh, respawnAt: 0 });
      });
    }

    let states: KartState[] = [];
    let prevStates: KartState[] = []; // physics state one step back — used to interpolate the render pose
    let laps: LapState[] = [];
    let heldItems: number[] = [];
    let heldCount: number[] = []; // shots remaining for the held item (Acorn = triple, others = 1)
    let botUseAt: number[] = [];
    let finishTimes: number[] = [];
    let projectiles: Projectile[] = [];
    let traps: Trap[] = [];
    // Multiplayer: server-authoritative projectile/trap meshes keyed by the
    // server's entity id, so we can spawn/move/despawn to match each snapshot.
    const mpProjMeshes = new Map<number, THREE.Object3D>();
    const mpTrapMeshes = new Map<number, THREE.Object3D>();
    let elapsed = -COUNTDOWN;
    let phaseLocal: 'countdown' | 'racing' | 'finished' = 'countdown';
    let steer = 0;
    let prevUse = false;
    let mpLastTick = -1, mpLastTickAt = 0, netStalled = false; // MP snapshot-health tracker
    // Local-position history (race-time keyed) for latency-compensated drift:
    // a snapshot describes the server ~RTT/2 ago, so it must be compared against
    // where the LOCAL kart was at that same race-time, not where it is now.
    const localTrail: { t: number; x: number; z: number }[] = [];
    // Reconciliation state (validated 14/14 by the headless harness, run 4:
    // drift collapsed 300-540u → ~6u median). pending = inputs sent but not
    // yet acked by the server (snapshot ackSeq); replayed after each adopt.
    let mpSeq = 0, mpLastSentAt = 0, mpLastReconTick = -1;
    let mpPending: { seq: number; throttle: number; steer: number; brake: number; drift: boolean }[] = [];
    // Visual smoothing of reconciliation corrections: physics corrections are
    // absorbed into this decaying render-only offset instead of appearing as
    // 30Hz micro-jumps ("glitching every millisecond").
    let mpSmoothX = 0, mpSmoothZ = 0, mpSmoothH = 0;
    let throttleDownSince: number | null = null; // when the player first held throttle during the countdown
    let rocketResolved = false; // rocket-start bonus applied at GO (once)
    let lastHud = '';
    let lastBeepCd: number | null = null; // last countdown beat the SFX has played for (prevents re-firing each frame)
    let lastPlayerLap = 0; // player's completed-lap count last frame — to detect crossing into a new lap
    let lapBannerText: string | null = null;
    let lapBannerUntil = 0; // elapsed time the "LAP n" banner stays up until
    let playerWallHits = 0; // times the wall pushed the player back since last log
    let midRoadHits = 0; // wall hits that fired while the player was ON the road (a bug)
    let maxPlayerDist = 0; // furthest the player got from the road centre since last log
    let stormSeen = false; // a storm-cloud slow hit the player in this window
    let lastLogAt = 0;
    const wallLine = BARRIER_OFFSET; // barrier centres sit here from the road centre
    const centreLimit = BARRIER_OFFSET - BARRIER_HALF_DEPTH - KART_RADIUS; // where the kart CENTRE is stopped
    if (DEBUG) console.log(`[CK collision] road halfWidth=${track.halfWidth}, barriers at ${wallLine} from centre, kart centre stops ~${centreLimit.toFixed(1)} (body edge meets the barrier face)`);

    const clearEntities = () => {
      for (const p of projectiles) { scene.remove(p.mesh); disposeObject(p.mesh); }
      for (const t of traps) { scene.remove(t.mesh); disposeObject(t.mesh); }
      projectiles = [];
      traps = [];
      for (const m of mpProjMeshes.values()) { scene.remove(m); disposeObject(m); }
      for (const m of mpTrapMeshes.values()) { scene.remove(m); disposeObject(m); }
      mpProjMeshes.clear();
      mpTrapMeshes.clear();
    };

    const pose = track.startPose();
    const fx = Math.sin(pose.heading);
    const fz = Math.cos(pose.heading);
    const ppx = Math.cos(pose.heading);
    const ppz = -Math.sin(pose.heading);
    // 6-kart starting grid: two staggered rows of three (lat across the road, fwd back from
    // the line). Player takes the front-left slot.
    const grid = [
      { lat: -7, fwd: 6 }, { lat: 0, fwd: 6 }, { lat: 7, fwd: 6 },
      { lat: -7, fwd: 0 }, { lat: 0, fwd: 0 }, { lat: 7, fwd: 0 },
    ];
    states = grid.map(({ lat, fwd }) => ({
      x: pose.x + fx * fwd + ppx * lat, z: pose.z + fz * fwd + ppz * lat,
      heading: pose.heading, velHeading: pose.heading, speed: 0,
      driftDir: 0, driftCharge: 0, boostTimer: 0, recoverTimer: 0,
      stunTimer: 0, invulnTimer: 0, slowTimer: 0, shield: false,
    }));
    prevStates = states.slice();
    laps = states.map((s) => initLap(track.nearest(s.x, s.z).progress));
    heldItems = new Array(NUM).fill(NO_ITEM);
    heldCount = new Array(NUM).fill(0);
    botUseAt = new Array(NUM).fill(Infinity);
    finishTimes = new Array(NUM).fill(NaN);
    states.forEach((s, i) => { lastSafe[i] = { x: s.x, z: s.z, heading: s.heading, speed: 0 }; }); // seed a respawn point from the grid
    // Seed each bot's rail from its grid slot (treat "just behind the start line" as negative progress
    // so it reads as being BEHIND, not a lap ahead), and lock in its racing-line offset.
    // Distinct racing lines so the bots DON'T stack up on one line — spread across the road
    // (centre/right, clear of the left-side upper-deck channel). They'll jockey/overtake on top.
    const BOT_LINES = [-4, 1, 6, 10, 13];
    for (let i = 1; i < NUM; i++) {
      let np = track.nearest(states[i].x, states[i].z).progress;
      if (np > 0.5) np -= 1;
      botProg[i] = np;
      botLat[i] = BOT_LINES[(i - 1) % BOT_LINES.length];
      botSpeed[i] = 0;
    }
    placeChaseCamera(camera, states[PLAYER], TUNING);

    const keyboard = createKeyboard();
    const standings = (): RacerProgress[] => states.map((s, i) => ({ id: i, lap: laps[i].lap, progress: track.nearest(s.x, s.z).progress }));

    const useItem = (i: number, ranked: number[]) => {
      const item = heldItems[i];
      const s = states[i];
      const fwdX = Math.sin(s.heading);
      const fwdZ = Math.cos(s.heading);
      if (item === ITEM.TURBO) states[i] = { ...s, boostTimer: Math.max(s.boostTimer, TUNING.turboBoost) };
      else if (item === ITEM.SHIELD) states[i] = { ...s, shield: true };
      else if (item === ITEM.ACORN || item === ITEM.BEE) {
        const kind = item === ITEM.BEE ? 'bee' : 'acorn';
        const rank = ranked.indexOf(i);
        // Bee homes on a rival. Bots hunt the PLAYER specifically when the player is ahead of
        // them (crafty, like real kart AI); otherwise it chases the kart immediately ahead.
        let target = -1;
        if (item === ITEM.BEE) {
          const playerRank = ranked.indexOf(PLAYER);
          if (i !== PLAYER && playerRank >= 0 && playerRank < rank) target = PLAYER;
          else if (rank > 0) target = ranked[rank - 1];
        }
        const mesh = makeProjectile(kind);
        // Launch from the kart's CURRENT height (incl. mid-jump/bridge) so a shot fired in the
        // air starts at the kart, not down on the ground. A little upward kick gives it an arc
        // ("a little float, like Mario Kart") instead of vanishing.
        const launchY = (s.y ?? 0) + mesh.position.y;
        const airborne = (s.y ?? 0) > 0.5;
        mesh.position.set(s.x + fwdX * 6, launchY, s.z + fwdZ * 6);
        scene.add(mesh);
        projectiles.push({ mesh, x: s.x + fwdX * 6, z: s.z + fwdZ * 6, y: launchY, vy: airborne ? 6 : 0, heading: s.heading, speed: kind === 'bee' ? TUNING.beeSpeed : TUNING.acornSpeed, kind, owner: i, life: kind === 'bee' ? TUNING.beeLife : TUNING.projectileLife, target });
      } else if (item === ITEM.MUD) {
        const mesh = makeTrap();
        mesh.position.set(s.x - fwdX * 6, mesh.position.y, s.z - fwdZ * 6);
        scene.add(mesh);
        traps.push({ mesh, x: s.x - fwdX * 6, z: s.z - fwdZ * 6, owner: i, age: 0 });
      } else if (item === ITEM.STORM) {
        const rank = ranked.indexOf(i);
        for (let r = 0; r < rank; r++) {
          const k = ranked[r];
          // A Leaf Shield blocks the storm too — it's consumed and the kart isn't slowed.
          if (states[k].shield) states[k] = { ...states[k], shield: false, invulnTimer: TUNING.hitInvuln };
          else states[k] = { ...states[k], slowTimer: TUNING.stormSlow };
        }
      }
      // Triple item: spend one shot; if any remain (Acorn = 3) keep it loaded, otherwise clear it.
      heldCount[i] = Math.max(0, heldCount[i] - 1);
      if (heldCount[i] > 0) {
        heldItems[i] = item;
        if (i !== PLAYER) botUseAt[i] = elapsed + 0.45; // bot rattles off the next shot shortly
      } else {
        heldItems[i] = NO_ITEM;
      }
    };

    // minimap transform
    const cv = hud.miniRef.current;
    const MW = cv?.width ?? 150;
    const MH = cv?.height ?? 117;
    const PADM = 12;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of track.points) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); }
    const mScale = Math.min((MW - 2 * PADM) / (maxX - minX || 1), (MH - 2 * PADM) / (maxZ - minZ || 1));
    const mcx = (minX + maxX) / 2;
    const mcz = (minZ + maxZ) / 2;
    const w2m = (x: number, z: number) => ({ mx: MW / 2 + (x - mcx) * mScale, my: MH / 2 + (z - mcz) * mScale });


    const drawMini = () => {
      const ctx = hud.miniRef.current?.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, MW, MH);
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      track.points.forEach((p, idx) => { const m = w2m(p.x, p.z); idx === 0 ? ctx.moveTo(m.mx, m.my) : ctx.lineTo(m.mx, m.my); });
      ctx.closePath();
      ctx.stroke();
      for (let i = NUM - 1; i >= 0; i--) {
        const m = w2m(states[i].x, states[i].z);
        ctx.fillStyle = hex(gridRacers[i].color);
        ctx.beginPath();
        ctx.arc(m.mx, m.my, i === PLAYER ? 5 : 3.6, 0, Math.PI * 2);
        ctx.fill();
        if (i === PLAYER) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; ctx.stroke(); }
      }
    };

    const finishRace = () => {
      const prog = states.map((s, i) => laps[i].lap + track.nearest(s.x, s.z).progress);
      const order = states.map((_, i) => i).sort((a, b) => prog[b] - prog[a]); // rank ALL karts (was hard-coded to 4)
      const times = order.map((idx) => (isFinite(finishTimes[idx]) ? finishTimes[idx] : elapsed * (track.laps / Math.max(0.5, prog[idx]))));
      const leader = times[0];
      const results: ResultRow[] = order.map((idx, k) => ({
        pos: k + 1,
        racerId: gridRacers[idx].id,
        time: fmt(times[k]),
        best: '—',
        delta: k === 0 ? null : `+${(times[k] - leader).toFixed(2)}`,
      }));
      // DIAGNOSTICS (only with ?debug): per-racer breakdown of WHERE time went.
      if (DEBUG) console.log('%c[CK diag] race breakdown (at player finish) — racer | progress | trainHits | respawns | crawl<6s | offRoad s', 'font-weight:bold;color:#ffb300');
      if (DEBUG) states.forEach((_s, i) => {
        console.log(`[CK diag] ${gridRacers[i].id.padEnd(7)} prog=${prog[i].toFixed(2)}/${track.laps}  trainHits=${diagTrainHits[i]}  respawns=${diagRespawns[i]}  crawl=${diagCrawl[i].toFixed(1)}s  offRoad=${diagOffRoad[i].toFixed(1)}s`);
      });
      onFinish(results);
    };

    // Off-track severity 0..1 for the grass gradient: 0 on the road / at the very edge, ramping
    // to 1 about one road-width out. Fed to stepKart so grass slows you progressively (gentle at
    // the verge, slower the further you stray) instead of an unnatural cliff at the edge.
    const offRoadAt = (x: number, z: number): number => {
      if (track.isOnTrack(x, z)) return 0;
      const past = track.nearest(x, z).distance - track.halfWidth;
      return Math.max(0, Math.min(1, past / track.halfWidth));
    };

    let last = performance.now();
    let acc = 0;
    let raf = 0;
    let perfT = 0, perfN = 0; // FPS sampling
    const loop = (now: number) => {
      let frame = (now - last) / 1000;
      last = now;
      if (frame > 0.25) frame = 0.25;
      // Hold the countdown at "3" until the LoadingManager reports every queued GLB
      // has fully decoded — players never hear GO! over a half-rendered world.
      //
      // MULTIPLAYER ANCHOR (added 2026-06-08): in MP, server emits
      // `startAtMs` (the wall-clock time when elapsed should == 0,
      // i.e. when the countdown ends and the race actually begins).
      // Anchoring elapsed to (Date.now() - startAtMs) / 1000 makes
      // both clients agree on when the race started — regardless of
      // who finished loading assets first. Without this, JJ saw
      // "shelly still on countdown while rusty past first corner"
      // 2026-06-08 because each client's elapsed was tied to its
      // own assets-ready moment instead of a shared anchor.
      //
      // The train, countdown, and every other elapsed-driven entity
      // (drift sparks, item respawns, lap banners) now stay in sync
      // because they all read from this same value.
      //
      // Joiner loaded 5s late? Their elapsed jumps to 5 the moment
      // their assets finish — they enter the race in progress at
      // the same wall-clock moment everyone else is at. Better than
      // running a private countdown starting now.
      if (phaseLocal !== 'finished' && assetsReady) {
        if (multi) {
          // MP MODE: ONLY use the server's locked anchor from
          // race:countdownLocked. Do NOT fall back to multi.startAtMs
          // (the provisional pre-handshake value from race:start) or to
          // local frame accumulation — both run a private countdown
          // out of sync with the racing peers and produced JJ's
          // "rusty started way before shelly" 2026-06-10.
          //
          // If the lock hasn't arrived yet, elapsed stays at its
          // initial -COUNTDOWN. The lock arrives via either the
          // broadcast at race start (normal joiner) or the joinRace
          // replay (late joiner, reconnect, slow asset load). Once
          // the lock lands, elapsed jumps to (now - lockedAnchor)/1000
          // and the phase transitions on the next line.
          const lockedAnchor = (multi as any).getStartAtMs?.();
          if (lockedAnchor) {
            elapsed = (Date.now() - lockedAnchor) / 1000;
          }
          // else: hold at the initial -COUNTDOWN value. Don't accumulate.
        } else {
          elapsed += frame;
        }
      }
      if (phaseLocal === 'countdown' && elapsed >= 0) { phaseLocal = 'racing'; playRace(); }
      const racing = phaseLocal === 'racing';

      // (Anti-stuck recovery + pickup-seeking removed: rail bots can't get stuck, and they pick up
      // whatever item box their line passes over — no diversion steering needed.)

      const raw = keyboard.read();

      // === Multiplayer integration (additive) =================================
      // When useMultiplayerSync returns non-null, do two things per rAF tick:
      //   1. Send the local input frame to the server (down-sampled to 30Hz
      //      inside the net client).
      //   2. Overwrite REMOTE karts' states[i] from the latest server
      //      snapshot, so other humans + server-driven bots move
      //      authoritatively. Skip the local-player slot — Fish's local
      //      physics drives our own kart's render for snappy feel (thin
      //      client v1; reconciliation lands in v2).
      // No-op when solo: multiRef.current is null and this block exits.
      const mp = multiRef.current;

      // DIAGNOSTIC: one-shot log on first frame so we know whether mp is null
      // (= MultiplayerProvider didn't wrap GameCanvas → solo path)
      // or non-null (= context is wired, see snapshot-apply logs below).
      if (!(window as any).__ckMpFirstFrame) {
        (window as any).__ckMpFirstFrame = true;
        console.log('[critter-kart/diag] FIRST FRAME — mp is:', mp ? {
          hasSelfSlot: mp.selfSlot,
          hasSelfKartId: mp.selfKartId,
          hasSendInput: typeof mp.sendInput,
          hasLatestSnapshot: typeof Object.getOwnPropertyDescriptor(mp, 'latestSnapshot'),
        } : 'NULL — solo render, no multiplayer sync');
      }

      if (mp) {
        try {
          // ALWAYS-ON MP status banner (every 5s, console.warn so no filter
          // hides it): after a silent-console incident we guarantee the MP
          // state is observable — snapshot flow, selfSnap match, pending size.
          {
            const w: any = window as any;
            if (!w.__ckMpStatusAt || performance.now() - w.__ckMpStatusAt > 5000) {
              w.__ckMpStatusAt = performance.now();
              const s0: any = mp.latestSnapshot;
              const found = !!s0?.karts?.find((kk: any) => kk.kartId === mp.selfKartId);
              console.warn(`[critter-kart/mp] status: selfKartId=${mp.selfKartId} slot=${mp.selfSlot} snap=${s0 ? `tick ${s0.tick}` : 'NONE'} selfInSnap=${found} pending=${mpPending.length}`);
            }
          }
          // Single 33ms send gate (the net layer no longer throttles) so the
          // pending buffer contains EXACTLY the frames that went on the wire.
          if (performance.now() - mpLastSentAt >= 33) {
            mpLastSentAt = performance.now();
            const seq = ++mpSeq;
            mp.sendInput({
              seq,
              steer: racing ? raw.steer : 0,
              // Throttle is sent UNGATED so the server can see the countdown
              // throttle-hold and award the rocket start authoritatively (the
              // runner doesn't move karts pre-GO, so this is timing-only).
              throttle: raw.throttle,
              brake: racing ? raw.brake : 0,
              drift: !!(racing && raw.drift),
            } as any);
            // Record what the LOCAL physics consumed (smoothed steer) for replay.
            // Only while racing — the server's runner doesn't exist pre-GO, so
            // countdown inputs are never acked and the buffer balloons to its
            // cap (then gets replayed in one heavy, wrong burst at GO).
            if (racing) {
              mpPending.push({
                seq,
                throttle: raw.throttle,
                steer,
                brake: raw.brake,
                drift: !!raw.drift,
              });
              if (mpPending.length > 120) mpPending.shift();
            }
          }
          const snap = mp.latestSnapshot;
          // DIAGNOSTIC: log first time we see a non-null snapshot
          if (snap && !(window as any).__ckFirstSnapshotLogged) {
            (window as any).__ckFirstSnapshotLogged = true;
            console.log('[critter-kart/diag] FIRST SNAPSHOT received:', {
              raceId: (snap as any).raceId,
              tick: (snap as any).tick,
              kartCount: (snap as any).karts?.length,
              kartIds: (snap as any).karts?.map((k: any) => k.kartId),
              selfSlot: mp.selfSlot,
              selfKartId: mp.selfKartId,
            });
          }
          if (snap) {
            for (let i = 0; i < NUM; i++) {
              if (i === mp.selfSlot) continue;
              const k = mp.applyToSlot(i);
              // DIAGNOSTIC: log first non-null applyToSlot result per slot
              if (k && !(window as any)[`__ckApplied_${i}`]) {
                (window as any)[`__ckApplied_${i}`] = true;
                console.log(`[critter-kart/diag] FIRST APPLY slot ${i}:`, {
                  kartId: (k as any).kartId,
                  x: (k as any).x,
                  z: (k as any).z,
                  heading: (k as any).heading,
                });
              }
              // DIAGNOSTIC: also log per slot when snap exists but applyToSlot returns null
              if (snap && !k && !(window as any)[`__ckNullApply_${i}`]) {
                (window as any)[`__ckNullApply_${i}`] = true;
                console.warn(`[critter-kart/diag] applyToSlot(${i}) returned NULL despite snapshot. snap has karts:`,
                  (snap as any).karts?.map((kk: any) => kk.kartId),
                  '  — check kartIdToSlot mapping');
              }
              if (!k) continue;
              states[i] = {
                ...states[i],
                x: k.x,
                z: k.z,
                y: k.y ?? states[i].y ?? 0,
                vy: k.vy ?? states[i].vy ?? 0,
                heading: k.heading,
                velHeading: k.velHeading,
                speed: k.speed,
                driftDir: k.driftDir,
                boostTimer: k.boostTimer,
                stunTimer: k.stunTimer,
                slowTimer: k.slowTimer,
                shield: k.shield,
              };
              // Server-authoritative train squash for REMOTE karts — drive the
              // local flatten window from the snapshot so the squash renders.
              const ft = (k as any).flattenTimer ?? 0;
              if (ft > 0 && flattenUntil[i] <= elapsed) flattenUntil[i] = elapsed + ft;
            }
            // Self kart: keep LOCAL position/feel, but overlay server-authoritative
            // EFFECT + ITEM state so the player actually feels item hits (stun /
            // slow / shield) and the HUD shows the server's held item. Position,
            // heading + speed stay locally predicted for snappy control.
            const selfSnap = (snap as any).karts?.find((kk: any) => kk.kartId === mp.selfKartId);
            if (selfSnap) {
              heldItems[PLAYER] = selfSnap.heldItem ?? NO_ITEM;
              heldCount[PLAYER] = selfSnap.heldCount ?? 0;
              // Drift meter sampling (time-matched vs the local trail) — with
              // reconciliation live this reads the replay RESIDUAL (~6u median
              // in harness run 4, down from 300-540u without it).
              localTrail.push({ t: elapsed, x: states[PLAYER].x, z: states[PLAYER].z });
              if (localTrail.length > 150) localTrail.shift();
              const snapT = (((snap as any).tMs ?? 0) / 1000);
              let refPt: { x: number; z: number } | null = null;
              for (let bi = localTrail.length - 1; bi >= 0; bi--) {
                if (localTrail[bi].t <= snapT) { refPt = localTrail[bi]; break; }
              }
              const trueDrift = refPt ? Math.hypot(selfSnap.x - refPt.x, selfSnap.z - refPt.z) : 0;
              if (!(window as any).__ckDriftAt || performance.now() - (window as any).__ckDriftAt > 3000) {
                (window as any).__ckDriftAt = performance.now();
                console.warn(`[critter-kart/sync] drift residual: ${trueDrift.toFixed(1)}u (pending ${mpPending.length})`);
              }
              // TEXTBOOK RECONCILIATION (Gambetta; validated 14/14 in harness
              // run 4): on each NEW snapshot, ADOPT the server's authoritative
              // state for our kart, then REPLAY the inputs the server hasn't
              // processed yet (seq > ackSeq) through the same deterministic
              // physics. The local kart stays converged to the server — no
              // pulls, no teleports, balloons/items land where you are.
              const tick = (snap as any).tick;
              if (typeof tick === 'number' && tick !== mpLastReconTick) {
                mpLastReconTick = tick;
                const preX = states[PLAYER].x, preZ = states[PLAYER].z, preH = states[PLAYER].heading;
                states[PLAYER] = {
                  ...states[PLAYER],
                  x: selfSnap.x, z: selfSnap.z,
                  y: selfSnap.y ?? 0, vy: selfSnap.vy ?? 0,
                  // mid-air adoption must keep falling=true or the y-clamp
                  // grounds the kart instantly (false splash in the gap)
                  falling: (selfSnap.vy ?? 0) !== 0 || (selfSnap.y ?? 0) > 0.05,
                  heading: selfSnap.heading, velHeading: selfSnap.velHeading,
                  speed: selfSnap.speed,
                  driftDir: selfSnap.driftDir ?? 0,
                  boostTimer: selfSnap.boostTimer ?? 0,
                  stunTimer: selfSnap.stunTimer ?? 0,
                  slowTimer: selfSnap.slowTimer ?? 0,
                  shield: !!selfSnap.shield,
                };
                mpPending = mpPending.filter((p) => p.seq > (selfSnap.ackSeq ?? 0));
                for (const p of mpPending) {
                  for (let k = 0; k < 2; k++) {   // each 30Hz input ≈ two 60Hz sim ticks
                    states[PLAYER] = stepKart(states[PLAYER], {
                      throttle: p.throttle, steer: p.steer, brake: p.brake, drift: p.drift,
                      onTrack: track.isOnTrack(states[PLAYER].x, states[PLAYER].z),
                      offRoad: offRoadAt(states[PLAYER].x, states[PLAYER].z),
                    }, TUNING, FIXED);
                    // REPLAY WORLD (Fish's "pulled back over the jump / invisible
                    // wall" report): bare-physics replay dragged the kart flat
                    // through the water gap (→ false splash + respawn) and inside
                    // wall geometry. Replay must run the same world pipeline as
                    // the local substep: walls + ramp ride/launch + arch pin.
                    const rb = resolveBarriers(states[PLAYER], barriers, KART_RADIUS, TUNING);
                    if (rb) states[PLAYER] = { ...states[PLAYER], ...rb };
                    const pr = track.nearest(states[PLAYER].x, states[PLAYER].z).progress;
                    const az = track.archBridgeZone;
                    if (az && pr >= az.startProgress && pr <= az.endProgress) {
                      states[PLAYER] = { ...states[PLAYER], y: archHeightAt((pr - az.startProgress) / ((az.endProgress - az.startProgress) || 1)), vy: 0, falling: false };
                    }
                    const rampY = structures.rampSurfaceY(pr);
                    if (rampY !== null && !states[PLAYER].respawnAt && !states[PLAYER].falling) {
                      states[PLAYER] = pr >= structures.rampPeakProgress
                        ? { ...states[PLAYER], y: rampY, vy: TUNING.jumpLaunch, falling: true }
                        : { ...states[PLAYER], y: rampY, vy: 0, falling: false };
                    }
                  }
                }
                // Absorb the correction into the render-only smoothing offset
                // (decays each frame) so it never shows as a position jump.
                mpSmoothX += preX - states[PLAYER].x;
                mpSmoothZ += preZ - states[PLAYER].z;
                const sm = Math.hypot(mpSmoothX, mpSmoothZ);
                if (sm > 30) { mpSmoothX *= 30 / sm; mpSmoothZ *= 30 / sm; } // beyond 30u = genuine teleport, allowed to show
              }
            }
          }
        } catch (e) {
          if (!(window as any).__ckMpErrLogged) {
            (window as any).__ckMpErrLogged = true;
            console.error('[critter-kart/mp] sync threw — race continues solo-rendered:', e);
          }
        }
      }
      // === End multiplayer integration ========================================

      // ROCKET START: hold throttle in the final beat of the countdown for a launch boost. Track
      // when the player first pressed throttle during the countdown; flooring it too EARLY (more
      // than rocketWindow before GO) earns nothing (engine flooded), a well-timed press earns the
      // boost. Resolved once, the instant the race goes live.
      if (!racing && phaseLocal === 'countdown') {
        if (raw.throttle > 0) { if (throttleDownSince === null) throttleDownSince = elapsed; }
        else throttleDownSince = null;
      } else if (racing && !rocketResolved) {
        rocketResolved = true;
        if (throttleDownSince !== null && throttleDownSince >= -TUNING.rocketWindow) {
          states[PLAYER] = { ...states[PLAYER], boostTimer: Math.max(states[PLAYER].boostTimer, TUNING.rocketBoost) };
        }
        // (Bots are rail-driven; their pace is pinned to yours, so no separate rocket-start boost.)
      }

      acc += frame;
      // Cap sub-steps per render frame. Without this, one slow/hitched frame dumps a big dt
      // into the accumulator and runs many physics steps at once — which reads as the kart
      // lurching/oversteering ("glitchy"). Capping keeps a hitch as a brief slow-down instead.
      let steps = 0;
      while (acc >= FIXED && steps < 5) {
        steps++;
        for (let i = 0; i < NUM; i++) prevStates[i] = states[i]; // snapshot the pre-step pose for render interpolation
        steer = rampSteer(steer, racing ? raw.steer : 0, TUNING.steerRampRate, TUNING.steerReturnRate, FIXED);
        if (flattenUntil[PLAYER] <= elapsed) // a train-flattened kart is frozen until it respawns
          states[PLAYER] = stepKart(states[PLAYER], { throttle: racing ? raw.throttle : 0, brake: racing ? raw.brake : 0, steer, drift: racing && raw.drift, onTrack: track.isOnTrack(states[PLAYER].x, states[PLAYER].z), offRoad: offRoadAt(states[PLAYER].x, states[PLAYER].z) }, TUNING, FIXED);
        // Bots are RAIL-DRIVEN now — advanced kinematically at the END of this substep (see the
        // "RAIL BOTS" block below). Nothing physics-steers them, so they can't run wide or get stuck.
        for (let i = 0; i < NUM; i++) {
          for (let j = i + 1; j < NUM; j++) {
            const r = resolveKartCollision(states[i], states[j], WEIGHTS[i], WEIGHTS[j]);
            if (r) { states[i] = { ...states[i], ...r.a }; states[j] = { ...states[j], ...r.b }; }
          }
        }
        for (let i = 0; i < NUM; i++) {
          const preDist = i === PLAYER ? track.nearest(states[i].x, states[i].z).distance : 0;
          const b = resolveBarriers(states[i], barriers, KART_RADIUS, TUNING);
          if (b) {
            states[i] = { ...states[i], ...b };
            if (i === PLAYER) { playerWallHits++; if (preDist < track.halfWidth) midRoadHits++; }
          }
          // solid scenery props (trees/rocks/hay/logs/embankments) — bump, don't pass through
          const op = resolveObstacles(states[i], propObstacles, KART_RADIUS, TUNING);
          if (op) states[i] = { ...states[i], ...op };
        }
        // Boost pads — when a kart enters a pad it gets a turbo refresh; the per-kart
        // `triggered` flag prevents the same pass re-firing every frame, and resets the
        // moment the kart leaves the pad so a second lap re-fires the boost.
        for (const pad of boostPads) {
          for (let i = 0; i < NUM; i++) {
            const inside = padContains(pad, states[i].x, states[i].z);
            if (inside && !pad.triggered[i]) {
              states[i] = { ...states[i], boostTimer: Math.max(states[i].boostTimer, TUNING.turboBoost * 1.6) }; // pads give a strong, longer boost
              pad.triggered[i] = true;
            } else if (!inside && pad.triggered[i]) {
              pad.triggered[i] = false;
            }
          }
        }
        // Arched bridge: while a kart is on it, pin its Y to the deck arch (parabola peaking
        // mid-span) so it rides up and over. Re-applied every sub-step because stepKart's
        // gravity would otherwise pull a raised kart back down.
        if (track.archBridgeZone) {
          const az = track.archBridgeZone;
          for (let i = 0; i < NUM; i++) {
            const p = track.nearest(states[i].x, states[i].z).progress;
            if (p >= az.startProgress && p <= az.endProgress) {
              const t = (p - az.startProgress) / (az.endProgress - az.startProgress || 1);
              states[i] = { ...states[i], y: archHeightAt(t), vy: 0, falling: false };
            }
          }
        }

        // OPTIONAL UPPER DECK: steer onto the chosen side near the entry to commit; while committed
        // the kart's Y follows the deck profile (ramp up → flat → ramp down) and the booster strip
        // refreshes its turbo so it fires out the far end. Stay centre/right and you ignore it.
        if (track.upperDeckZone) {
          const ud = track.upperDeckZone;
          const deckH = (p: number) => {
            if (p < ud.rampUpEnd) return ud.height * (p - ud.startProgress) / (ud.rampUpEnd - ud.startProgress);
            if (p > ud.rampDownStart) return ud.height * (ud.endProgress - p) / (ud.endProgress - ud.rampDownStart);
            return ud.height;
          };
          for (let i = 0; i < NUM; i++) {
            const near = track.nearest(states[i].x, states[i].z);
            const p = near.progress;
            if (p < ud.startProgress || p > ud.endProgress) { onUpperDeck[i] = false; continue; }
            // signed lateral offset from the centre-line (same perp convention as the deck mesh)
            const a = track.pointAtProgress(p);
            const b = track.pointAtProgress(Math.min(1, p + 0.002));
            let tx = b.x - a.x, tz = b.z - a.z;
            const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
            const lat = (states[i].x - a.x) * tz + (states[i].z - a.z) * -tx;
            // commit at the entry ramp only if actually IN the channel (past the inner wall), so a
            // kart on the normal road beside the channel is never lifted.
            if (!onUpperDeck[i] && p < ud.rampUpEnd && Math.sign(lat) === ud.side && Math.abs(lat) >= UPPER_DECK_INNER && Math.abs(lat) <= track.halfWidth) onUpperDeck[i] = true; // outer bound: past the wall line = grass, no lift
            if (onUpperDeck[i]) {
              // Drifted off the OPEN inner edge (toward the road — no rail there) → release the pin
              // and drop off the deck back down to the road, losing the high line + boost. That's
              // the risk of the shortcut. (Won't trigger on the normal descent, which stays out in
              // the channel at |lat| ≥ the inner edge.)
              if ((Math.abs(lat) < UPPER_DECK_INNER - 0.5 || Math.abs(lat) > track.halfWidth + 1) && p < ud.rampDownStart) {
                onUpperDeck[i] = false;
                states[i] = { ...states[i], falling: true, vy: -1 };
              } else {
                states[i] = { ...states[i], y: deckH(p), vy: 0, falling: false };
                if (p >= ud.boostStart && p <= ud.boostEnd) states[i] = { ...states[i], boostTimer: Math.max(states[i].boostTimer, TUNING.turboBoost * 1.4) };
              }
            }
          }
        }

        // (No fall-off respawn on the flat bridge: driving off the open edge into the gap just
        // gives the normal off-track grass slowdown — no teleport — so there's no respawn cycle.)

        // Ramp + water hole. Three phases as the kart traverses this region:
        //   1. ramp riding   — kart's wheels follow the pre-baked ramp surface heightmap
        //   2. launch        — at the top of the ramp, kart gets an upward vy; falling=true
        //   3. flight / land — gravity acts; lands on road (reset) OR over water (splash + respawn)
        if (track.jumpZone) {
          const sp = track.jumpZone.startProgress;
          const ep = track.jumpZone.endProgress;
          const SAFE_BUFFER = 0.015;
          for (let i = 0; i < NUM; i++) {
            if (i !== PLAYER) continue; // bots handle their own jump arc kinematically (rail)
            const s = states[i];
            const p = track.nearest(s.x, s.z).progress;
            const inZone = p >= sp && p <= ep;
            const safelyOutside = p < sp - SAFE_BUFFER || p > ep + SAFE_BUFFER;
            const grounded = (s.y ?? 0) === 0 && (s.vy ?? 0) === 0 && !s.falling;

            // Save safe state when comfortably outside the gap, on solid road.
            if (grounded && safelyOutside) {
              lastSafe[i] = { x: s.x, z: s.z, heading: s.heading, speed: s.speed };
            }

            // Ramp riding: kart's progress is in the ramp range → pin its Y to the ramp
            // surface heightmap. vy = 0 to neutralise gravity while it's "supported" by
            // the ramp; falling = false so the y-clamp re-engages off the ramp.
            //
            // LAUNCH fires at the PEAK of the ramp's height profile (not its end) while the
            // kart is still on it — i.e. with state.y == rampTopY at that instant. That kills
            // the 1-2 frame visual dip that was happening when launch fired after the kart
            // had already stepped off the ramp and gravity had nibbled at its Y.
            const rampY = structures.rampSurfaceY(p);
            const onRamp = rampY !== null && !s.respawnAt; // splashing karts don't ride ramps
            wasOnRamp[i] = onRamp;
            if (onRamp && !s.falling) {
              if (p >= structures.rampPeakProgress) {
                // At or past the peak → launch up at full ramp height
                states[i] = { ...s, y: rampY!, vy: TUNING.jumpLaunch, falling: true };
              } else {
                states[i] = { ...s, y: rampY!, vy: 0, falling: false };
              }
              continue;
            }

            // First step inside the gap with no launch → drop straight in (drove off the
            // road without using the ramp).
            if (inZone && !s.falling && (s.y ?? 0) === 0) {
              states[i] = { ...s, falling: true, vy: -2 };
              continue;
            }

            // Mid-air kart that lands past the gap → on solid road; reset to grounded. (Skip karts
            // already mid-respawn — e.g. one that fell off the upper deck — so they keep dropping
            // until their respawn timer returns them, instead of snapping to ground here.)
            if (s.falling && !inZone && p > ep && (s.y ?? 0) <= 0 && !s.respawnAt) {
              states[i] = { ...s, y: 0, vy: 0, falling: false };
              continue;
            }

            // Hit the water surface in the gap → splash + start a short submerge timer.
            if (s.falling && inZone && (s.y ?? 0) <= WATER_Y && !s.respawnAt) {
              const splash = makeSplash(s.x, WATER_Y, s.z);
              splashes.push(splash);
              scene.add(splash.group);
              states[i] = { ...s, respawnAt: elapsed + 0.45 };
            }

            // Once the submerge timer fires, teleport back to the last safe spot.
            if (s.respawnAt !== undefined && elapsed >= s.respawnAt && lastSafe[i]) {
              const safe = lastSafe[i]!;
              states[i] = {
                ...s,
                x: safe.x, z: safe.z,
                heading: safe.heading, velHeading: safe.heading,
                speed: safe.speed * TUNING.respawnSpeedKeep,
                y: 0, vy: 0, falling: false, respawnAt: undefined,
              };
            }
          }
        }

        // ===== RAIL BOTS =====
        // Drive each bot kinematically along the racing line. Speed = mild corner-slow × a position
        // rubber-band vs the player, so they're glued to the track, never get stuck, and are never
        // out-dragged: behind/level → they match-or-beat your pace; only when comfortably AHEAD do
        // they ease so you stay in touch. A hit briefly slows them; a train on the crossing makes
        // them wait. Runs last so it's the final word on bot state (overrides the physics loops).
        if (racing && !mp) {
          // MULTIPLAYER GUARD (added 2026-06-05): when in a multiplayer
          // race, the server is authoritative for every non-self kart.
          // Snapshots arrive at 20 Hz and the apply block (~ line 624)
          // writes server-truth into states[1..5] every rAF tick.
          // Without this `!mp` guard the rail-bot loop below would then
          // OVERWRITE states[i].x/z/heading/speed for each non-self
          // slot with locally-computed rail-bot positions (THIS client's
          // idea of where Peralta's kart should be), so other players'
          // karts never visually sync with their actual server-driven
          // movements. Diagnosed 2026-06-05 evening — the diag block at
          // ~line 624 confirmed snapshots arrive, apply runs, kart-1's
          // x/z written from server — but the bot loop here trampled it
          // ~5 ms later every frame. Skipping the entire loop is safe:
          // boost/stun/slow timer decay arrives via snapshot fields,
          // and the server runs bot AI for the 4 bot-fill slots, so we
          // don't need local AI to drive them either.
          const playerCont = laps[PLAYER].lap + track.nearest(states[PLAYER].x, states[PLAYER].z).progress;
          const playerSpeed = Math.max(0, states[PLAYER].speed);
          const FLOOR = TUNING.maxSpeed * 0.72; // don't crawl if the player is slow/stopped/hit
          for (let i = 1; i < NUM; i++) {
            const persona = BOT_PERSONAS[i - 1];
            const pNow = ((botProg[i] % 1) + 1) % 1;
            const behind = playerCont - botProg[i]; // >0 = bot is behind the player (in laps)
            // PIN the bot's pace to the PLAYER'S: they mirror your current speed as a floor (so they
            // can NEVER be out-dragged on a straight, even when you boost), and chase HARD when behind.
            // Only when comfortably AHEAD do they ease, so you can reel a leading bot back in.
            // Gentler catch-up with a DEAD-ZONE: you can hold a modest lead (~one straight) without
            // them instantly surging back in front. Past that they reel you in, but capped at +30%
            // (not +70%), so it feels like real racing rather than rigged elastic.
            const gap = behind - 0.03; // dead-zone: small leads are left alone
            const rel = gap > 0
              ? clamp(1 + gap * persona.catchup, 1.0, 1.3)            // meaningfully behind → catch up, gently
              : clamp(1 + behind * persona.catchup * 0.5, 0.78, 1.0); // level/ahead → ease so you can pass & lead
            // JOCKEYING: a per-bot pace wobble (out of phase with each other) so they surge and
            // fade independently → they overtake one another and the player instead of bunching.
            const osc = 1 + 0.14 * Math.sin(elapsed * 0.55 + i * 1.9);
            let target = Math.max(playerSpeed, FLOOR) * rel * osc;
            if ((states[i].stunTimer ?? 0) > 0) target *= 0.25; // recently hit → slow, not spin
            // a REAL boost (drove over a boost pad / used a turbo balloon — sets boostTimer below)
            // actually surges them, just like the player
            if ((states[i].boostTimer ?? 0) > 0) target = Math.max(target, TUNING.maxSpeed * 1.25);
            // wait for a train sitting on a crossing just ahead
            for (const [cp, cpt] of [[0.395, trainA], [0.769, trainB]] as const) {
              if (((cp - pNow) % 1 + 1) % 1 >= 0.05) continue;
              for (const tr of trains) for (const m of tr.pieces) {
                if (Math.hypot(m.position.x - cpt.x, m.position.z - cpt.z) < 12) target = 0;
              }
            }
            // ease speed (kart-like accel/decel) then advance along the line
            const dv = target - botSpeed[i];
            botSpeed[i] += Math.max(-90 * FIXED, Math.min(TUNING.accel * FIXED, dv)); // ease at kart accel → surges build naturally, not instantly
            botProg[i] += (botSpeed[i] * FIXED) / track.totalLength;
            const pp = ((botProg[i] % 1) + 1) % 1;
            const c0 = track.pointAtProgress(pp);
            const cN = track.pointAtProgress((pp + 0.004) % 1);
            let tx = cN.x - c0.x, tz = cN.z - c0.z; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
            const heading = Math.atan2(tx, tz);
            const x = c0.x + tz * botLat[i], z = c0.z - tx * botLat[i];
            // Y: ride the arch bridge, and arc over the lake jump (on rails → always clears it)
            let y = 0;
            const az = track.archBridgeZone;
            if (az && pp >= az.startProgress && pp <= az.endProgress) {
              y = archHeightAt((pp - az.startProgress) / (az.endProgress - az.startProgress || 1));
            } else if (track.jumpZone && structures.rampTopY > 0) {
              const rs = structures.rampStartProgress, re = track.jumpZone.endProgress;
              if (pp >= rs && pp <= re) y = structures.rampTopY * Math.sin(Math.PI * ((pp - rs) / ((re - rs) || 1)));
            }
            states[i] = {
              ...states[i], x, z, y, heading, velHeading: heading, speed: botSpeed[i],
              // Decay the boostTimer naturally (a boost pad / turbo balloon sets it) — so the flame
              // shows ONLY during a REAL boost, never permanently and never for plain catch-up.
              boostTimer: Math.max(0, (states[i].boostTimer ?? 0) - FIXED),
              driftDir: 0, driftCharge: 0, recoverTimer: 0, vy: 0, falling: false, respawnAt: undefined,
              stunTimer: Math.max(0, (states[i].stunTimer ?? 0) - FIXED),
              invulnTimer: Math.max(0, (states[i].invulnTimer ?? 0) - FIXED),
              slowTimer: Math.max(0, (states[i].slowTimer ?? 0) - FIXED),
            };
          }
        }
        acc -= FIXED;
      }
      if (acc > FIXED) acc = 0; // drop any backlog beyond the cap so a hitch can't spiral
      const alpha = Math.min(1, acc / FIXED); // 0..1 between the last two physics states → smooth render
      // Interpolated render pose for kart i: lerp between the last two physics states by `alpha`,
      // so motion is glassy-smooth regardless of the display's refresh rate. A teleport (respawn,
      // train-flatten, lake/Lakitu reset) moves further than any single step could, so we snap to
      // the current state instead of sliding the kart across the map. Used by the kart meshes AND
      // everything attached to them (shield rings, storm clouds, lightning) so they never separate.
      // decay the reconciliation smoothing offset (render-only, ~15%/frame)
      mpSmoothX *= 0.92; mpSmoothZ *= 0.92; mpSmoothH *= 0.92;
      const renderPose = (i: number): KartState => {
        const cur = states[i], prev = prevStates[i] ?? cur;
        if (Math.hypot(cur.x - prev.x, cur.z - prev.z) > 8) return cur; // teleport → snap
        const pose = {
          ...cur,
          x: prev.x + (cur.x - prev.x) * alpha,
          z: prev.z + (cur.z - prev.z) * alpha,
          y: (prev.y ?? 0) + ((cur.y ?? 0) - (prev.y ?? 0)) * alpha,
          heading: angleLerp(prev.heading, cur.heading, alpha),
        };
        // local player in MP: render through the decaying correction offset so
        // 30Hz reconciliation never reads as micro-jumps
        if (mp && i === PLAYER) { pose.x += mpSmoothX; pose.z += mpSmoothZ; pose.heading += mpSmoothH; }
        return pose;
      };

      // SLIPSTREAM / DRAFT: tuck directly into the wake of a kart ahead (within range + a tight
      // cone) and you wind up past normal top speed — the overtaking tool. The burst bleeds off
      // via friction once you pull out. Applies to everyone, so the pack swaps the lead a lot.
      if (racing) {
        const range2 = TUNING.draftRange * TUNING.draftRange;
        const cap = TUNING.maxSpeed * TUNING.draftMult;
        for (let i = 0; i < NUM; i++) {
          const s = states[i];
          if (s.speed <= 0 || s.speed >= cap) continue;
          const fwx = Math.sin(s.heading), fwz = Math.cos(s.heading);
          let drafting = false;
          for (let j = 0; j < NUM; j++) {
            if (j === i) continue;
            const dx = states[j].x - s.x, dz = states[j].z - s.z;
            const d2 = dx * dx + dz * dz;
            if (d2 > range2) continue;
            const d = Math.sqrt(d2);
            if (d >= TUNING.draftMinDist && dx * fwx + dz * fwz > TUNING.draftCone * d) { drafting = true; break; }
          }
          if (drafting) states[i] = { ...s, speed: Math.min(cap, s.speed + TUNING.draftAccel * frame) };
        }
      }

      if (racing) {
        const pd = track.nearest(states[PLAYER].x, states[PLAYER].z).distance;
        maxPlayerDist = Math.max(maxPlayerDist, pd);
        if ((states[PLAYER].slowTimer ?? 0) > 0) stormSeen = true;
        if (elapsed - lastLogAt >= 1) {
          const past = maxPlayerDist > BARRIER_OFFSET + 2; // got well past the barrier line = drove through
          const onGrass = maxPlayerDist > track.halfWidth; // clipped the run-off (expected slow)
          // Only spam this when the B-debug overlay is on, so the console stays clean otherwise.
          if (debugWall.visible) console.log(`[CK collision] player distFromCentre=${pd.toFixed(1)} (road edge ${track.halfWidth}, barriers ${BARRIER_OFFSET}) maxSince=${maxPlayerDist.toFixed(1)} wallHits=${playerWallHits} midRoadHits=${midRoadHits} onGrass=${onGrass ? 'Y' : 'n'} stormSlow=${stormSeen ? 'Y' : 'n'}${midRoadHits > 0 ? '  <-- DRAG ON ROAD (bug)' : ''}${past ? '  <-- DROVE THROUGH' : ''}`);
          lastLogAt = elapsed;
          playerWallHits = 0;
          midRoadHits = 0;
          stormSeen = false;
          maxPlayerDist = pd;
        }
      }

      if (racing) {
        const ranked = rankRacers(standings());
        // MP guard (2026-06-08): in multiplayer, items live ONLY on the
        // client that owns the kart. Without this guard each client
        // independently rolls "Rusty picked up an acorn → throw at
        // Shelly in 0.4s" for the other human, and the throw VFX is
        // locally fabricated — Shelly sees Rusty throw acorns Rusty
        // never threw (JJ's report 2026-06-08). Bots remain locally
        // AI-driven (server doesn't sync their items either; everyone
        // independently rolls bot items, which is fine because no real
        // human is making contradictory decisions). Only slots backed
        // by a non-bot remote human get skipped.
        const isRemoteHuman = (i: number): boolean => {
          if (!mp || i === PLAYER) return false;
          const member = (mp.members as any[])?.find((m: any) => (m.slot ?? -1) === i);
          return !!(member && !member.isBot);
        };
        if (!mp) {
          // SOLO: local item simulation — pickup + player use + bot use. Unchanged.
          for (let i = 0; i < NUM; i++) {
            if (heldItems[i] !== NO_ITEM) continue;
            for (const box of itemBoxes) {
              if (elapsed < box.respawnAt) continue;
              if (Math.hypot(states[i].x - box.x, states[i].z - box.z) < TUNING.itemPickupRadius) {
                // Roll an item WITHIN the lane's category (red attack / blue speed / yellow defence),
                // weighted by THIS kart's race position (back-markers get the bee / catch-up storm).
                const pos = ranked.indexOf(i) + 1;
                const rolled = rollCategoryItem(box.category, pos, NUM, Math.random());
                heldItems[i] = rolled;
                heldCount[i] = rolled === ITEM.ACORN ? 3 : 1; // Acorn = triple shots
                box.respawnAt = elapsed + TUNING.itemBoxRespawn;
                if (i !== PLAYER) botUseAt[i] = elapsed + BOT_PERSONAS[botPersonaForSlot(i)].useDelay;
                break;
              }
            }
          }
          const useEdge = raw.use && !prevUse;
          if (useEdge && heldItems[PLAYER] !== NO_ITEM) useItem(PLAYER, ranked);
          for (let i = 1; i < NUM; i++) {
            if (heldItems[i] !== NO_ITEM && elapsed >= botUseAt[i]) useItem(i, ranked);
          }
        } else {
          // MULTIPLAYER: the server owns the entire item world (pickup, bot use,
          // projectiles, hits). The client only forwards the player's use intent;
          // heldItems[PLAYER] is synced from the snapshot in the MP block above.
          const useEdge = raw.use && !prevUse;
          if (useEdge && heldItems[PLAYER] !== NO_ITEM) mp.useItem();
        }
      }
      prevUse = raw.use;

      if (!mp) {
      // SOLO: local projectile + trap simulation (movement + hit detection).
      for (let p = projectiles.length - 1; p >= 0; p--) {
        const pr = projectiles[p];
        pr.life -= frame;
        if (pr.kind === 'bee' && pr.target >= 0) {
          const tg = states[pr.target];
          // Aim where the target WILL be (lead it), not where it is — proportional navigation, so
          // the bee converges onto a moving target instead of pure-pursuit orbiting behind it.
          const dx0 = tg.x - pr.x, dz0 = tg.z - pr.z;
          const dist = Math.hypot(dx0, dz0) || 1;
          const lead = Math.min(0.5, dist / Math.max(1, pr.speed)); // ~time-to-impact, capped
          const aimX = tg.x + Math.sin(tg.velHeading) * tg.speed * lead;
          const aimZ = tg.z + Math.cos(tg.velHeading) * tg.speed * lead;
          pr.heading = angleLerp(pr.heading, Math.atan2(aimX - pr.x, aimZ - pr.z), 0.45); // tight tracking, no orbiting
          pr.speed = Math.max(TUNING.beeSpeed, tg.speed + 22); // always outruns the target so it closes
        }
        pr.x += Math.sin(pr.heading) * pr.speed * frame;
        pr.z += Math.cos(pr.heading) * pr.speed * frame;
        const REST_Y = 2.6; // ground rest height for the projectile mesh
        if (pr.kind === 'acorn') { // arcs under gravity, then rolls along the ground
          pr.vy -= TUNING.gravity * frame;
          pr.y += pr.vy * frame;
          if (pr.y <= REST_Y) { pr.y = REST_Y; pr.vy = 0; }
        } else { // bee flies level — ease back to flight height if launched mid-air
          pr.y += (REST_Y - pr.y) * Math.min(1, frame * 4);
        }
        pr.mesh.position.set(pr.x, pr.y, pr.z);
        pr.mesh.rotation.y += frame * 9;
        pr.mesh.rotation.x += frame * 6;
        let hit = false;
        // A homing bee gets a GENEROUS lock-on contact with its actual target, so once it closes
        // it reliably connects instead of skimming past the tight general hit radius.
        if (pr.kind === 'bee' && pr.target >= 0 && pr.target !== pr.owner) {
          const tg = states[pr.target];
          if (Math.hypot(tg.x - pr.x, tg.z - pr.z) < TUNING.hitRadius + 2.5) { states[pr.target] = applyHit(states[pr.target], TUNING); hit = true; }
        }
        for (let k = 0; !hit && k < NUM; k++) {
          if (k === pr.owner) continue;
          if (Math.hypot(states[k].x - pr.x, states[k].z - pr.z) < TUNING.hitRadius) { states[k] = applyHit(states[k], TUNING); hit = true; break; }
        }
        // bee chases its target anywhere; acorn dies on lifetime, or if it leaves the road but
        // ONLY once it's back on the ground — so an acorn fired mid-jump arcs over the water gap
        // instead of being killed instantly for being "off-track" while airborne.
        const grounded = pr.y <= REST_Y + 0.05;
        const expired = pr.kind === 'bee' ? pr.life <= 0 : (pr.life <= 0 || (grounded && !track.isOnTrack(pr.x, pr.z)));
        if (hit || expired) { scene.remove(pr.mesh); disposeObject(pr.mesh); projectiles.splice(p, 1); }
      }
      for (let tIdx = traps.length - 1; tIdx >= 0; tIdx--) {
        const tr = traps[tIdx];
        tr.age += frame;
        let hit = false;
        for (let k = 0; k < NUM; k++) {
          if (k === tr.owner && tr.age < 0.7) continue;
          if (Math.hypot(states[k].x - tr.x, states[k].z - tr.z) < TUNING.hitRadius) { states[k] = applyHit(states[k], TUNING); hit = true; break; }
        }
        if (hit || tr.age > 25) { scene.remove(tr.mesh); disposeObject(tr.mesh); traps.splice(tIdx, 1); }
      }
      } else {
        // MULTIPLAYER: render server-authoritative projectiles + traps from the
        // snapshot — spawn new ids, move existing, despawn vanished. No local hit
        // detection (the server resolves hits; effects arrive via the snapshot).
        const snapE = mp.latestSnapshot;
        const liveProj = new Set<number>();
        for (const p of (((snapE as any)?.projectiles) ?? [])) {
          liveProj.add(p.id);
          let m = mpProjMeshes.get(p.id);
          if (!m) { m = makeProjectile(p.kind); scene.add(m); mpProjMeshes.set(p.id, m); }
          m.position.set(p.x, p.y, p.z);
          m.rotation.y += frame * 9; m.rotation.x += frame * 6;
        }
        for (const [id, m] of mpProjMeshes) { if (!liveProj.has(id)) { scene.remove(m); disposeObject(m); mpProjMeshes.delete(id); } }
        const liveTrap = new Set<number>();
        for (const t of (((snapE as any)?.traps) ?? [])) {
          liveTrap.add(t.id);
          let m = mpTrapMeshes.get(t.id);
          if (!m) { m = makeTrap(); scene.add(m); mpTrapMeshes.set(t.id, m); }
          m.position.set(t.x, m.position.y, t.z);
        }
        for (const [id, m] of mpTrapMeshes) { if (!liveTrap.has(id)) { scene.remove(m); disposeObject(m); mpTrapMeshes.delete(id); } }
      }

      // Item-box bob + visibility. In MP the active/respawning state is server-
      // authoritative (snapshot.inactiveBoxes by box id); solo uses local respawnAt.
      const mpSnapBox = mp ? mp.latestSnapshot : null;
      const inactiveBoxSet = mpSnapBox ? new Set(((mpSnapBox as any).inactiveBoxes) ?? []) : null;
      itemBoxes.forEach((box, bi) => {
        box.mesh.position.y = 5 + Math.sin(elapsed * 2 + box.x * 0.1) * 0.5;
        box.mesh.visible = inactiveBoxSet ? !inactiveBoxSet.has(bi) : (elapsed >= box.respawnAt);
      });
      for (let i = 0; i < NUM; i++) { const rp = renderPose(i); shieldRings[i].visible = !!states[i].shield; shieldRings[i].position.set(rp.x, 3, rp.z); }
      for (let i = 0; i < NUM; i++) {
        const slowed = (states[i].slowTimer ?? 0) > 0;
        stormClouds[i].visible = slowed;
        const rp = renderPose(i); // follow the INTERPOLATED kart pose so attached FX don't jitter relative to it
        if (slowed) { stormClouds[i].position.set(rp.x, 9 + Math.sin(elapsed * 6) * 0.4, rp.z); stormClouds[i].rotation.y = elapsed * 0.6; }
        // lightning STRIKE on the frame the storm first hits, then the kart flashes while slowed
        if (slowed && !prevSlow[i]) { lightningTimer[i] = 0.38; lightning[i].position.set(rp.x, 0, rp.z); }
        prevSlow[i] = slowed;
        lightningTimer[i] = Math.max(0, lightningTimer[i] - frame);
        lightning[i].visible = lightningTimer[i] > 0 && (lightningTimer[i] > 0.22 || Math.floor(elapsed * 45) % 2 === 0); // solid, then flicker out
        karts[i].flash(slowed ? Math.floor(elapsed * 14) % 2 === 0 : true);
      }

      for (let i = 0; i < NUM; i++) {
        laps[i] = updateLap(laps[i], track.nearest(states[i].x, states[i].z).progress);
        if (isNaN(finishTimes[i]) && isFinished(laps[i], track.laps)) finishTimes[i] = elapsed;
      }
      // Player crossed into a new lap → flash a "LAP n" / "FINAL LAP" banner (skip the
      // final crossing, which ends the race).
      if (racing && laps[PLAYER].lap > lastPlayerLap) {
        lastPlayerLap = laps[PLAYER].lap;
        if (laps[PLAYER].lap < track.laps) {
          const disp = currentLap(laps[PLAYER], track.laps); // 1-based lap now starting
          lapBannerText = disp >= track.laps ? 'FINAL LAP' : `LAP ${disp}`;
          lapBannerUntil = elapsed + 2.2;
        }
      }
      if (racing && isFinished(laps[PLAYER], track.laps)) { phaseLocal = 'finished'; finishRace(); }

      // --- TRAINS: both advance around the loop (half a lap apart); flatten any kart they run over ---
      const trainBase = (elapsed + TRAIN_PHASE) / TRAIN_PERIOD;
      for (const train of trains) {
        train.pieces.forEach((m, ci) => {
          const p = ((trainBase + train.phaseOffset - CAR_OFFSET[ci]) % 1 + 1) % 1;
          const a = trainPath.pointAtProgress(p);
          const b = trainPath.pointAtProgress((p + 0.004) % 1);
          m.position.set(a.x, 0.7, a.z);
          m.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
        });
      }
      if (racing) {
        for (let i = 0; i < NUM; i++) {
          if (i !== PLAYER) continue; // only the player gets flattened; rail bots WAIT for the train instead
          if (flattenUntil[i] > elapsed || (states[i].invulnTimer ?? 0) > 0) continue;
          let hit = false;
          for (const train of trains) {
            for (const m of train.pieces) {
              if (Math.hypot(states[i].x - m.position.x, states[i].z - m.position.z) < 6.5) { hit = true; break; }
            }
            if (hit) break;
          }
          if (hit) { flattenUntil[i] = elapsed + 0.7; states[i] = { ...states[i], speed: 0 }; diagTrainHits[i]++; } // squashed, then respawns
        }
      }

      // DIAGNOSTICS: tally time each racer spends crawling (<6 u/s) or off the track while racing.
      if (racing) {
        for (let i = 0; i < NUM; i++) {
          if (Math.abs(states[i].speed) < 6) diagCrawl[i] += frame;
          if (!track.isOnTrack(states[i].x, states[i].z)) diagOffRoad[i] += frame;
        }
      }

      let playerBaseY = 0; // player kart's Y before the hop animation is layered on — camera tracks this
      const playerPose = renderPose(PLAYER);
      karts.forEach((k, i) => {
        k.syncTo(renderPose(i)); // mesh.position.y = state.y, which may be negative when sinking in the lake
        // Train flatten: squash flat while flattened, then respawn at the last safe road spot.
        if (flattenUntil[i] > 0 && elapsed < flattenUntil[i]) {
          k.mesh.scale.set(1.4, 0.22, 1.4); // pancake
          if (i === PLAYER) playerBaseY = k.mesh.position.y;
          return;
        }
        if (flattenUntil[i] > 0) { // flatten just ended → respawn
          const safe = lastSafe[i];
          if (safe) states[i] = { ...states[i], x: safe.x, z: safe.z, heading: safe.heading, velHeading: safe.heading, speed: 0, y: 0, vy: 0, falling: false, invulnTimer: 1.5 };
          flattenUntil[i] = 0;
          k.mesh.scale.set(1, 1, 1);
          k.syncTo(states[i]);
        } else if ((states[i].y ?? 0) === 0 && !states[i].falling && track.isOnTrack(states[i].x, states[i].z)) {
          lastSafe[i] = { x: states[i].x, z: states[i].z, heading: states[i].heading, speed: states[i].speed }; // recent safe spot for train respawns
        }
        if (i === PLAYER) playerBaseY = k.mesh.position.y; // captured BEFORE hop so the camera follows the bridge/jump, not the stun bounce
        k.setBoosting(states[i].boostTimer > 0, elapsed);
        // drift mini-turbo sparks — only while actually drifting; colour reads the charge tier
        k.setDriftSparks(states[i].driftDir !== 0 ? driftTier(states[i].driftCharge, TUNING) : 0, elapsed);
        // when freshly hit (acorn/bee/trap), pop the kart into the air; it already spins
        // (the stun spins its heading) — so it reads as "thrown up, then spinning out".
        const stunned = (states[i].stunTimer ?? 0) > 0;
        if (stunned && !prevStun[i]) hopTimer[i] = 0.5;
        prevStun[i] = stunned;
        if (hopTimer[i] > 0) {
          hopTimer[i] = Math.max(0, hopTimer[i] - frame);
          const p = 1 - hopTimer[i] / 0.5; // 0..1 through the hop
          k.mesh.position.y += 3 * 4 * p * (1 - p); // parabola: up then back down (added on top of state.y)
        }
      });
      // Tick splash effects, remove expired ones
      for (let s = splashes.length - 1; s >= 0; s--) {
        if (!splashes[s].update(frame)) {
          scene.remove(splashes[s].group);
          splashes.splice(s, 1);
        }
      }
      updateChaseCamera(camera, playerPose, TUNING, playerBaseY, frame);
      // Boost "punch": widen the FOV a touch while the player is boosting (rocket start, turbo,
      // pad, draft to the cap) so speed really reads. Eased in/out, framerate-independent.
      const boosting = states[PLAYER].boostTimer > 0 || states[PLAYER].speed > TUNING.maxSpeed * 1.02;
      const targetFov = TUNING.fovBase + (boosting ? TUNING.fovBoost : 0);
      const fk = 1 - Math.pow(0.0001, frame); // ~smooth ease at any refresh rate
      if (Math.abs(camera.fov - targetFov) > 0.01) { camera.fov += (targetFov - camera.fov) * fk; camera.updateProjectionMatrix(); }
      if (PREMIUM_RENDER) {
        // Keep the shadow-casting sun centred on the player so the (finite) shadow map
        // stays high-res over the action instead of being stretched across the whole map.
        const px = states[PLAYER].x;
        const pz = states[PLAYER].z;
        sun.position.set(px + 60, 90, pz + 40);
        sun.target.position.set(px, 0, pz);
        sun.target.updateMatrixWorld();
      }
      dressing.updateCulling(states[PLAYER].x, states[PLAYER].z); // draw only props near the kart
      // Distance-cull the big one-off structures (tunnel/lake/ramp) too — only render them
      // when the player is near their stretch of track.
      for (const child of structures.group.children) {
        const dx = child.position.x - states[PLAYER].x;
        const dz = child.position.z - states[PLAYER].z;
        child.visible = dx * dx + dz * dz < 560 * 560;
      }
      renderer.render(scene, camera);
      // DIAGNOSTIC: once a second, report FPS + what the GPU actually drew this frame. If
      // tris are in the millions or calls in the hundreds, old (uncached) assets are loaded.
      perfT += frame; perfN++;
      if (DEBUG && perfT >= 1) {
        const info = renderer.info.render;
        console.log(`%c[CK perf] fps=${Math.round(perfN / perfT)}  drawCalls=${info.calls}  triangles=${info.triangles.toLocaleString()}`, 'font-weight:bold;color:#2bd4ff');
        perfT = 0; perfN = 0;
      } else if (perfT >= 1) { perfT = 0; perfN = 0; }
      drawMini();

      // per-frame HUD outputs
      if (hud.timeRef.current) hud.timeRef.current.textContent = fmt(Math.max(0, elapsed));
      if (hud.boostRef.current) {
        const ps = states[PLAYER];
        const frac = ps.driftDir !== 0 ? Math.min(1, ps.driftCharge / TUNING.driftTier3) : 0;
        hud.boostRef.current.style.width = `${frac * 100}%`;
      }

      // Wrong-way check: is the player moving against the track's forward direction? Compare
      // the kart's velocity heading to the track tangent at its position.
      let wrongWay = false;
      if (racing) {
        const ps = states[PLAYER];
        const near = track.nearest(ps.x, ps.z);
        const ta = track.pointAtProgress(near.progress);
        const tb = track.pointAtProgress((near.progress + 0.01) % 1);
        let dtx = tb.x - ta.x, dtz = tb.z - ta.z;
        const dl = Math.hypot(dtx, dtz) || 1;
        dtx /= dl; dtz /= dl;
        const vdx = Math.sin(ps.velHeading), vdz = Math.cos(ps.velHeading);
        wrongWay = ps.speed > 8 && vdx * dtx + vdz * dtz < -0.35; // moving, and clearly against the track
      }

      // infrequent HUD state (only when it changes). Compute standings ONCE (it maps every kart
      // + a track.nearest each) instead of the 3× it used to be called per frame.
      const st = standings();
      const ranked = rankRacers(st);
      const order = ranked.map((id, k) => {
        // In multiplayer, label HUMAN karts with their username (so you can see
        // WHERE each person is) instead of the character name. Bots keep the
        // character name. id is the kart slot index; mp.members maps slot→member.
        let label: string | undefined;
        if (mp) {
          const mem = (mp.members as any[])?.find((m: any) => (m.slot ?? -1) === id);
          if (mem && !mem.isBot && mem.username) label = mem.username;
        }
        return { racerId: gridRacers[id].id, pos: k + 1, label };
      });
      const cd = elapsed < 0 ? Math.ceil(-elapsed) : elapsed < 0.6 ? 0 : null;
      // Beat-change SFX: warm beep on 3/2/1, fanfare on GO. Only after loading is done,
      // so the synth doesn't fire while elapsed is still parked at -3 on the loading screen.
      if (assetsReady && cd !== null && cd !== lastBeepCd) {
        playCountdownBeep(cd === 0);
        lastBeepCd = cd;
      }
      // MP sync health — if the server's snapshot tick stops advancing for
      // >1.2s mid-race, snapshots have stalled (polling hiccup / dropped from
      // the race room). Surface it as a HUD badge + a timestamped console line
      // so a desync is OBSERVABLE instead of silent.
      if (mp) {
        const t = (mp.latestSnapshot as any)?.tick;
        if (typeof t === 'number' && t !== mpLastTick) { mpLastTick = t; mpLastTickAt = performance.now(); }
        // Blind-spot fix: if NO snapshot has EVER arrived, start the stall clock
        // at racing-start so the badge still fires (previously it never showed).
        if (racing && mpLastTickAt === 0) mpLastTickAt = performance.now();
      }
      const stalledNow = !!mp && racing && mpLastTickAt > 0 && (performance.now() - mpLastTickAt) > 1200;
      if (stalledNow !== netStalled) {
        netStalled = stalledNow;
        if (stalledNow) console.warn('[critter-kart/mp] ⚠ DESYNC — snapshots stalled >1.2s (last tick ' + mpLastTick + ')', new Date().toISOString());
        else console.log('[critter-kart/mp] ✓ resynced', new Date().toISOString());
      }
      const hs: HudState = {
        lap: currentLap(laps[PLAYER], track.laps),
        position: positionOf(PLAYER, st),
        heldItem: heldItems[PLAYER] === NO_ITEM ? null : heldItems[PLAYER],
        countdown: cd,
        order,
        loading: !assetsReady,
        loadProgress: assetsReady ? 1 : loadProgress,
        lapBanner: elapsed < lapBannerUntil ? lapBannerText : null,
        wrongWay,
        boosting: racing && (states[PLAYER].boostTimer > 0 || states[PLAYER].speed > TUNING.maxSpeed * 1.02),
        heldItemCount: heldItems[PLAYER] === NO_ITEM ? 0 : heldCount[PLAYER],
        netStalled,
      };
      // Cheap change-key (avoids a per-frame JSON.stringify): concatenate the scalar fields plus
      // the order strip. Only pushes to the HUD when something actually changed.
      const key = `${hs.lap}|${hs.position}|${hs.heldItem}|${hs.countdown}|${hs.loading}|${hs.loadProgress.toFixed(2)}|${hs.lapBanner}|${hs.wrongWay}|${hs.boosting}|${hs.heldItemCount}|${hs.netStalled}|${order.map((o) => o.racerId + o.pos).join(',')}`;
      if (key !== lastHud) { lastHud = key; hud.onState(hs); }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      if (readyTimer !== null) clearTimeout(readyTimer);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onDebugKey);
      keyboard.dispose();
      clearEntities();
      stopRace();
      // Free GPU memory for everything built this race (dressing, structures, train, pads, karts,
      // FX) so re-racing in one session doesn't leak. Dispose geometry + materials only — textures
      // can be module-cached (item-balloon icons) and are cheap, so we leave them to avoid freeing
      // something the next race reuses.
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) mat.dispose();
      });
      pmrem?.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [racerId]);

  return <div ref={mountRef} style={{ width: '100vw', height: '100vh', position: 'fixed', inset: 0 }} />;
}
