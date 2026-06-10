import { IBallConfig, IPhysicsConfig, IAssetsConfig } from './../game.config.type';
import { GameConfig } from '../game.config';
import { Canvas2D } from '../canvas';
import { Color } from '../common/color';
import { Vector2 } from '../geom/vector2';
import { Assets } from '../assets';
import { clampSpinAxis, decaySpin } from '../physics/spin';

const physicsConfig: IPhysicsConfig = GameConfig.physics;
const sprites: IAssetsConfig = GameConfig.sprites;
const ballConfig: IBallConfig = GameConfig.ball;

export class Ball {

    //------Members------//

    private _sprite: HTMLImageElement;
    private _color: Color;
    private _velocity: Vector2 = Vector2.zero;
    private _moving: boolean = false;
    private _visible: boolean = true;

    // Spin state. Set at shoot time from the cue-ball impact-point widget,
    // decays continuously while the ball moves, consumed/reset by cushion
    // bounces (sidespin) and object-ball collisions (top/back spin).
    // Range [-1, +1] on each axis. See pool/src/physics/spin.ts for the
    // sign convention.
    private _spinX: number = 0;
    private _spinY: number = 0;

    // Visual rolling angle (radians). Advanced each frame proportional
    // to velocity — gives the number disc + stripe a top-down "roll"
    // appearance as the ball moves across the felt. No effect on the
    // sim; purely render-side.
    //
    // MONOTONE — always increases. The atlas frames are baked rolling
    // along ONE canonical axis; direction is handled entirely by
    // rotating the sprite to the motion angle at draw time. A previous
    // version multiplied by sign(velocity.x), which double-compensated
    // with that sprite rotation: left-moving balls played the frame
    // sequence in REVERSE (visible backwards spin) and near-vertical
    // movers flipped direction on every tick of x-noise (jitter).
    // JJ playtest 2026-06-10: "always spins backwards whilst moving
    // forwards" — that was this.
    private _rollAngle: number = 0;

    // Motion direction (radians) the sprite is aligned to at draw time.
    // CACHED, not derived from live velocity in the renderer: it only
    // updates while the ball moves meaningfully, so the sprite holds
    // its final orientation when the ball stops instead of snapping to
    // angle 0, and doesn't twitch from velocity noise at crawl speeds.
    private _motionAngle: number = 0;


    //------Properties------//

    public get position(): Vector2 {
        return Vector2.copy(this._position);
    }

    public set position(value: Vector2) {
        this._position = value;
    }

    public get nextPosition(): Vector2 {
        return this.position.add(this._velocity.mult(1 - physicsConfig.friction));
    }

    public get velocity(): Vector2 {
        return Vector2.copy(this._velocity);
    }

    public set velocity(value: Vector2) {
        this._moving = value.length > 0 ? true : false;
        this._velocity = value;
    }

    public get moving(): boolean {
        return this._moving;
    }

    public get color(): Color {
        return this._color;
    }

    public get visible(): boolean {
        return this._visible;
    }

    public get spinX(): number {
        return this._spinX;
    }

    public set spinX(value: number) {
        this._spinX = clampSpinAxis(value);
    }

    public get spinY(): number {
        return this._spinY;
    }

    public set spinY(value: number) {
        this._spinY = clampSpinAxis(value);
    }

    //------Constructor------//

    /**
     * @param _id - stable ID used by the sim core for cross-frame ball
     *              identification. Convention: 0 = cue ball, 8 = black,
     *              1-7 = first half of object balls, 9-15 = second half.
     *              GameWorld.initMatch() assigns these.
     */
    constructor(private _position: Vector2, color: Color, private _id: number = 0) {
        this._color = color;
        this.resolveSprite(color);
    }

    public get id(): number {
        return this._id;
    }

    //------Private Methods------//

    private resolveSprite(color: Color) {
        switch(color) {
            case Color.white:
                this._sprite = Assets.getSprite(sprites.paths.cueBall);
                break;

            case Color.black:
                this._sprite = Assets.getSprite(sprites.paths.blackBall);
                break;

            case Color.red:
                this._sprite = Assets.getSprite(sprites.paths.redBall);
                break;

            case Color.yellow:
                this._sprite = Assets.getSprite(sprites.paths.yellowBall);
                break;
        }
    }

    //------Public Methods------//

    /**
     * Fire the ball. Spin is optional — defaults to no spin for backward
     * compat (vs-AI and any test path that hasn't been updated yet).
     */
    public shoot(power: number, angle: number, spinX: number = 0, spinY: number = 0): void {
        this._velocity = new Vector2(power * Math.cos(angle), power * Math.sin(angle));
        this._moving = true;
        this._spinX = clampSpinAxis(spinX);
        this._spinY = clampSpinAxis(spinY);
    }

    public show(position: Vector2): void {
        this._position = position;
        this._velocity = Vector2.zero;
        this._spinX = 0;
        this._spinY = 0;
        this._visible = true;
    }

    public hide(): void {
        this._velocity = Vector2.zero;
        this._spinX = 0;
        this._spinY = 0;
        this._moving = false;
        this._visible = false;
    }

