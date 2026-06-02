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

    public update(): void {
        if(this._moving) {
            this._velocity.multBy(1 - physicsConfig.friction);
            this._position.addTo(this._velocity);

            // Decay spin proportionally with velocity friction. When the ball
            // stops, spin is zeroed (handled below + by the dead-zone snap
            // in decaySpin).
            const decayed = decaySpin(this._spinX, this._spinY);
            this._spinX = decayed.spinX;
            this._spinY = decayed.spinY;

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
            // Side Pocket American 8-ball — procedural draw via Canvas2D
            // using the ball's stable _id (0 cue, 1-7 solids, 8 black,
            // 9-15 stripes). game-world.initMatch() assigns these IDs in
            // place of the UK red/yellow groups; Color.red maps to a
            // solid, Color.yellow maps to a stripe, with the original
            // positions preserved.
            Canvas2D.drawAmericanBall(this._position, this._id);
        }
    }
}