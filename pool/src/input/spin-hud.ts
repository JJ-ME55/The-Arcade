import { widgetPointToSpin } from '../physics/spin';

/**
 * SpinHud — cue-ball impact-point widget per designer spec §3.4 SPIN widget.
 *
 * Bottom-left of the canvas: a circle representing the cue ball, with a
 * draggable dot showing the impact point. Drag inside the circle to set
 * top/back/side spin. Sits outside the canvas's pointer handlers (we
 * stop propagation so dragging the widget doesn't double as an aim/shoot
 * gesture, same trick PowerHud uses).
 *
 * Game-world reads `.spinX` / `.spinY` at shoot time and passes them to
 * `cueBall.shoot(power, rotation, spinX, spinY)`. Both values are in
 * [-1, +1] — sign convention defined in pool/src/physics/spin.ts.
 *
 * DOM (in pool/public/index.html):
 *   <div id="spinHud">
 *     <div id="spinPad">
 *       <div id="spinDot"></div>
 *     </div>
 *   </div>
 */
class SpinHud_Singleton {

    //------Members------//

    private _container: HTMLElement | null;
    private _pad: HTMLElement | null;
    private _dot: HTMLElement | null;
    private _spinX: number = 0;
    private _spinY: number = 0;
    private _activePointerId: number | null = null;

    //------Constructor------//

    constructor() {
        this._container = document.getElementById('spinHud');
        this._pad = document.getElementById('spinPad');
        this._dot = document.getElementById('spinDot');

        if (this._container) {
            // Absorb pointer events so the canvas-level Mouse listener doesn't
            // treat widget drags as aim/shoot gestures.
            ['pointerdown', 'pointerup', 'pointermove', 'pointercancel'].forEach((type) => {
                this._container!.addEventListener(type, (e) => e.stopPropagation());
            });
        }

        if (this._pad) {
            this._pad.addEventListener('pointerdown', this.onPointerDown.bind(this));
            this._pad.addEventListener('pointermove', this.onPointerMove.bind(this));
            this._pad.addEventListener('pointerup', this.onPointerEnd.bind(this));
            this._pad.addEventListener('pointercancel', this.onPointerEnd.bind(this));
        }
    }

    //------Public API------//

    public get spinX(): number {
        return this._spinX;
    }

    public get spinY(): number {
        return this._spinY;
    }

    /** Reset to no spin. Called by shoot flow + stick hide. */
    public reset(): void {
        this._spinX = 0;
        this._spinY = 0;
        this._activePointerId = null;
        this.updateDotPosition();
    }

    /**
     * External spin setter — used when the React MatchHUD's spin widget
     * drives the iframe (hud=parent mode). x,y are in [-1,+1] each
     * axis (per the SpinHud sign convention). Mirrors the dot position
     * so any debug-visible dot stays in sync.
     */
    public setFromExternal(x: number, y: number): void {
        this._spinX = Math.max(-1, Math.min(1, x));
        this._spinY = Math.max(-1, Math.min(1, y));
        this.updateDotPosition();
    }

    public show(): void {
        if (this._container) {
            this._container.classList.add('is-visible');
            this._container.setAttribute('aria-hidden', 'false');
        }
    }

    public hide(): void {
        if (this._container) {
            this._container.classList.remove('is-visible');
            this._container.setAttribute('aria-hidden', 'true');
        }
    }

    //------Private helpers------//

    private onPointerDown(event: PointerEvent): void {
        if (!this._pad) return;
        this._activePointerId = event.pointerId;
        try {
            this._pad.setPointerCapture(event.pointerId);
        } catch {
            /* setPointerCapture not always available — fine to ignore */
        }
        this.updateFromEvent(event);
    }

    private onPointerMove(event: PointerEvent): void {
        if (this._activePointerId !== event.pointerId) return;
        this.updateFromEvent(event);
    }

    private onPointerEnd(event: PointerEvent): void {
        if (this._activePointerId !== event.pointerId) return;
        this._activePointerId = null;
        // Spin sticks at whatever the player last set — they don't get to
        // "release" the spin like the power bar; they aim, set spin, then
        // shoot.
    }

    /**
     * Map a pointer event to spinX/spinY via the widget radius.
     * Updates the visible dot position to match.
     */
    private updateFromEvent(event: PointerEvent): void {
        if (!this._pad) return;
        const rect = this._pad.getBoundingClientRect();
        const radius = rect.width / 2;
        const cx = rect.left + radius;
        const cy = rect.top + radius;
        const dx = event.clientX - cx;
        const dy = event.clientY - cy;
        const spin = widgetPointToSpin(dx, dy, radius);
        this._spinX = spin.spinX;
        this._spinY = spin.spinY;
        this.updateDotPosition();
    }

    /** Move the visible dot to reflect the current spin. */
    private updateDotPosition(): void {
        if (!this._dot || !this._pad) return;
        // Pad is square; CSS uses percentages so the dot stays calibrated
        // regardless of widget size. Center is (50%, 50%); each axis offset
        // is spinX/Y × the pad's half-width.
        const xPct = 50 + this._spinX * 50;
        const yPct = 50 + this._spinY * 50;
        this._dot.style.left = `${xPct}%`;
        this._dot.style.top = `${yPct}%`;
    }
}

export const SpinHud = new SpinHud_Singleton();