    /**
     * Advance the visual roll angle one frame, based on current velocity.
     * Used by the sim-core path (GameWorld.simulateFrame) — the sim core
     * only operates on SerializableBall views and doesn't touch this
     * field. Without this hook, balls never visibly rolled even though
     * they moved (JJ 2026-06: "the balls are still not rolling").
     *
     * Δθ = Δposition / R radians (rigid-body rolling on a surface).
     * Slowed by a damping factor — physical rev/sec at high speed strobes
     * faster than the human eye can resolve; we want perceivable rolling,
     * not literally accurate per-tick angular velocity.
     */
    /**
     * Max visual roll rate, radians per tick. Physically-exact rolling
     * is ω = v/R: at break speeds (v≈30, R=19) that is ~15 rev/sec —
     * a quarter revolution PER RENDER FRAME at 60fps, i.e. a ~32-frame
     * jump through the 128-frame atlas every frame. The eye can't
     * track that; it reads as random flicker (JJ 2026-06-10:
     * "jittery"). Real footage of fast balls is motion-blurred anyway.
     *
     * So: EXACT v/R while v/R is below this cap — the whole visible
     * rolling tail (the part players actually watch) is physically
     * locked to ground speed ("spin matches the roll speed") — and a
     * hard cap above it. 0.42 rad/tick ≈ 4 rev/sec ≈ an 8.6-frame
     * atlas step ≈ 24° between consecutive render frames: clearly
     * directional, zero strobing (the twin-disc texture repeats every
     * 180°, so anything under ~90°/frame samples cleanly).
     */
    private static readonly MAX_VISUAL_ROLL_RATE = 0.42;

    public updateRollAngle(): void {
        if (!this._moving) return;
        const speed = this._velocity.length;
        if (speed <= 0) return;
        const ballR = ballConfig.diameter / 2;
        // Monotone advance — direction comes from the sprite's motion
        // alignment at draw time, never from the frame sequence.
        this._rollAngle += Math.min(speed / ballR, Ball.MAX_VISUAL_ROLL_RATE);
        // Refresh the cached motion direction only while moving fast
        // enough for the direction to be meaningful — freezes the
        // sprite orientation at stop (no snap) and ignores crawl noise.
        if (speed > 0.5) {
            this._motionAngle = Math.atan2(this._velocity.y, this._velocity.x);
        }
    }

    public get motionAngle(): number {
        return this._motionAngle;
    }

    /** Current visual roll angle — read by GameWorld to freeze a sink
     *  ghost's rotation frame at the moment a ball is potted. */
    public get rollAngle(): number {
        return this._rollAngle;
    }

    public update(): void {
        if(this._moving) {
            // Two-regime constant-decel friction (deep-research workflow
            // wghummavd 2026-06 — Han 2005 / Shepard model). Replaces the
            // old exponential `velocity *= (1 - 0.018)` damping which was
            // structurally wrong for pool ball physics on cloth.
            //
            // Sliding: μ_s·g·dt deceleration (big — ~17 px/tick)
            // Rolling: μ_r·g·dt deceleration (small — ~0.86 px/tick)
            // Transition: when |v| drops below rollSlipThreshold (~1.2 px/tick)
            //
            // The 5/7-velocity slip-to-roll transition emerges naturally:
            // sliding decel pulls v linearly until it crosses the threshold,
            // then rolling decel takes over. Long, slow tail = natural feel.
            const speed = this._velocity.length;
            const inSliding = speed > physicsConfig.rollSlipThreshold;
            const decel = inSliding ? physicsConfig.slidingDecel : physicsConfig.rollingDecel;
            const newSpeed = Math.max(0, speed - decel);
            if (newSpeed === 0) {
                this._velocity = Vector2.zero;
            } else {
                this._velocity.multBy(newSpeed / speed);
            }
            this._position.addTo(this._velocity);

            // Decay spin proportionally with velocity friction. When the ball
            // stops, spin is zeroed (handled below + by the dead-zone snap
            // in decaySpin).
            const decayed = decaySpin(this._spinX, this._spinY);
            this._spinX = decayed.spinX;
            this._spinY = decayed.spinY;

            // Advance the visual roll angle. Δθ = Δposition / R radians
            // (rigid-body-on-surface rolling — research workflow wghummavd
            // finding #6: distance-travelled / radius, direction from
            // velocity vector). Uses the post-friction speed (newSpeed
            // from the decel block above).
            const ballR = ballConfig.diameter / 2;
            // Sign from velocity x (positive = moving right → roll forward).
            // Pure-y motion still rolls (velocity x ~= 0) — fall back to y sign.
            const dir = Math.abs(this._velocity.x) > 0.01
                ? Math.sign(this._velocity.x)
                : Math.sign(this._velocity.y) || 1;
            this._rollAngle += (newSpeed / ballR) * dir;

            if(this._velocity.length < ballConfig.minVelocityLength) {
                this.velocity = Vector2.zero;
                this._spinX = 0;
                this._spinY = 0;
                this._moving = false;
            }
        }
    }

    public draw(): void {
        if(this._visible){
            // Side Pocket American 8-ball — atlas draw via Canvas2D.
            // rollAngle picks the rotation frame; motionAngle (cached,
            // stable through stops) aligns the baked rolling axis to
            // the ball's travel direction; velocity feeds the legacy
            // fallback path only.
            Canvas2D.drawAmericanBall(this._position, this._id, this._rollAngle, this._velocity, this._motionAngle);
        }
    }
}