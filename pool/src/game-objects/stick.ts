import { IStickConfig, IInputConfig } from './../game.config.type';
import { Keyboard } from '../input/keyboard';
import { Mouse } from '../input/mouse';
import { PowerHud } from '../input/power-hud';
import { SpinHud } from '../input/spin-hud';
import { GameConfig } from '../game.config';
import { Assets } from '../assets';
import { Canvas2D } from '../canvas';
import { Vector2 } from '../geom/vector2';
import { mapRange } from '../common/helper';
import { IAssetsConfig } from '../game.config.type';

//------Configurations------//

const inputConfig: IInputConfig = GameConfig.input;
const stickConfig: IStickConfig = GameConfig.stick;
const sprites: IAssetsConfig = GameConfig.sprites;
const sounds: IAssetsConfig = GameConfig.sounds;

export class Stick {

    //------Members------//

    private _sprite: HTMLImageElement = Assets.getSprite(sprites.paths.stick);
    private _rotation: number = 0;
    private _origin: Vector2 = Vector2.copy(stickConfig.origin);
    private _power: number = 0;
    private _movable: boolean = true;
    private _visible: boolean = true;

    //------Properties------//

    public get position() : Vector2 {
        return Vector2.copy(this._position);
    }
    
    public get rotation(): number {
        return this._rotation;
    }

    public get power(): number {
        return this._power;
    }

    public set movable(value: boolean) {
        this._movable = value;
    }

    public get visible(): boolean {
        return this._visible;
    }

    public set visible(value: boolean) {
        this._visible = value;
    }

    public set rotation(value: number) {
        this._rotation = value;
    }

    /**
     * External power setter — used by GameWorld.setStickPowerFromHud
     * when the React MatchHUD's power slider drives the iframe.
     * Bypasses keyboard / PowerHud sync; the React side IS the source
     * of truth in that mode.
     */
    public setPowerDirect(target: number): void {
        this.setPower(target);
        // Mirror to the (hidden) DOM PowerHud so other code paths that
        // read PowerHud.value stay in sync.
        PowerHud.value = target;
    }

    //------Constructor------//

    constructor(private _position: Vector2) {}

    //------Private Methods------//

    private setPower(target: number): void {
        const clamped = Math.max(0, Math.min(stickConfig.maxPower, target));
        const delta = clamped - this._power;
        if (delta === 0) return;
        this._power = clamped;
        this._origin.addToX(delta * stickConfig.movementPerFrame);
    }

    private updatePower(): void {
        // Slider is the primary control; W/S keyboard is secondary
        // (JJ 2026-06: "it can act as a double control but the main
        // control should work"). Both write to PowerHud.value so a
        // keyboard adjustment moves the visible React slider too.
        let target = PowerHud.value;
        if (Keyboard.isDown(inputConfig.increaseShotPowerKey)) {
            target += stickConfig.powerToAddPerFrame;
        } else if (Keyboard.isDown(inputConfig.decreaseShotPowerKey)) {
            target -= stickConfig.powerToAddPerFrame;
        }
        target = Math.max(0, Math.min(stickConfig.maxPower, target));
        if (PowerHud.value !== target) {
            PowerHud.value = target;
        }
        this.setPower(target);
    }

    private updateRotation(): void {
        const opposite: number = Mouse.position.y - this._position.y;
        const adjacent: number = Mouse.position.x - this._position.x;
        this._rotation = Math.atan2(opposite, adjacent);
    }

    //------Public Methods------//

    public hide(): void {
        this._power = 0;
        this._visible = false;
        this._movable = false;
        PowerHud.reset();
        PowerHud.hide();
        SpinHud.reset();
        SpinHud.hide();
    }

    public show(position: Vector2): void {
        this._position = position;
        this._origin = Vector2.copy(stickConfig.origin);
        this._movable = true;
        this._visible = true;
        PowerHud.reset();
        PowerHud.show();
        SpinHud.reset();
        SpinHud.show();
    }

    public shoot(): void {
        this._origin = Vector2.copy(stickConfig.shotOrigin);
        const volume: number = mapRange(this._power, 0, stickConfig.maxPower, 0, 1);
        Assets.playSound(sounds.paths.strike, volume);
    }

    public update(): void {
        if(this._movable) {
            this.updateRotation();
            this.updatePower();
        }
        // Keep HUD synced with stick state every frame — covers the case where Stick is
        // constructed with default visible/movable=true (initMatch) without a show() call.
        if (this._visible && this._movable) {
            PowerHud.show();
            SpinHud.show();
        } else {
            PowerHud.hide();
            SpinHud.hide();
        }
    }

    public draw(): void {
        if(this._visible) {
            Canvas2D.drawImage(this._sprite, this._position, this._rotation, this._origin);
        }
    }

}