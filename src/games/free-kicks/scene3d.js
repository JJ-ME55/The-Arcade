import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { simulateShot, wallGeometry, ballReleasePos, dummyScaleForDistance } from './physics/physics.js';
import { generateScenario } from './physics/shotgen.js';
import { applyShot, initialRunState, isGoal } from './physics/rules.js';
import { extractInputs } from './physics/gesture.js';
import {
    BALL_RADIUS_M, BALL_RELEASE_HEIGHT_M,
    GOAL_HALF_WIDTH_M, GOAL_WIDTH_M, GOAL_HEIGHT_M, POST_RADIUS_M,
    DEFENDER_WIDTH_M, DEFENDER_HEIGHT_M, DEFENDER_DEPTH_M,
    TARGET_HALF_WIDTH_M, TARGET_HALF_HEIGHT_M,
    HEART_HALF_WIDTH_M, HEART_HALF_HEIGHT_M,
    LIVES_MAX,
} from './physics/constants.js';

const ATTEMPT_SEED = 42;
// Camera tuned to Flick Kick framing per JJ's visual-polish guide:
// wider FOV (72°), low camera height (~1.1 m), modest downward tilt
// (~5°). Wider FOV makes the ball read large in the foreground and
// compresses the stadium into a stylised silhouette — the broadcast
// arcade look. Downward tilt is achieved by aiming LOOK_AT_Y below
// ground level rather than raising the camera (keeps the ball in
// frame).
const CAMERA_FOV_DEG = 72;
const CAMERA_PULLBACK_M = 2.5;
const CAMERA_HEIGHT_M = 1.1;
const CAMERA_LOOK_AT_Y = -1.4;
const PLAYBACK_SPEED = 2.5;

function clamp255(v) {
    return Math.max(0, Math.min(255, v | 0));
}

// Three.js right-handed default has the camera looking DOWN -Z. Our
// physics has the ball at z=-distance and the goal at z=0, with ball
// flying in +Z toward goal. If we used physics z directly, the camera
// would have to look in +Z direction — which mirrors the X axis on
// screen (a known right-handed-vs-left-handed view artefact).
//
// Fix: map physics z → Three.js -z when placing dynamic objects. The
// camera sits on Three.js +Z and looks toward origin (default-friendly
// Three.js convention). Player's-right (+X in physics) now correctly
// appears on screen right.
const PZ = -1;  // sign flip for physics → three.js z mapping

const COLORS = {
    skyTop:    0x4f9cd9,
    skyBottom: 0x9ec5e8,
    // Grass stripe colours per JJ's polish guide: matte/muted, not
    // saturated. Earlier values (#5cb846 / #2f7820) read as plastic-bright.
    pitchLight: 0x4d8c2e,
    pitchDark:  0x386b22,
    pitchLine:  0xc8c0b0,  // chalk off-white — keeps lines below the bloom threshold so they read matte, not glowing
    goalPost: 0xfafafa,
    goalNet:  0xffffff,
    bannerRed:   0xc62828,
    bannerWhite: 0xf5f5f5,
    bannerBlue:  0x2853a8,
    stadiumTier: 0x4a5560,
    stadiumRoof: 0x2a3540,
    crowd:    0x6b7a8a,
    defenderShirt: 0x2853a8,
    defenderShirtAlt: 0xc62828,
    defenderShorts: 0xf5f5f5,
    defenderSkin:   0xe6b58a,
    targetPlus10: 0xffd54a,
    targetHeart:  0xff4763,
    trail: 0xfff599,
};

