class PowerHud_Singleton {

    //------Members------//

    private _container: HTMLElement | null;
    private _slider: HTMLInputElement | null;

    //------Constructor------//

    constructor() {
        this._container = document.getElementById('powerHud');
        this._slider = document.getElementById('powerSlider') as HTMLInputElement | null;

        if (this._slider) {
            // Absorb pointer events so dragging the slider doesn't double as a shoot-tap
            // (Mouse_Singleton listens at document level on the same event names).
            ['pointerdown', 'pointerup', 'pointermove', 'pointercancel'].forEach((type) => {
                this._slider!.addEventListener(type, (e) => e.stopPropagation());
            });
        }
        if (this._container) {
            ['pointerdown', 'pointerup', 'pointermove', 'pointercancel'].forEach((type) => {
                this._container!.addEventListener(type, (e) => e.stopPropagation());
            });
        }
    }

    //------Public Methods------//

    public get value(): number {
        if (!this._slider) return 0;
        const v = parseFloat(this._slider.value);
        return Number.isFinite(v) ? v : 0;
    }

    public set value(v: number) {
        if (this._slider) {
            this._slider.value = String(v);
        }
        // When the parent React MatchHUD is wrapping this iframe, post
        // the new percentage up so the React PowerBar's visible slider
        // mirrors W/S keyboard adjustments. JJ 2026-06: "the power
        // slider moves as they use the W."
        if ((window as any).__SIDE_POCKET_PARENT_HUD && window.parent !== window) {
            try {
                // Slider DOM has min=0 max=50; convert to 0-100 pct for React.
                const pct = Math.round((v / 50) * 100);
                window.parent.postMessage({ type: 'side-pocket-power', pct }, '*');
            } catch {
                /* cross-origin? — shouldn't happen, iframe is same-origin */
            }
        }
    }

    public reset(): void {
        this.value = 0;
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
}

export const PowerHud = new PowerHud_Singleton();
