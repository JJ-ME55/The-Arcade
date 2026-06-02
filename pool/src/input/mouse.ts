import { ButtonState } from './button-state';
import { Canvas2D } from '../canvas';
import { Vector2 } from '../geom/vector2';

class Mouse_Singleton {

    //------Members------//

    private _buttonStates: ButtonState[] = [];
    private _position: Vector2;
    // Touch/pen only: the first finger down "owns" aim; later fingers can press to shoot but don't move the cursor.
    private _aimPointerId: number | null = null;
    private _activePointerIds: Set<number> = new Set();

    //------Properties------//

    public get position() {
        return Vector2.copy(this._position);
    }

    //------Constructor------//

    constructor() {

        for(let i = 0 ; i < 3 ; i ++ ) {
            this._buttonStates[i] = new ButtonState();
        }

        this._position = Vector2.zero;

        // Pointer Events unify mouse + touch + pen. touch-action:none on body suppresses browser gestures.
        document.addEventListener('pointermove', (event) => this.handlePointerMove(event));
        document.addEventListener('pointerdown', (event) => this.handlePointerDown(event));
        document.addEventListener('pointerup', (event) => this.handlePointerUp(event));
        document.addEventListener('pointercancel', (event) => this.handlePointerUp(event));
    }

    //------Private Methods------//

    private updatePositionFromEvent(event: PointerEvent): void {
        // Canvas now has RENDER_PADDING game-coord units inset on each
        // side (so the cue stick can draw past the table edge). Subtract
        // the padding so the returned game-coord stays table-relative —
        // game logic doesn't need to know the canvas has padding.
        const x: number = (event.pageX - Canvas2D.offsetX) / Canvas2D.scaleX - Canvas2D.renderPadding;
        const y: number = (event.pageY - Canvas2D.offsetY) / Canvas2D.scaleY - Canvas2D.renderPadding;
        this._position = new Vector2(x, y);
    }

    private resolveButton(event: PointerEvent): number {
        // Touch/pen always report 0; mouse reports 0/1/2 for left/middle/right; pointercancel may report -1.
        const b = event.button;
        return b >= 0 && b <= 2 ? b : 0;
    }

    private handlePointerMove(event: PointerEvent): void {
        if (event.pointerType === 'mouse') {
            this.updatePositionFromEvent(event);
            return;
        }
        // Touch/pen: only the aim-owning pointer moves the cursor (rejects stray multi-touch jitter).
        if (this._aimPointerId !== null && event.pointerId === this._aimPointerId) {
            this.updatePositionFromEvent(event);
        }
    }

    private handlePointerDown(event: PointerEvent): void {
        const button = this.resolveButton(event);

        if (event.pointerType === 'mouse') {
            this.updatePositionFromEvent(event);
        } else {
            // First touch claims aim; later touches register a press (for shoot) without hijacking aim.
            if (this._aimPointerId === null) {
                this._aimPointerId = event.pointerId;
                this.updatePositionFromEvent(event);
            }
            this._activePointerIds.add(event.pointerId);
        }

        this._buttonStates[button].down = true;
        this._buttonStates[button].pressed = true;
    }

    private handlePointerUp(event: PointerEvent): void {
        const button = this.resolveButton(event);

        if (event.pointerType !== 'mouse') {
            this._activePointerIds.delete(event.pointerId);
            if (event.pointerId === this._aimPointerId) {
                this._aimPointerId = null;
                // Promote any remaining touch to the new aim owner so dragging survives lifting the aim finger.
                const next = this._activePointerIds.values().next();
                if (!next.done) {
                    this._aimPointerId = next.value;
                }
            }
            // Only release the button when no fingers remain.
            if (this._activePointerIds.size === 0) {
                this._buttonStates[button].down = false;
            }
            return;
        }

        this._buttonStates[button].down = false;
    }

    //------Public Methods------//

    public reset() : void {
        for(let i = 0 ; i < 3 ; i++ ) {
            this._buttonStates[i].pressed = false;
        }
    }

    public isDown(button: number): boolean {
        return this._buttonStates[button].down;
    }

    public isPressed(button: number): boolean {
        return this._buttonStates[button].pressed;
    }
}

export const Mouse = new Mouse_Singleton();