export class FreeKickScene3D {
    constructor(container) {
        this.container = container;
        this.resize();

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(COLORS.skyBottom);
        // Atmospheric fog: distant stadium fades into haze (real cameras
        // pick up Rayleigh scattering over distance — a strong realism cue).
        this.scene.fog = new THREE.Fog(0xb8d4e8, 35, 110);

        this.camera = new THREE.PerspectiveCamera(CAMERA_FOV_DEG, this.width / this.height, 0.1, 200);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.width, this.height);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;
        // Shadows
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);
        this.canvas = this.renderer.domElement;

        // Post-processing pipeline (renderer + camera now exist)
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        const bloom = new UnrealBloomPass(
            new THREE.Vector2(this.width, this.height),
            0.35,   // strength — subtle
            0.6,    // radius
            0.85    // threshold — only the brightest highlights bloom
        );
        this.composer.addPass(bloom);

        // Vignette + contrast/saturation pass (broadcast TV gloss).
        // Darkens the frame corners and pushes mid-tones for richer
        // colour — matches the JJ-recommended polish stack.
        const vignettePass = new ShaderPass({
            uniforms: {
                tDiffuse:   { value: null },
                vignetteAmt:{ value: 0.45 },   // 0 = none, 1 = harsh
                contrast:   { value: 0.08 },   // pushed slightly
                saturation: { value: 0.12 },   // pushed slightly
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float vignetteAmt;
                uniform float contrast;
                uniform float saturation;
                varying vec2 vUv;
                void main() {
                    vec4 texel = texture2D(tDiffuse, vUv);
                    // Vignette: darken radius from center
                    vec2 d = vUv - 0.5;
                    float v = 1.0 - dot(d, d) * vignetteAmt * 2.2;
                    vec3 col = texel.rgb * v;
                    // Contrast: pivot around 0.5
                    col = (col - 0.5) * (1.0 + contrast) + 0.5;
                    // Saturation: lerp from luma
                    float luma = dot(col, vec3(0.299, 0.587, 0.114));
                    col = mix(vec3(luma), col, 1.0 + saturation);
                    gl_FragColor = vec4(col, texel.a);
                }
            `,
        });
        this.composer.addPass(vignettePass);

        this.composer.addPass(new OutputPass());
        this.bloomPass = bloom;

        this.buildLights();
        this.buildSky();
        this.buildPitch();
        this.buildStadium();
        this.buildGoal();

        this.defenderGroup = new THREE.Group();
        this.scene.add(this.defenderGroup);

        this.targetGroup = new THREE.Group();
        this.scene.add(this.targetGroup);

        this.buildBall();
        this.buildTrail();

        // Cache target textures (built once, reused per shot via addTargetMesh)
        this.bullseyeTex = this.buildBullseyeTexture();
        this.heartTex = this.buildHeartTexture();

        // Try loading glTF models that override the procedural meshes.
        // Drop .glb files in public/assets/models/ to use them.
        this.modelOverrides = {};
        this.tryLoadGltfModels();

        // Listeners
        window.addEventListener('resize', () => this.onResize());
        this.attachGestureInput();

        // Run state
        this.runState = initialRunState();
        this.shotIndex = 0;
        this.gestureLocked = false;
        this.onHUDUpdate = null;
        this.onResult = null;

        this.startNewShot();
        this.animate();
    }

    resize() {
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
    }

    onResize() {
        this.resize();
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height);
        if (this.composer) this.composer.setSize(this.width, this.height);
    }

    // ============================================================
    // === Scene construction ===
    // ============================================================

    buildLights() {
        // Cool sky-fill ambient (subtle blue tint from sky)
        const sky = new THREE.HemisphereLight(0xb6d6ff, 0x4a5a3a, 0.6);
        this.scene.add(sky);

        // Warm sun — directional, casts shadows
        const sun = new THREE.DirectionalLight(0xfff5d0, 1.2);
        sun.position.set(8, 22, 12);
        sun.castShadow = true;
        // Tighten shadow camera to the playable area for sharper shadows
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 1;
        sun.shadow.camera.far = 80;
        sun.shadow.camera.left = -25;
        sun.shadow.camera.right = 25;
        sun.shadow.camera.top = 25;
        sun.shadow.camera.bottom = -25;
        sun.shadow.bias = -0.0005;
        this.scene.add(sun);
        this.sun = sun;
    }

    buildSky() {
        // Simple gradient background via vertex colours on a large sphere
        const skyGeo = new THREE.SphereGeometry(150, 32, 16);
        const skyMat = new THREE.ShaderMaterial({
            side: THREE.BackSide,
            vertexShader: `
                varying vec3 vWorld;
                void main() {
                    vWorld = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec3 vWorld;
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                void main() {
                    float t = clamp((vWorld.y + 50.0) / 100.0, 0.0, 1.0);
                    gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
                }
            `,
            uniforms: {
                topColor:    { value: new THREE.Color(COLORS.skyTop) },
                bottomColor: { value: new THREE.Color(COLORS.skyBottom) },
            },
        });
        const sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(sky);
    }

    buildPitch() {
        // Wrap all procedural pitch elements in a single group so we
        // can toggle visibility together (Path B mode hides everything
        // here when the stadium model takes over the playable area).
        this.pitchGroup = new THREE.Group();
        this.scene.add(this.pitchGroup);

        const tex = this.buildGrassTexture();

        // Real FIFA pitch proportions: 68 m wide × 70 m deep representing
        // "kicker's attacking half" (with the halfway line visible at the
        // far end). Back edge at z = -2 m (small dead area behind goal),
        // front edge at z = +68 m.
        const pitchGeo = new THREE.PlaneGeometry(68, 70);
        const pitchMat = new THREE.MeshStandardMaterial({
            map: tex,
            roughness: 0.9,
            metalness: 0.0,
        });
        const pitch = new THREE.Mesh(pitchGeo, pitchMat);
        pitch.rotation.x = -Math.PI / 2;
        pitch.position.set(0, 0, 33);
        pitch.receiveShadow = true;
        this.pitchGroup.add(pitch);

        // Surround — concrete grey, NOT grass. Makes the pitch read as
        // a bounded rectangle with the goal at one end, instead of
        // "world is grass" with the goal floating in the middle.
        const surroundMat = new THREE.MeshLambertMaterial({ color: 0x2a2e34 });
        const surroundGeo = new THREE.PlaneGeometry(240, 240);
        const surround = new THREE.Mesh(surroundGeo, surroundMat);
        surround.rotation.x = -Math.PI / 2;
        surround.position.y = -0.01;
        surround.receiveShadow = true;
        this.pitchGroup.add(surround);

        // === Pitch markings (FIFA dimensions) ===
        const lineMat = new THREE.MeshBasicMaterial({ color: COLORS.pitchLine });
        const lineMatDouble = new THREE.MeshBasicMaterial({
            color: COLORS.pitchLine, side: THREE.DoubleSide,
        });

        // Goal-line at z = 0, 68 m wide (full pitch width)
        const goalLine = new THREE.Mesh(new THREE.PlaneGeometry(68, 0.18), lineMat);
        goalLine.rotation.x = -Math.PI / 2;
        goalLine.position.set(0, 0.005, 0);
        this.pitchGroup.add(goalLine);

        // Side-lines at x = ±34, running from goal-line to back edge (68 m)
        const sideLineGeo = new THREE.PlaneGeometry(0.18, 68);
        for (const sx of [-34, 34]) {
            const sl = new THREE.Mesh(sideLineGeo, lineMat);
            sl.rotation.x = -Math.PI / 2;
            sl.position.set(sx, 0.005, 34);
            this.pitchGroup.add(sl);
        }

        // Half-way line at z = +52.5 m (real distance from goal-line on
        // a 105 m pitch — pitch back edge at z = +68 leaves the line
        // clearly visible mid-frame).
        const halfLine = new THREE.Mesh(new THREE.PlaneGeometry(68, 0.18), lineMat);
        halfLine.rotation.x = -Math.PI / 2;
        halfLine.position.set(0, 0.005, 52.5);
        this.pitchGroup.add(halfLine);

        // Centre circle at halfway line (radius 9.15 m)
        const centreRing = new THREE.Mesh(
            new THREE.RingGeometry(9.06, 9.24, 64),
            lineMatDouble
        );
        centreRing.rotation.x = -Math.PI / 2;
        centreRing.position.set(0, 0.006, 52.5);
        this.pitchGroup.add(centreRing);

        // Penalty area (16.5 m × 40.3 m)
        const penaltyLines = [
            { geo: new THREE.PlaneGeometry(40.3, 0.18), pos: [0, 0.005, 16.5] },
            { geo: new THREE.PlaneGeometry(0.18, 16.5), pos: [-20.15, 0.005, 8.25] },
            { geo: new THREE.PlaneGeometry(0.18, 16.5), pos: [+20.15, 0.005, 8.25] },
        ];
        for (const l of penaltyLines) {
            const m = new THREE.Mesh(l.geo, lineMat);
            m.rotation.x = -Math.PI / 2;
            m.position.set(l.pos[0], l.pos[1], l.pos[2]);
            this.pitchGroup.add(m);
        }

        // 6-yard box (5.5 m × 18.32 m)
        const sixYardLines = [
            { geo: new THREE.PlaneGeometry(18.32, 0.18), pos: [0, 0.005, 5.5] },
            { geo: new THREE.PlaneGeometry(0.18, 5.5), pos: [-9.16, 0.005, 2.75] },
            { geo: new THREE.PlaneGeometry(0.18, 5.5), pos: [+9.16, 0.005, 2.75] },
        ];
        for (const l of sixYardLines) {
            const m = new THREE.Mesh(l.geo, lineMat);
            m.rotation.x = -Math.PI / 2;
            m.position.set(l.pos[0], l.pos[1], l.pos[2]);
            this.pitchGroup.add(m);
        }

        // Penalty spot at z = +11, centre spot at z = +52.5
        const spotGeo = new THREE.CircleGeometry(0.2, 16);
        const penaltySpot = new THREE.Mesh(spotGeo, lineMat);
        penaltySpot.rotation.x = -Math.PI / 2;
        penaltySpot.position.set(0, 0.006, 11);
        this.pitchGroup.add(penaltySpot);
        const centreSpot = penaltySpot.clone();
        centreSpot.position.set(0, 0.006, 52.5);
        this.pitchGroup.add(centreSpot);

        // D-arc (penalty area arc): portion of a 9.15 m radius circle
        // centred on the penalty spot that lies OUTSIDE the box edge
        // (z > 16.5). Box edge is 5.5 m from spot, so the arc subtends
        // ±acos(5.5/9.15) ≈ ±53° around the +Z direction (toward kicker).
        const dArcHalf = Math.acos(5.5 / 9.15);
        const dArc = new THREE.Mesh(
            new THREE.RingGeometry(9.06, 9.24, 32, 1, -Math.PI / 2 - dArcHalf, 2 * dArcHalf),
            lineMatDouble
        );
        dArc.rotation.x = -Math.PI / 2;
        dArc.position.set(0, 0.006, 11);
        this.pitchGroup.add(dArc);
    }

    // ============================================================
    // === glTF model overrides ===
    // ============================================================
    //
    // When a .glb file is present at the expected path, it replaces
    // the procedural mesh for that asset. The override prototypes are
    // CACHED — subsequent spawns clone the cached scene.

    tryLoadGltfModels() {
        const loader = new GLTFLoader();
        // MeshoptDecoder is required to decompress models optimized
        // with `gltf-transform optimize` (which we ran on the 211 MB
        // stadium model to shrink it to 14 MB). Without this, the
        // loader silently fails on meshopt-compressed assets.
        loader.setMeshoptDecoder(MeshoptDecoder);

        const optional = (key, path, onLoaded) => {
            loader.load(path, (gltf) => {
                this.modelOverrides[key] = gltf.scene;
                if (onLoaded) onLoaded(gltf.scene);
                console.log(`[scene3d] loaded glTF override: ${key}`);
            }, undefined, (err) => {
                console.warn(`[scene3d] glTF load failed for ${key} (${path}):`, err);
            });
        };
        // Each model's expected path. Authors of new assets should aim
        // for: Y-up, origin at the FEET (for players) or BASE (for ball
        // and goal). Scale is in METRES — match physics constants.
        //
        // NOTE: stadium.glb is intentionally not loaded. Flick Kick's
        // look uses 2D crowd backdrop + 3D goal/ball/defenders, and our
        // procedural scene + stadium-hero.png cylindrical backdrop
        // already matches that. The Sketchfab model was scope creep.
        optional('ball',      '/assets/models/ball.glb',      (s) => this.applyBallModel(s));
        optional('defender',  '/assets/models/defender.glb',  (s) => { this.rebuildAllDefenders(); });
        optional('goal',      '/assets/models/goal.glb',      (s) => this.applyGoalModel(s));
    }

    applyBallModel(scene) {
        // Replace primitive ball with the model. Keep rendering
        // position so the live trajectory animation continues.
        const model = scene.clone(true);
        // Ensure shadows + scale
        model.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = false;
            }
        });
        this.scene.remove(this.ballMesh);
        this.ballMesh = model;
        this.scene.add(this.ballMesh);
        this.ballMesh.position.copy(this.ballMeshLastPos || new THREE.Vector3(0, BALL_RELEASE_HEIGHT_M, 0));
    }

    applyGoalModel(scene) {
        const model = scene.clone(true);
        model.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });
        // Replace the procedural goal at origin
        this.scene.remove(this.goalGroup);
        this.goalGroup = model;
        this.scene.add(this.goalGroup);
    }

    rebuildAllDefenders() {
        // Called when defender model arrives async — rebuild all
        // currently-placed defenders using the new model.
        if (!this.wall) return;
        while (this.defenderGroup.children.length) {
            this.defenderGroup.remove(this.defenderGroup.children[0]);
        }
        for (let i = 0; i < this.wall.defenders.length; i++) {
            const def = this.wall.defenders[i];
            const cx = (def.minX + def.maxX) / 2;
            const cz = (def.minZ + def.maxZ) / 2;
            const defenderMesh = this.buildDefender(i);
            defenderMesh.position.set(cx, 0, cz * PZ);
            this.defenderGroup.add(defenderMesh);
        }
    }

    buildGrassTexture() {
        // High-resolution procedural grass: base + mowing stripe +
        // multi-octave noise + blade variation + dirt patches.
        const size = 1024;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Base green (dark stripe)
        ctx.fillStyle = '#386b22';
        ctx.fillRect(0, 0, size, size);

        // Mowing stripe — alternating bands. Vertical bands in canvas
        // map to LONGITUDINAL stripes in world space (running toward
        // goal along the Z axis after the plane's -π/2 X rotation).
        ctx.fillStyle = '#4d8c2e';
        ctx.fillRect(0, 0, size / 2, size);

        // Multi-frequency colour noise
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            // High-frequency pixel noise (subtle)
            const noise = (Math.random() - 0.5) * 25;
            // Low-frequency banding (gives subtle wave pattern)
            const x = (i / 4) % size;
            const y = Math.floor(i / 4 / size);
            const wave = Math.sin(x * 0.03) * Math.cos(y * 0.04) * 8;
            const variation = noise + wave;
            data[i + 0] = clamp255(data[i + 0] + variation);
            data[i + 1] = clamp255(data[i + 1] + variation * 1.1);
            data[i + 2] = clamp255(data[i + 2] + variation * 0.6);
        }
        ctx.putImageData(imageData, 0, 0);

        // Individual grass blade streaks — many small lines at slight angles
        for (let i = 0; i < 4000; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const len = 2 + Math.random() * 6;
            const dirVariation = Math.random() * 0.3 - 0.15;
            const dx = Math.sin(dirVariation) * len;
            const dy = -Math.cos(dirVariation) * len;
            // Color picked from a wider grass palette
            const r = Math.random();
            if (r < 0.35) ctx.strokeStyle = `rgba(95, 177, 66, ${0.25 + Math.random() * 0.4})`;
            else if (r < 0.65) ctx.strokeStyle = `rgba(46, 107, 30, ${0.25 + Math.random() * 0.4})`;
            else if (r < 0.85) ctx.strokeStyle = `rgba(72, 142, 50, ${0.2 + Math.random() * 0.4})`;
            else ctx.strokeStyle = `rgba(140, 180, 80, ${0.15 + Math.random() * 0.3})`;
            ctx.lineWidth = 0.8 + Math.random() * 0.8;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + dx, y + dy);
            ctx.stroke();
        }

        // Occasional dirt / wear patches (slightly browner)
        for (let i = 0; i < 12; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = 8 + Math.random() * 20;
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
            gradient.addColorStop(0, `rgba(120, 100, 50, ${0.10 + Math.random() * 0.10})`);
            gradient.addColorStop(1, 'rgba(120, 100, 50, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(10, 10);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 16;  // sharper at oblique angles (mobile may clamp)
        return tex;
    }

    buildStadium() {
        // Flick Kick-style stadium: a single tall cylinder with all
        // tiers baked into one canvas (lower crowd / ad band / upper
        // crowd / roof / shadow). FULL 360° wrap — the 270° arc tried
        // in v1.13 produced visible "edges" at the seam at oblique kick
        // angles, so we close the loop. The camera never sees behind
        // itself, so the extra geometry is cheap.
        const group = new THREE.Group();
        const STADIUM_RADIUS = 60;
        const STADIUM_HEIGHT = 14;

        const billboardTex = this.buildStadiumBillboardTexture();
        const billboardMat = new THREE.MeshBasicMaterial({
            map: billboardTex,
            side: THREE.BackSide,
            fog: false,
            transparent: true,
            depthWrite: false,
        });
        const billboard = new THREE.Mesh(
            new THREE.CylinderGeometry(
                STADIUM_RADIUS, STADIUM_RADIUS, STADIUM_HEIGHT,
                128, 1, true
            ),
            billboardMat
        );
        billboard.position.y = STADIUM_HEIGHT / 2;
        group.add(billboard);

        // Pitch-level ad boards behind the goal (separate from the
        // perimeter hoardings around the touch-lines). Flat panel,
        // FrontSide, using the real-logo canvas.
        const adTexFront = this.buildAdBoardTexture(false);
        const adPanelMat = new THREE.MeshBasicMaterial({
            map: adTexFront, fog: false,
        });
        // v1.15: enlarged from 60 × 1.4 m -> 60 × 2.2 m so the logos
        // actually read at distance.
        const adPanel = new THREE.Mesh(
            new THREE.PlaneGeometry(60, 2.2),
            adPanelMat
        );
        adPanel.position.set(0, 1.1, -3);
        group.add(adPanel);

        // Perimeter hoardings on both touch-lines, 3.5 m outside the
        // side-lines. v1.15: enlarged 0.9 -> 1.4 m tall, fewer
        // repetitions so each logo panel is wider and readable.
        const hoardingTex = this.buildAdBoardTexture(false);
        hoardingTex.repeat.set(15, 1);  // ~4.5 m per panel along 68 m
        const hoardingMat = new THREE.MeshBasicMaterial({
            map: hoardingTex,
            side: THREE.DoubleSide,
            fog: false,
        });
        const hoardingGeo = new THREE.PlaneGeometry(68, 1.4);
        const leftHoarding = new THREE.Mesh(hoardingGeo, hoardingMat);
        leftHoarding.position.set(-37.5, 0.70, 34);
        leftHoarding.rotation.y = Math.PI / 2;
        group.add(leftHoarding);
        const rightHoarding = new THREE.Mesh(hoardingGeo, hoardingMat);
        rightHoarding.position.set(+37.5, 0.70, 34);
        rightHoarding.rotation.y = -Math.PI / 2;
        group.add(rightHoarding);

        this.scene.add(group);
        this.stadiumGroup = group;
    }

    buildStadiumBillboardTexture() {
        // Single tall canvas combining all stadium tiers — drawn as
        // horizontal bands, then wrapped onto the billboard cylinder.
        // Vertical layout (top to bottom):
        //   0–10%   : sky bleed / roof
        //   10–35%  : upper crowd
        //   35–42%  : middle ad band (PIKPOK-style)
        //   42–88%  : lower crowd
        //   88–100% : pitch-level shadow gradient (fades to ground)
        const c = document.createElement('canvas');
        c.width = 4096;
        c.height = 1024;
        const ctx = c.getContext('2d');
        const W = c.width;
        const H = c.height;

        // Roof / sky bleed (very dark)
        const roofGrad = ctx.createLinearGradient(0, 0, 0, H * 0.10);
        roofGrad.addColorStop(0, 'rgba(34, 40, 50, 0.0)');
        roofGrad.addColorStop(1, '#222832');
        ctx.fillStyle = roofGrad;
        ctx.fillRect(0, 0, W, H * 0.10);

        // === Upper crowd band ===
        ctx.fillStyle = '#1c2028';
        ctx.fillRect(0, H * 0.10, W, H * 0.25);
        this._drawCrowdBand(ctx, 0, H * 0.10, W, H * 0.25, 14000);

        // === Middle ad band ===
        const adBandY = H * 0.35;
        const adBandH = H * 0.07;
        const adPanels = [
            { bg: '#c62828', fg: '#ffffff', label: 'SOLSHOT' },
            { bg: '#0c0c0c', fg: '#ffcd00', label: 'THE ARCADE' },
            { bg: '#9945ff', fg: '#ffffff', label: 'SOLANA' },
        ];
        const panelCycle = adPanels.length;
        const totalPanels = 24;
        const panelW = W / totalPanels;
        ctx.font = `bold ${Math.round(adBandH * 0.55)}px Impact, "Arial Black", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < totalPanels; i++) {
            const p = adPanels[i % panelCycle];
            ctx.fillStyle = p.bg;
            ctx.fillRect(i * panelW, adBandY, panelW, adBandH);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.fillRect(i * panelW, adBandY, 3, adBandH);
            ctx.fillStyle = p.fg;
            ctx.fillText(p.label, i * panelW + panelW / 2, adBandY + adBandH / 2);
        }

        // === Lower crowd band ===
        const lowerStart = H * 0.42;
        const lowerEnd = H * 0.88;
        ctx.fillStyle = '#1a1e26';
        ctx.fillRect(0, lowerStart, W, lowerEnd - lowerStart);
        this._drawCrowdBand(ctx, 0, lowerStart, W, lowerEnd - lowerStart, 24000);

        // === Pitch-level shadow fade ===
        const shadowGrad = ctx.createLinearGradient(0, H * 0.88, 0, H);
        shadowGrad.addColorStop(0, 'rgba(20, 22, 28, 0.0)');
        shadowGrad.addColorStop(1, '#101218');
        ctx.fillStyle = shadowGrad;
        ctx.fillRect(0, H * 0.88, W, H * 0.12);

        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        // Texture is already drawn left-to-right in correct order; the
        // BackSide cylinder mirrors it, so we mirror the texture U to
        // compensate — keeps the ad-band labels readable when wrapping.
        tex.repeat.x = -1;
        tex.offset.x = 1;
        return tex;
    }

    _drawCrowdBand(ctx, x0, y0, w, h, dotCount) {
        const skinTones = ['#e6b58a', '#c89970', '#a37b54', '#7a553c', '#5a3a2a'];
        const shirtColors = [
            '#c24a3a', '#e88a3a', '#4a72bb', '#ddc44a', '#eeeeee',
            '#6a4a2a', '#3d8a28', '#a02550', '#287ab0', '#f5a623',
            '#9e2222', '#1c5fb4', '#f0e5d2',
        ];
        for (let i = 0; i < dotCount; i++) {
            const x = x0 + Math.random() * w;
            const y = y0 + Math.random() * (h - 6);
            ctx.fillStyle = shirtColors[(Math.random() * shirtColors.length) | 0];
            ctx.fillRect(x, y + 2, 3, 4);
            ctx.fillStyle = skinTones[(Math.random() * skinTones.length) | 0];
            ctx.fillRect(x + 0.5, y, 2, 2);
        }
        // Faint tier-divider shadows (every ~h/4)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        for (let i = 1; i < 4; i++) {
            ctx.fillRect(x0, y0 + (h * i / 4) - 1, w, 2);
        }
    }

    buildCrowdTexture() {
        // Pixel-people crowd: dense scatter of small coloured blocks
        // representing torsos + skin-tone heads on a dark concrete
        // backdrop. Reads as crowd at any distance, tiles cleanly.
        const c = document.createElement('canvas');
        c.width = 2048;
        c.height = 256;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#1f242b';
        ctx.fillRect(0, 0, 2048, 256);

        const skinTones = ['#e6b58a', '#c89970', '#a37b54', '#7a553c', '#5a3a2a'];
        const shirtColors = [
            '#c24a3a', '#e88a3a', '#4a72bb', '#ddc44a', '#eeeeee',
            '#6a4a2a', '#3d8a28', '#a02550', '#287ab0', '#f5a623',
            '#9e2222', '#1c5fb4', '#f0e5d2',
        ];
        // Render in rows so the crowd has stadium-tier structure
        const rowCount = 10;
        const rowH = 256 / rowCount;
        for (let row = 0; row < rowCount; row++) {
            const baseY = row * rowH + 2;
            for (let i = 0; i < 900; i++) {
                const x = Math.random() * 2048;
                const jitterY = baseY + Math.random() * (rowH - 8);
                // Shirt block
                ctx.fillStyle = shirtColors[Math.floor(Math.random() * shirtColors.length)];
                ctx.fillRect(x, jitterY + 3, 3, 5);
                // Head block (skin)
                ctx.fillStyle = skinTones[Math.floor(Math.random() * skinTones.length)];
                ctx.fillRect(x + 0.5, jitterY, 2, 2);
            }
            // Subtle horizontal shadow between tiers
            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            ctx.fillRect(0, row * rowH + rowH - 2, 2048, 2);
        }

        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.repeat.set(3, 1);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        return tex;
    }

    buildAdBoardTexture(mirrored = false) {
        // Three sponsor logos rotate around the stadium. The logo images
        // are loaded async; the canvas is redrawn (and the texture
        // flagged needsUpdate) once each image arrives.
        //
        // `mirrored` horizontally flips the canvas so the texture reads
        // correctly on a BackSide cylinder (Three.js mirrors UVs across
        // U when rendering the inside of a cylinder).
        const c = document.createElement('canvas');
        c.width = 1536;
        c.height = 256;
        const ctx = c.getContext('2d');

        const panels = [
            { src: '/assets/advertising%20boards/SolShot.jpg' },
            { src: '/assets/advertising%20boards/The%20Arcade.png' },
            { src: '/assets/advertising%20boards/Solana.webp' },
        ];

        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.repeat.set(6, 1);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;

        const redraw = () => {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            if (mirrored) {
                ctx.translate(c.width, 0);
                ctx.scale(-1, 1);
            }
            // Black panel background
            ctx.fillStyle = '#0a0a0c';
            ctx.fillRect(0, 0, c.width, c.height);
            const panelW = c.width / panels.length;
            for (let i = 0; i < panels.length; i++) {
                const p = panels[i];
                const px = i * panelW;
                const padX = panelW * 0.03;
                const padY = c.height * 0.06;
                const targetW = panelW - 2 * padX;
                const targetH = c.height - 2 * padY;
                if (p.image) {
                    const aspect = p.image.width / p.image.height;
                    let drawW, drawH;
                    if (targetW / targetH > aspect) {
                        drawH = targetH;
                        drawW = drawH * aspect;
                    } else {
                        drawW = targetW;
                        drawH = drawW / aspect;
                    }
                    const drawX = px + padX + (targetW - drawW) / 2;
                    const drawY = padY + (targetH - drawH) / 2;
                    ctx.drawImage(p.image, drawX, drawY, drawW, drawH);
                } else {
                    // Placeholder block while loading
                    ctx.fillStyle = '#1a1a20';
                    ctx.fillRect(px + padX, padY, targetW, targetH);
                }
                // Thin panel divider
                ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
                ctx.fillRect(px, 0, 3, c.height);
            }
            tex.needsUpdate = true;
        };

        redraw();

        // Async image load: when each arrives, repaint the canvas.
        for (const p of panels) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => { p.image = img; redraw(); };
            img.onerror = () => console.warn('[scene3d] ad board image failed to load:', p.src);
            img.src = p.src;
        }

        return tex;
    }

    buildGoal() {
        const group = new THREE.Group();
        const postRadius = POST_RADIUS_M * 1.8;
        const postMat = new THREE.MeshStandardMaterial({
            color: COLORS.goalPost,
            roughness: 0.4,
            metalness: 0.0,
        });

        const leftPost = new THREE.Mesh(
            new THREE.CylinderGeometry(postRadius, postRadius, GOAL_HEIGHT_M, 24),
            postMat
        );
        leftPost.position.set(-GOAL_HALF_WIDTH_M, GOAL_HEIGHT_M / 2, 0);
        leftPost.castShadow = true;
        group.add(leftPost);

        const rightPost = leftPost.clone();
        rightPost.position.x = +GOAL_HALF_WIDTH_M;
        rightPost.castShadow = true;
        group.add(rightPost);

        // Crossbar length matches the goal width exactly — no overhang
        // beyond the posts. Corner spheres (added below) mask the joints
        // and produce the unified single-bent-tube look from Flick Kick.
        const crossbar = new THREE.Mesh(
            new THREE.CylinderGeometry(postRadius, postRadius, GOAL_WIDTH_M, 24),
            postMat
        );
        crossbar.position.set(0, GOAL_HEIGHT_M, 0);
        crossbar.rotation.z = Math.PI / 2;
        crossbar.castShadow = true;
        group.add(crossbar);

        // Net depth — behind the goal-line in physics is +z; in Three.js
        // (after the PZ flip) that's -z (further from camera).
        const netDepth = 1.5;

        // === Corner spheres: mask the cylinder-end joins at all four
        // top corners so the goal reads as a single bent frame rather
        // than three disconnected pieces ===
        const cornerGeo = new THREE.SphereGeometry(postRadius, 16, 12);
        for (const sx of [-GOAL_HALF_WIDTH_M, GOAL_HALF_WIDTH_M]) {
            const frontCorner = new THREE.Mesh(cornerGeo, postMat);
            frontCorner.position.set(sx, GOAL_HEIGHT_M, 0);
            frontCorner.castShadow = true;
            group.add(frontCorner);
        }

        // === Stanchions: rear vertical poles + horizontal top stays ===
        const stanchionRadius = postRadius * 0.75;
        const stanchionGeo = new THREE.CylinderGeometry(
            stanchionRadius, stanchionRadius, GOAL_HEIGHT_M, 16
        );
        for (const sx of [-GOAL_HALF_WIDTH_M, GOAL_HALF_WIDTH_M]) {
            const stanchion = new THREE.Mesh(stanchionGeo, postMat);
            stanchion.position.set(sx, GOAL_HEIGHT_M / 2, netDepth * PZ);
            stanchion.castShadow = true;
            group.add(stanchion);
        }
        const stayGeo = new THREE.CylinderGeometry(
            stanchionRadius, stanchionRadius, netDepth, 16
        );
        for (const sx of [-GOAL_HALF_WIDTH_M, GOAL_HALF_WIDTH_M]) {
            const stay = new THREE.Mesh(stayGeo, postMat);
            stay.position.set(sx, GOAL_HEIGHT_M, (netDepth / 2) * PZ);
            stay.rotation.x = Math.PI / 2;
            stay.castShadow = true;
            group.add(stay);
            // Rear-top corner sphere where stay meets stanchion
            const rearCorner = new THREE.Mesh(cornerGeo, postMat);
            rearCorner.position.set(sx, GOAL_HEIGHT_M, netDepth * PZ);
            rearCorner.castShadow = true;
            group.add(rearCorner);
        }

        // === Net: alpha-tested grid texture on back + top + sides ===
        const netCanvas = this._buildNetCanvas();
        const makeNetMat = (rx, ry) => {
            const t = new THREE.CanvasTexture(netCanvas);
            t.wrapS = THREE.RepeatWrapping;
            t.wrapT = THREE.RepeatWrapping;
            t.colorSpace = THREE.SRGBColorSpace;
            t.repeat.set(rx, ry);
            // depthWrite: true is critical — without it the stadium
            // billboard (also transparent) renders OVER the net's woven
            // pixels because no z-buffer info gets written for the net.
            // alphaTest discards the hole pixels cleanly, so we can
            // treat the net as opaque for depth-buffer purposes.
            return new THREE.MeshBasicMaterial({
                map: t,
                transparent: false,
                alphaTest: 0.5,
                side: THREE.DoubleSide,
                color: 0xe8e8e0,
                depthWrite: true,
                fog: false,
            });
        };
        // ~0.20 m cells: net canvas is 12 cells, so cells per repeat = 12.
        // repeat.x = width_m / (cells_per_repeat * cell_m).
        const cellM = 0.20;
        const cyclesPerRepeat = 12;
        const r = (m) => m / (cyclesPerRepeat * cellM);

        const netBack = new THREE.Mesh(
            new THREE.PlaneGeometry(GOAL_WIDTH_M, GOAL_HEIGHT_M),
            makeNetMat(r(GOAL_WIDTH_M), r(GOAL_HEIGHT_M))
        );
        netBack.position.set(0, GOAL_HEIGHT_M / 2, netDepth * PZ);
        group.add(netBack);

        const netTop = new THREE.Mesh(
            new THREE.PlaneGeometry(GOAL_WIDTH_M, netDepth),
            makeNetMat(r(GOAL_WIDTH_M), r(netDepth))
        );
        netTop.position.set(0, GOAL_HEIGHT_M, (netDepth / 2) * PZ);
        netTop.rotation.x = -Math.PI / 2;
        group.add(netTop);

        const netSideMat = makeNetMat(r(netDepth), r(GOAL_HEIGHT_M));
        const netLeft = new THREE.Mesh(
            new THREE.PlaneGeometry(netDepth, GOAL_HEIGHT_M),
            netSideMat
        );
        netLeft.position.set(-GOAL_HALF_WIDTH_M, GOAL_HEIGHT_M / 2, (netDepth / 2) * PZ);
        netLeft.rotation.y = Math.PI / 2;
        group.add(netLeft);
        const netRight = new THREE.Mesh(
            new THREE.PlaneGeometry(netDepth, GOAL_HEIGHT_M),
            netSideMat
        );
        netRight.position.set(+GOAL_HALF_WIDTH_M, GOAL_HEIGHT_M / 2, (netDepth / 2) * PZ);
        netRight.rotation.y = -Math.PI / 2;
        group.add(netRight);

        this.scene.add(group);
        this.goalGroup = group;
    }

    _buildNetCanvas() {
        // Higher-density grid for the Flick Kick look — thicker weave,
        // brighter chalk-off-white that still stays under bloom.
        const c = document.createElement('canvas');
        c.width = 256;
        c.height = 256;
        const ctx = c.getContext('2d');
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.strokeStyle = '#dcd6c8';
        ctx.lineWidth = 3;
        ctx.lineCap = 'square';
        const cells = 12;
        const step = c.width / cells;
        for (let i = 0; i <= cells; i++) {
            const p = Math.round(i * step) + 0.5;
            ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, c.height); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(c.width, p); ctx.stroke();
        }
        return c;
    }

    buildDefender(index) {
        // Use glTF model if loaded (still supported for future overrides).
        if (this.modelOverrides.defender) {
            const model = this.modelOverrides.defender.clone(true);
            model.traverse((node) => {
                if (node.isMesh) node.castShadow = true;
            });
            return model;
        }

        // Training-dummy silhouette: weighted base + capsule body +
        // sphere head. Colours alternate red / blue per dummy (v1.15) so
        // the wall reads as two teams of mannequins rather than a
        // monochrome bar.
        const group = new THREE.Group();
        // v1.16: vivid kit colours so dummies read clearly at distance
        // against the green pitch + dark crowd backdrop.
        const dummyColors = [0xe23838, 0x2c74d6];  // bright red, bright blue
        const dummyMat = new THREE.MeshStandardMaterial({
            color: dummyColors[index % dummyColors.length],
            roughness: 0.55,
            metalness: 0.05,
        });
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x222530,  // dark base
            roughness: 0.85,
            metalness: 0.0,
        });
        const castShadow = (m) => { m.castShadow = true; return m; };

        // Weighted base (sandbag ring) — always dark, regardless of dummy colour
        const base = castShadow(new THREE.Mesh(
            new THREE.CylinderGeometry(0.40, 0.40, 0.10, 32),
            baseMat
        ));
        base.position.y = 0.05;
        group.add(base);

        // Capsule body (chest)
        const body = castShadow(new THREE.Mesh(
            new THREE.CapsuleGeometry(0.22, 1.30, 4, 16),
            dummyMat
        ));
        body.position.y = 0.10 + 0.22 + 0.65;  // base top + bottom hemi + half length
        group.add(body);

        // Sphere head
        const head = castShadow(new THREE.Mesh(
            new THREE.SphereGeometry(0.18, 16, 12),
            dummyMat
        ));
        head.position.y = 0.10 + 0.22 + 1.30 + 0.22 + 0.18;  // base + bottom hemi + length + top hemi + head r
        group.add(head);

        return group;
    }

    buildBall() {
        // Sphere with classic Telstar texture (procedurally drawn)
        const ballCanvas = document.createElement('canvas');
        ballCanvas.width = 512;
        ballCanvas.height = 256;
        const ctx = ballCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 512, 256);
        ctx.fillStyle = '#111111';
        // Distribute pentagons across the equirectangular mapping
        const pentagonPositions = [
            [0.15, 0.50], [0.35, 0.30], [0.35, 0.70], [0.55, 0.50],
            [0.75, 0.30], [0.75, 0.70], [0.95, 0.50],
            [0.20, 0.15], [0.20, 0.85], [0.60, 0.15], [0.60, 0.85],
        ];
        for (const [u, v] of pentagonPositions) {
            const x = u * 512;
            const y = v * 256;
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const a = -Math.PI / 2 + i * 2 * Math.PI / 5;
                const px = x + Math.cos(a) * 22;
                const py = y + Math.sin(a) * 22;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
        }
        const ballTex = new THREE.CanvasTexture(ballCanvas);
        ballTex.colorSpace = THREE.SRGBColorSpace;
        const ballMat = new THREE.MeshStandardMaterial({
            map: ballTex,
            roughness: 0.55,
            metalness: 0.0,
        });
        const ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_RADIUS_M, 32, 24), ballMat);
        ball.castShadow = true;
        this.scene.add(ball);
        this.ballMesh = ball;
    }

    buildTrail() {
        this.trailPositions = [];
        this.trailMesh = null;
    }

    // ============================================================
    // === Per-shot lifecycle ===
    // ============================================================

    startNewShot() {
        // Clear shot-scoped visuals from the prior shot
        this.removeMissMarker();
        this.targetSwings = [];
        this.targetMeshes = { plus10: null, heart: null };
        this.wallFrozenOffset = null;
        this.currentWallShiftX = 0;

        this.scenario = generateScenario({
            attemptSeed: ATTEMPT_SEED,
            shotIndex: this.shotIndex,
            goalCount: this.runState.goalCount,
        });

        this.ballPos = ballReleasePos(this.scenario);
        // Place ball in Three.js space (physics z flipped via PZ)
        this.ballMesh.position.set(this.ballPos.x, this.ballPos.y, this.ballPos.z * PZ);
        this.applyFireBallMaterial(this.fireShotPending === true);

        // Camera positioned behind ball along ball→goal-centre line,
        // in Three.js space (so it sits on +Z side and looks at origin).
        const ballThreeZ = this.ballPos.z * PZ;  // positive: ball is in +z half
        const goalDir = new THREE.Vector3(-this.ballPos.x, 0, -ballThreeZ).normalize();
        this.camera.position.set(
            this.ballPos.x - goalDir.x * CAMERA_PULLBACK_M,
            CAMERA_HEIGHT_M,
            ballThreeZ - goalDir.z * CAMERA_PULLBACK_M,
        );
        this.camera.lookAt(0, CAMERA_LOOK_AT_Y, 0);

        // Build wall defenders
        this.wall = wallGeometry({ ballPos: this.ballPos, scenario: this.scenario });
        while (this.defenderGroup.children.length) {
            const child = this.defenderGroup.children[0];
            this.defenderGroup.remove(child);
        }
        // Match the physics hit-box scaling — dummies shrink slightly
        // on long shots so the goal is visible past the wall.
        const dummyScale = dummyScaleForDistance(this.scenario.distanceM);
        for (let i = 0; i < this.wall.defenders.length; i++) {
            const def = this.wall.defenders[i];
            const cx = (def.minX + def.maxX) / 2;
            const cz = (def.minZ + def.maxZ) / 2;
            const defenderMesh = this.buildDefender(i);
            defenderMesh.position.set(cx, 0, cz * PZ);
            defenderMesh.scale.setScalar(dummyScale);
            // Sway state — small lateral oscillation in animate() loop
            defenderMesh.userData.swayBaseX = cx;
            defenderMesh.userData.swayPhase = i * 0.7;
            this.defenderGroup.add(defenderMesh);
        }

        // Build targets
        while (this.targetGroup.children.length) {
            this.targetGroup.remove(this.targetGroup.children[0]);
        }
        if (this.scenario.plus10Target) this.addTargetMesh(this.scenario.plus10Target, 'plus10');
        if (this.scenario.heartTarget)  this.addTargetMesh(this.scenario.heartTarget,  'heart');

        // Clear trail
        this.trailPositions = [];
        this.rebuildTrail();

        this.gestureLocked = false;
        if (this.onHUDUpdate) this.onHUDUpdate({
            lives: this.runState.lives,
            score: this.runState.score,
            scenario: this.scenario,
        });
    }

    addTargetMesh(target, kind) {
        // Bullseye for +10 point targets, red heart for extra-life targets.
        // The square 0.6 × 0.6 m plane (TARGET_HALF_*_M = 0.30) matches the
        // hit-detection box used by the physics, so what you see is what
        // you can hit.
        const tex = kind === 'plus10' ? this.bullseyeTex : this.heartTex;
        const halfW = kind === 'plus10' ? TARGET_HALF_WIDTH_M  : HEART_HALF_WIDTH_M;
        const halfH = kind === 'plus10' ? TARGET_HALF_HEIGHT_M : HEART_HALF_HEIGHT_M;
        const geo = new THREE.PlaneGeometry(halfW * 2, halfH * 2);
        const mat = new THREE.MeshBasicMaterial({
            map: tex,
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: false,
        });
        const mesh = new THREE.Mesh(geo, mat);
        // Target sits 0.18 m in front of the goal-plane (physics z=0)
        // so the alpha-tested net behind it can't ever z-fight over
        // the bullseye / heart. renderOrder forces transparent sort
        // to draw the target after the net.
        mesh.position.set(target.x, target.y, 0.18);
        mesh.renderOrder = 50;
        this.targetGroup.add(mesh);
        // Save the mesh ref so resolveShot can swing it on hit
        if (!this.targetMeshes) this.targetMeshes = { plus10: null, heart: null };
        this.targetMeshes[kind] = mesh;
    }

    buildBullseyeTexture() {
        // Classic archery target: concentric red and white rings on a
        // transparent canvas. Outer ring white, then alternating, with
        // a red bullseye centre. The canvas is square so the texture
        // applied to the square target plane produces a perfect circle.
        const c = document.createElement('canvas');
        c.width = 256;
        c.height = 256;
        const ctx = c.getContext('2d');
        const cx = c.width / 2;
        const cy = c.height / 2;

        // White rings desaturated to chalk (#d8d2c4) so they stay below
        // the bloom threshold — pure white was haloing on the bullseye.
        const rings = [
            { r: 124, color: '#d8d2c4' },
            { r: 104, color: '#c81e28' },
            { r: 84,  color: '#d8d2c4' },
            { r: 64,  color: '#c81e28' },
            { r: 44,  color: '#d8d2c4' },
            { r: 22,  color: '#c81e28' },
        ];
        for (const ring of rings) {
            ctx.beginPath();
            ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
            ctx.fillStyle = ring.color;
            ctx.fill();
        }
        // Outer dark stroke for definition against white goal frame
        ctx.beginPath();
        ctx.arc(cx, cy, 124, 0, Math.PI * 2);
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 4;
        ctx.stroke();

        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        return tex;
    }

    buildHeartTexture() {
        // Filled red heart on transparent canvas. Two cubic bezier
        // curves form the left and right lobes meeting at a top dip
        // and a bottom point. Includes drop shadow, gradient fill,
        // dark outline, and a highlight to read clearly at distance.
        const c = document.createElement('canvas');
        c.width = 256;
        c.height = 256;
        const ctx = c.getContext('2d');
        const cx = c.width / 2;
        const size = 200;

        const drawHeartPath = () => {
            const topY = c.height / 2 - size * 0.18;
            const bottomY = c.height / 2 + size * 0.42;
            const halfW = size * 0.5;
            ctx.beginPath();
            ctx.moveTo(cx, topY);
            ctx.bezierCurveTo(
                cx - halfW, topY - size * 0.32,
                cx - halfW, topY + size * 0.22,
                cx, bottomY
            );
            ctx.bezierCurveTo(
                cx + halfW, topY + size * 0.22,
                cx + halfW, topY - size * 0.32,
                cx, topY
            );
            ctx.closePath();
        };

        // Drop shadow
        ctx.save();
        ctx.translate(3, 5);
        drawHeartPath();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fill();
        ctx.restore();

        // Red gradient fill
        drawHeartPath();
        const grad = ctx.createLinearGradient(0, 30, 0, 220);
        grad.addColorStop(0, '#ff4060');
        grad.addColorStop(1, '#c01828');
        ctx.fillStyle = grad;
        ctx.fill();

        // Dark outline
        drawHeartPath();
        ctx.strokeStyle = '#7a1218';
        ctx.lineWidth = 5;
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Highlight on the left lobe
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.beginPath();
        ctx.ellipse(cx - 32, c.height / 2 - 38, 14, 9, -0.5, 0, Math.PI * 2);
        ctx.fill();

        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        return tex;
    }

    // ============================================================
    // === Input ===
    // ============================================================

    attachGestureInput() {
        const samples = [];
        let tracking = false;
        let startTime = 0;

        const getPoint = (event) => {
            const rect = this.canvas.getBoundingClientRect();
            const t = (event.touches && event.touches[0]) || event;
            return {
                x: t.clientX - rect.left,
                y: t.clientY - rect.top,
                screenW: rect.width,
                screenH: rect.height,
            };
        };

        const onDown = (e) => {
            if (this.gestureLocked || this.runState.runEnded) return;
            e.preventDefault();
            samples.length = 0;
            tracking = true;
            startTime = performance.now();
            const p = getPoint(e);
            samples.push({ x: p.x, y: p.y, t: 0 });
        };

        const onMove = (e) => {
            if (!tracking) return;
            e.preventDefault();
            const p = getPoint(e);
            const t = performance.now() - startTime;
            const last = samples[samples.length - 1];
            if (last && last.x === p.x && last.y === p.y) return;
            samples.push({ x: p.x, y: p.y, t });
        };

        const onUp = (e) => {
            if (!tracking) return;
            e.preventDefault();
            tracking = false;
            if (samples.length < 3) { samples.length = 0; return; }
            const result = extractInputs([...samples]);
            samples.length = 0;
            if (result.invalid) return;
            this.fireShot(result);
        };

        this.canvas.addEventListener('mousedown',   onDown);
        this.canvas.addEventListener('mousemove',   onMove);
        this.canvas.addEventListener('mouseup',     onUp);
        this.canvas.addEventListener('mouseleave',  onUp);
        this.canvas.addEventListener('touchstart',  onDown, { passive: false });
        this.canvas.addEventListener('touchmove',   onMove, { passive: false });
        this.canvas.addEventListener('touchend',    onUp,   { passive: false });
        this.canvas.addEventListener('touchcancel', onUp,   { passive: false });
    }

    fireShot(extractResult) {
        if (this.gestureLocked) return;
        this.gestureLocked = true;
        this.activeFireShot = this.fireShotPending === true;
        // Capture the current wall offset so the physics evaluates the
        // wall at the exact position the player kicked against, and
        // freeze the rendered wall there until the shot resolves.
        this.wallFrozenOffset = this.currentWallShiftX || 0;
        const simScenario = { ...this.scenario, wallShiftX: this.wallFrozenOffset };
        const sim = simulateShot({
            shotInput: extractResult,
            scenario: simScenario,
            skipWall: this.activeFireShot,
        });
        this.animateTrajectory(sim);
    }

    animateTrajectory(sim) {
        const traj = sim.trajectory;
        if (!traj.length) {
            this.resolveShot(sim);
            return;
        }
        let step = 0;
        const interval = (1000 / 60) / PLAYBACK_SPEED;
        this.trailPositions = [];

        const ticker = setInterval(() => {
            if (step >= traj.length) {
                clearInterval(ticker);
                setTimeout(() => this.fadeTrail(), 600);
                this.resolveShot(sim);
                return;
            }
            const p = traj[step];
            this.ballMesh.position.set(p.x, p.y, p.z * PZ);
            this.trailPositions.push(new THREE.Vector3(p.x, p.y, p.z * PZ));
            this.rebuildTrail();

            // Fire-ball: detect any dummies the ball passes through
            // and trigger their knock-over animation. Physics already
            // skipped the wall collision (skipWall=true), so this is
            // pure visual feedback — the ball doesn't slow down.
            //
            // The trajectory only samples once per 1/60 s (~0.42 m at
            // typical ball speed), but the defender AABB is only ~0.30 m
            // deep — the ball routinely jumps over the box between
            // samples. We subsample the segment between the previous and
            // current trajectory points so even fast shots register.
            if (this.activeFireShot && this.defenderGroup && this.wall) {
                const dummyScale = this.wall.dummyScale || 1;
                const halfW = (DEFENDER_WIDTH_M  * dummyScale) / 2;
                const halfD = (DEFENDER_DEPTH_M  * dummyScale) / 2;
                const maxY  =  DEFENDER_HEIGHT_M * dummyScale;
                const prev  = traj[Math.max(0, step - 1)];
                const SUBSTEPS = 6;
                for (let s = 1; s <= SUBSTEPS; s++) {
                    const tt = s / SUBSTEPS;
                    const sx = prev.x + (p.x - prev.x) * tt;
                    const sy = prev.y + (p.y - prev.y) * tt;
                    const sz = prev.z + (p.z - prev.z) * tt;
                    for (const mesh of this.defenderGroup.children) {
                        if (!mesh || mesh.userData.knockedTime != null) continue;
                        const meshZPhysics = mesh.position.z * PZ;
                        if (Math.abs(sx - mesh.position.x) <= halfW &&
                            Math.abs(sz - meshZPhysics)    <= halfD &&
                            sy >= 0 && sy <= maxY) {
                            mesh.userData.knockedTime = performance.now() / 1000;
                        }
                    }
                }
            }

            step++;
        }, interval);
    }

    rebuildTrail() {
        if (this.trailMesh) {
            this.scene.remove(this.trailMesh);
            this.trailMesh.geometry.dispose();
            this.trailMesh.material.dispose();
            this.trailMesh = null;
        }
        if (this.trailPositions.length < 2) return;
        const geo = new THREE.BufferGeometry().setFromPoints(this.trailPositions);
        const mat = new THREE.LineBasicMaterial({ color: COLORS.trail, transparent: true, opacity: 0.85, linewidth: 3 });
        this.trailMesh = new THREE.Line(geo, mat);
        this.scene.add(this.trailMesh);
    }

    fadeTrail() {
        // Simple fade — could be replaced with a tween library
        if (!this.trailMesh) return;
        const fadeStep = () => {
            if (!this.trailMesh) return;
            this.trailMesh.material.opacity *= 0.85;
            if (this.trailMesh.material.opacity < 0.05) {
                this.scene.remove(this.trailMesh);
                this.trailMesh.geometry.dispose();
                this.trailMesh.material.dispose();
                this.trailMesh = null;
                return;
            }
            setTimeout(fadeStep, 40);
        };
        fadeStep();
    }

    resolveShot(sim) {
        const r = applyShot(this.runState, sim.result);
        this.runState = r.state;
        this.shotIndex += 1;

        const wasGoal = isGoal(sim.result);

        // Hat-trick streak tracking: 3 goals in a row → next shot is
        // fire-mode (skip wall, ball renders in flame colours).
        if (wasGoal) {
            this.goalStreak = (this.goalStreak || 0) + 1;
            if (this.goalStreak >= 3 && !this.activeFireShot) {
                this.fireShotPending = true;
                this.goalStreak = 0;
                this.showHatTrickOverlay();
            }
        } else {
            this.goalStreak = 0;
        }

        // Target swing + hit sound when a target was hit on goal
        if (wasGoal && sim.targetHit) {
            if (sim.targetHit.plus10 && this.targetMeshes?.plus10) {
                this.startTargetSwing(this.targetMeshes.plus10);
                this.playHitSound(660);
            }
            if (sim.targetHit.heart && this.targetMeshes?.heart) {
                this.startTargetSwing(this.targetMeshes.heart);
                this.playHitSound(880);
            }
        }

        // Red X miss marker at the goal-plane crossing (or final ball
        // position if the trajectory never reached the goal-line).
        if (!wasGoal) {
            const traj = sim.trajectory;
            const last = traj.length > 0 ? traj[traj.length - 1] : null;
            const cross = sim.crossing;
            if (cross) {
                this.addMissMarker(cross.x, Math.max(0.3, cross.y), 0.06);
            } else if (last) {
                this.addMissMarker(last.x, Math.max(0.3, last.y), last.z * PZ);
            }
        }

        if (this.onResult) this.onResult({ result: sim.result, runState: this.runState });

        // Fire-shot has now completed — reset pending flag
        if (this.activeFireShot) {
            this.fireShotPending = false;
            this.activeFireShot = false;
        }

        if (this.runState.runEnded) return;

        // Slow-mo replay for "show-off" goals: top corner shots OR any
        // goal that hits a heart target. Earlier thresholds (>65% height
        // AND >50% half-width) were too strict — the upper outer 17% of
        // the goal mouth, so most goals never qualified.
        const cornerGoal = wasGoal && sim.crossing &&
            sim.crossing.y > GOAL_HEIGHT_M * 0.55 &&
            Math.abs(sim.crossing.x) > GOAL_HALF_WIDTH_M * 0.40;
        const heartGoal = wasGoal && sim.targetHit && sim.targetHit.heart;
        const isReplayWorthy = cornerGoal || heartGoal;

        if (isReplayWorthy) {
            this.playReplay(sim, () => {
                setTimeout(() => this.startNewShot(), 400);
            });
        } else {
            setTimeout(() => this.startNewShot(), 1200);
        }
    }

    restart() {
        this.runState = initialRunState();
        this.shotIndex = 0;
        this.startNewShot();
    }

    // ============================================================
    // === Render loop ===
    // ============================================================

    animate() {
        requestAnimationFrame(() => this.animate());
        const t = performance.now() / 1000;

        // Wall lateral motion — the entire wall slides side-to-side on
        // shots whose scenario was tagged with wallMotion.active (~35%
        // of shots). On non-moving shots the dummies stay perfectly
        // still. Motion continues during trajectory playback (visual
        // only — the physics already captured wallShiftX at fire time).
        let wallOffsetX = 0;
        const motion = this.scenario && this.scenario.wallMotion;
        if (motion && motion.active) {
            wallOffsetX = Math.sin(
                t * 2 * Math.PI * motion.frequencyHz + motion.phase
            ) * motion.amplitudeM;
        }
        this.currentWallShiftX = wallOffsetX;
        if (this.defenderGroup) {
            for (const d of this.defenderGroup.children) {
                if (d.userData.swayBaseX == null) continue;
                // Knocked dummies stop tracking the wall motion and
                // tilt forward toward the goal over ~0.5 s.
                if (d.userData.knockedTime != null) {
                    const elapsed = t - d.userData.knockedTime;
                    const FALL_DURATION = 0.55;
                    const lifeT = Math.min(1, elapsed / FALL_DURATION);
                    const eased = 1 - Math.pow(1 - lifeT, 2.5);
                    d.rotation.x = -(Math.PI / 2) * eased;
                } else {
                    d.position.x = d.userData.swayBaseX + wallOffsetX;
                }
            }
        }

        // Target spin on hit — the target makes two full revolutions
        // around its vertical (Y) axis with an ease-out curve, then
        // settles. Y-axis spin is visible even on the rotationally
        // symmetric bullseye because the plane flips edge-on at every
        // 90° (with DoubleSide materials the back face still renders
        // the bullseye/heart as it comes around).
        if (this.targetSwings && this.targetSwings.length) {
            for (const s of this.targetSwings) {
                const e = t - s.startTime;
                if (e >= s.duration) {
                    s.mesh.rotation.y = 0;
                    s.done = true;
                } else {
                    const lifeT = e / s.duration;
                    // Cubic ease-out to 4π (two full revolutions)
                    const easedT = 1 - Math.pow(1 - lifeT, 3);
                    s.mesh.rotation.y = easedT * Math.PI * 4;
                }
            }
            this.targetSwings = this.targetSwings.filter(s => !s.done);
        }

        // Fire ball — animate the particle flame system. Each particle
        // ages (rises + shrinks + fades), then respawns near the ball.
        if (this.activeFireShot && this.ballMesh && this.ballMesh.material.emissiveIntensity != null) {
            this.ballMesh.material.emissiveIntensity = 0.85 + Math.sin(t * 14) * 0.15;
            if (this._flameGroup && this._flameGroup.visible) {
                const dt = Math.min(0.05, t - (this._lastFlameT || t));
                this._lastFlameT = t;
                for (const sprite of this._flameGroup.children) {
                    sprite.userData.age += dt;
                    if (sprite.userData.lifetime === 0 ||
                        sprite.userData.age >= sprite.userData.lifetime) {
                        this._respawnFlameParticle(sprite);
                    }
                    const lifeT = sprite.userData.age / sprite.userData.lifetime;
                    // Rise + drift sideways
                    sprite.position.y += sprite.userData.velocity * dt;
                    sprite.position.x += sprite.userData.lateralDrift * dt * (1 - lifeT);
                    // Shrink as it rises (taper toward the top)
                    const scale = sprite.userData.baseScale * (1 - lifeT * 0.55);
                    sprite.scale.set(scale, scale * 1.35, 1);
                    // Fade in fast, fade out slow
                    const fadeIn = Math.min(1, lifeT * 6);
                    const fadeOut = 1 - lifeT;
                    sprite.material.opacity = 0.65 * fadeIn * fadeOut;
                }
            }
        }

        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    // ============================================================
    // === Feedback effects (miss marker, target swing, sound,
    //     hat-trick overlay, fire ball, slow-mo replay) ===
    // ============================================================

    buildXMarkerTexture() {
        const c = document.createElement('canvas');
        c.width = 256; c.height = 256;
        const ctx = c.getContext('2d');
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 4;
        ctx.strokeStyle = '#ff2a32';
        ctx.lineWidth = 36;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(46, 46); ctx.lineTo(210, 210); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(210, 46); ctx.lineTo(46, 210); ctx.stroke();
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }

    addMissMarker(x, y, z) {
        this.removeMissMarker();
        if (!this._missMarkerTex) this._missMarkerTex = this.buildXMarkerTexture();
        const mat = new THREE.MeshBasicMaterial({
            map: this._missMarkerTex,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), mat);
        mesh.position.set(x, y, z);
        mesh.renderOrder = 999;
        // Face the camera roughly (the X is small enough that a fixed
        // forward orientation reads correctly across all kick angles).
        mesh.lookAt(this.camera.position);
        this.scene.add(mesh);
        this.missMarker = mesh;
    }

    removeMissMarker() {
        if (this.missMarker) {
            this.scene.remove(this.missMarker);
            this.missMarker.material.dispose();
            this.missMarker = null;
        }
    }

    startTargetSwing(mesh) {
        if (!this.targetSwings) this.targetSwings = [];
        this.targetSwings.push({
            mesh,
            startTime: performance.now() / 1000,
            duration: 1.6,
            done: false,
        });
    }

    playHitSound(freq = 660) {
        try {
            if (!this._audioCtx) {
                const Ctx = window.AudioContext || window.webkitAudioContext;
                if (!Ctx) return;
                this._audioCtx = new Ctx();
            }
            const ctx = this._audioCtx;
            const t = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.3, t + 0.18);
            gain.gain.setValueAtTime(0.22, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
            osc.connect(gain).connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.25);
        } catch (e) { /* audio failures are non-fatal */ }
    }

    showHatTrickOverlay() {
        const div = document.createElement('div');
        div.textContent = 'HAT-TRICK!';
        div.style.cssText = [
            'position: absolute',
            'top: 32%',
            'left: 50%',
            'transform: translate(-50%, -50%) scale(0.4) rotate(-3deg)',
            'font-family: Impact, "Arial Black", sans-serif',
            'font-size: 64px',
            'letter-spacing: 2px',
            'color: #ffcd00',
            'text-shadow: 4px 5px 0 #c01828, 0 0 30px #ff5020, 0 0 60px #ff8030',
            'opacity: 0',
            'transition: opacity 320ms, transform 480ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            'pointer-events: none',
            'z-index: 100',
        ].join('; ');
        this.container.appendChild(div);
        requestAnimationFrame(() => {
            div.style.opacity = '1';
            div.style.transform = 'translate(-50%, -50%) scale(1) rotate(-3deg)';
        });
        setTimeout(() => {
            div.style.opacity = '0';
            setTimeout(() => div.remove(), 400);
        }, 2200);
    }

    applyFireBallMaterial(isFire) {
        if (!this.ballMesh) return;
        if (isFire) {
            if (!this._fireBallMat) {
                this._fireBallMat = new THREE.MeshStandardMaterial({
                    color: 0xff4818,
                    emissive: 0xff2a08,
                    emissiveIntensity: 1.0,
                    roughness: 0.5,
                    metalness: 0.0,
                });
            }
            if (!this._normalBallMat) this._normalBallMat = this.ballMesh.material;
            this.ballMesh.material = this._fireBallMat;
            this._showFlameSprites();
        } else {
            if (this._normalBallMat) this.ballMesh.material = this._normalBallMat;
            this._hideFlameSprites();
        }
    }

    _buildFlameTexture() {
        // Procedural flame: vertical canvas with a hot yellow core
        // fading up through orange to red, with tapered alpha to a
        // tongue-shaped flame silhouette.
        const c = document.createElement('canvas');
        c.width = 128;
        c.height = 192;
        const ctx = c.getContext('2d');
        const cx = c.width / 2;
        // Tongue shape via filled bezier (wide at bottom, point at top)
        const drawTongue = (scale, offsetX) => {
            ctx.beginPath();
            ctx.moveTo(cx + offsetX - 50 * scale, c.height - 4);
            ctx.bezierCurveTo(
                cx + offsetX - 56 * scale, c.height * 0.55,
                cx + offsetX - 18 * scale, c.height * 0.25,
                cx + offsetX,               4
            );
            ctx.bezierCurveTo(
                cx + offsetX + 18 * scale, c.height * 0.25,
                cx + offsetX + 56 * scale, c.height * 0.55,
                cx + offsetX + 50 * scale, c.height - 4
            );
            ctx.closePath();
        };
        // Outer red glow
        drawTongue(1.0, 0);
        const outer = ctx.createRadialGradient(cx, c.height * 0.75, 8, cx, c.height * 0.6, c.height * 0.7);
        outer.addColorStop(0,    'rgba(255, 120,  40, 1.00)');
        outer.addColorStop(0.55, 'rgba(238,  70,  20, 0.85)');
        outer.addColorStop(1,    'rgba(180,  20,   0, 0.00)');
        ctx.fillStyle = outer;
        ctx.fill();
        // Middle orange layer
        drawTongue(0.65, 0);
        const mid = ctx.createRadialGradient(cx, c.height * 0.78, 4, cx, c.height * 0.6, c.height * 0.5);
        mid.addColorStop(0,    'rgba(255, 215,  80, 1.00)');
        mid.addColorStop(0.55, 'rgba(255, 145,  40, 0.85)');
        mid.addColorStop(1,    'rgba(230,  80,  20, 0.00)');
        ctx.fillStyle = mid;
        ctx.fill();
        // Hot yellow-white core
        drawTongue(0.32, 0);
        const core = ctx.createRadialGradient(cx, c.height * 0.82, 2, cx, c.height * 0.7, c.height * 0.35);
        core.addColorStop(0,   'rgba(255, 250, 220, 1.00)');
        core.addColorStop(0.6, 'rgba(255, 215,  90, 0.85)');
        core.addColorStop(1,   'rgba(255, 160,  40, 0.00)');
        ctx.fillStyle = core;
        ctx.fill();

        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }

    _showFlameSprites() {
        if (this._flameGroup) {
            this._flameGroup.visible = true;
            return;
        }
        if (!this._flameTex) this._flameTex = this._buildFlameTexture();
        // Rising-particle fire: many small flame wisps spawn in a
        // small ring around the ball, drift upward, shrink, and fade.
        // Each particle has independent age/lifetime/velocity so the
        // overall look is constantly animated rather than 4 frozen
        // billboards. Particles are SMALL so the ball stays visible
        // and the flame reads as a halo, not a fireball.
        const group = new THREE.Group();
        const PARTICLE_COUNT = 14;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const mat = new THREE.SpriteMaterial({
                map: this._flameTex,
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                opacity: 0,
            });
            const sprite = new THREE.Sprite(mat);
            sprite.userData.age = Math.random() * 0.8;  // staggered so they don't all reset together
            sprite.userData.lifetime = 0;
            sprite.userData.velocity = 0;
            sprite.userData.baseScale = 0;
            sprite.userData.spawnOffset = new THREE.Vector3();
            sprite.scale.set(0.01, 0.01, 1);
            group.add(sprite);
        }
        this._flameGroup = group;
        this.ballMesh.add(group);
        this._lastFlameT = performance.now() / 1000;
    }

    _hideFlameSprites() {
        if (this._flameGroup) this._flameGroup.visible = false;
    }

    _respawnFlameParticle(sprite) {
        const r = 0.08 + Math.random() * 0.06;
        const angle = Math.random() * Math.PI * 2;
        sprite.userData.spawnOffset.set(
            Math.cos(angle) * r,
            BALL_RADIUS_M * 0.3,
            Math.sin(angle) * r,
        );
        sprite.position.copy(sprite.userData.spawnOffset);
        sprite.userData.age = 0;
        sprite.userData.lifetime = 0.55 + Math.random() * 0.35;
        sprite.userData.velocity = 0.55 + Math.random() * 0.45;
        sprite.userData.baseScale = 0.14 + Math.random() * 0.07;
        sprite.userData.lateralDrift = (Math.random() - 0.5) * 0.4;
    }

    playReplay(sim, onComplete) {
        // "REPLAY" badge — top-right of the canvas, fades after the
        // replay finishes.
        const badge = document.createElement('div');
        badge.textContent = 'REPLAY';
        badge.style.cssText = [
            'position: absolute',
            'top: 14%',
            'right: 8%',
            'font-family: Impact, "Arial Black", sans-serif',
            'font-size: 28px',
            'color: #ffffff',
            'background: rgba(180, 30, 30, 0.85)',
            'padding: 4px 14px',
            'border-radius: 4px',
            'letter-spacing: 2px',
            'box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5)',
            'pointer-events: none',
            'z-index: 100',
        ].join('; ');
        this.container.appendChild(badge);

        const traj = sim.trajectory;
        // Reset ball to start of trajectory
        this.ballMesh.position.set(traj[0].x, traj[0].y, traj[0].z * PZ);
        this.trailPositions = [];
        this.rebuildTrail();

        // Save the static-cam pose so we can restore it after replay
        const savedCamPos = this.camera.position.clone();
        const savedCamQuat = this.camera.quaternion.clone();

        const CHASE_BEHIND = 2.2;   // m behind the ball along its direction of travel
        const CHASE_HEIGHT = 0.55;  // m above the ball
        const CHASE_LOOK_AHEAD = 0.8;

        let step = 0;
        const replaySpeed = 0.35;
        const interval = (1000 / 60) / replaySpeed;
        const ticker = setInterval(() => {
            if (step >= traj.length) {
                clearInterval(ticker);
                badge.remove();
                // Restore the static cam pose so the next shot starts framed
                this.camera.position.copy(savedCamPos);
                this.camera.quaternion.copy(savedCamQuat);
                onComplete();
                return;
            }
            const p = traj[step];
            this.ballMesh.position.set(p.x, p.y, p.z * PZ);
            this.trailPositions.push(new THREE.Vector3(p.x, p.y, p.z * PZ));
            this.rebuildTrail();

            // Chase cam: position 2.2 m BEHIND the ball along its
            // current direction of travel (using the trajectory's
            // velocity, derived from neighbouring points), looking
            // slightly ahead of the ball so the goal stays in frame
            // as it nears the net.
            const prev = traj[Math.max(0, step - 2)];
            const ahead = traj[Math.min(traj.length - 1, step + 2)];
            const vx = (ahead.x - prev.x);
            const vy = (ahead.y - prev.y);
            const vz = (ahead.z - prev.z);
            const speed = Math.hypot(vx, vy, vz) || 1;
            const dx = vx / speed, dy = vy / speed, dz = vz / speed;

            const camX = p.x - dx * CHASE_BEHIND;
            const camY = Math.max(0.25, p.y - dy * CHASE_BEHIND + CHASE_HEIGHT);
            const camZ = (p.z - dz * CHASE_BEHIND) * PZ;
            this.camera.position.set(camX, camY, camZ);

            const lookX = p.x + dx * CHASE_LOOK_AHEAD;
            const lookY = p.y + dy * CHASE_LOOK_AHEAD;
            const lookZ = (p.z + dz * CHASE_LOOK_AHEAD) * PZ;
            this.camera.lookAt(lookX, lookY, lookZ);

            step++;
        }, interval);
    }
}
