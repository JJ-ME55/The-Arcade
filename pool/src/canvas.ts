import { IVector2 } from './game.config.type';
import { GameConfig } from './game.config';
import { Vector2 } from './geom/vector2';

class Canvas2D_Singleton {

    //------Members------//

    private _canvasContainer: HTMLElement;
    private _canvas : HTMLCanvasElement;
    private _context : CanvasRenderingContext2D;
    private _scale: Vector2;

    //------Properties------//
    
    public get scaleX() {
        return this._scale.x;
    }

    public get scaleY() {
        return this._scale.y;
    }

    public get offsetX() {
        // getBoundingClientRect is viewport-relative; works regardless of offsetParent / flex layout / scroll.
        return this._canvas.getBoundingClientRect().left + window.scrollX;
    }

    public get offsetY() {
        return this._canvas.getBoundingClientRect().top + window.scrollY;
    }

    //------Constructor------//

    constructor(canvas : HTMLCanvasElement, canvasContainer: HTMLElement) {
        this._canvasContainer = canvasContainer;
        this._canvas = canvas;
        this._context = this._canvas.getContext('2d');
        this.resizeCanvas();
    }

    //------Public Methods------//

    public resizeCanvas(): void {

        const originalCanvasWidth = GameConfig.gameSize.x;
        const originalCanvasHeight = GameConfig.gameSize.y;
        const widthToHeight: number = originalCanvasWidth / originalCanvasHeight;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const viewportRatio = viewportWidth / viewportHeight;

        let cssWidth: number;
        let cssHeight: number;
        if (viewportRatio > widthToHeight) {
            cssHeight = viewportHeight;
            cssWidth = cssHeight * widthToHeight;
        } else {
            cssWidth = viewportWidth;
            cssHeight = cssWidth / widthToHeight;
        }

        // Bitmap is dpr-scaled so retina screens render crisp; CSS pixels stay 1:1 with input coords.
        const dpr = window.devicePixelRatio || 1;
        this._canvas.width = Math.round(cssWidth * dpr);
        this._canvas.height = Math.round(cssHeight * dpr);
        this._canvas.style.width = cssWidth + 'px';
        this._canvas.style.height = cssHeight + 'px';

        this._canvasContainer.style.width = cssWidth + 'px';
        this._canvasContainer.style.height = cssHeight + 'px';

        // Base transform absorbs dpr — subsequent ops draw in CSS-pixel space.
        this._context.setTransform(dpr, 0, 0, dpr, 0, 0);

        // scale converts game-space units to CSS pixels (used by both draws and input math).
        this._scale = new Vector2(cssWidth / originalCanvasWidth, cssHeight / originalCanvasHeight);
    }


    public clear() : void {
        this._context.save();
        this._context.setTransform(1, 0, 0, 1, 0, 0);
        this._context.clearRect(0, 0, this._canvas.width, this._canvas.height);
        this._context.restore();
    }

    public drawImage(
            sprite: HTMLImageElement,
            position: IVector2 = { x: 0, y: 0 }, 
            rotation: number = 0, 
            origin: IVector2 = { x: 0, y: 0 }
        ) {    
        this._context.save();
        this._context.scale(this._scale.x, this._scale.y);
        this._context.translate(position.x, position.y);
        this._context.rotate(rotation);
        this._context.drawImage(sprite, 0, 0, sprite.width, sprite.height, -origin.x, -origin.y, sprite.width, sprite.height);
        this._context.restore();
    }


    public drawText(text: string, font:string, color: string, position: IVector2, textAlign: string = 'left'): void {
        this._context.save();
        this._context.scale(this._scale.x, this._scale.y);
        this._context.fillStyle = color;
        this._context.font = font;
        this._context.textAlign = textAlign as CanvasTextAlign;
        this._context.fillText(text, position.x, position.y);
        this._context.restore();
    }

    public changeCursor(cursor: string): void {
        this._canvas.style.cursor = cursor;
    }

    // ====================================================================
    // SIDE POCKET — procedural table chrome
    //
    // Replaces the static spr_background4.png with a code-rendered table
    // matching the Round 2 designer's Side Pocket palette: cherry-wood
    // rails with a vertical gradient, cobalt-azure felt with an overhead
    // lamp hot-spot, dark pockets with rim shadows, ivory diamond rail
    // markers. Geometry is driven by GameConfig.table values so the
    // visual stays in sync with the physics (pocket positions, cushion
    // width).
    //
    // Lifted from designer's round2_canvas.jsx (vendored at
    // Round 2/side_pocket_handoff/source/round2_canvas.jsx). The JSX is
    // SVG; this is the canvas2d port — same colour stops, same geometry
    // logic, simpler bevels (no per-cushion bullnose highlights — those
    // arrive in a later iteration).
    // ====================================================================
    public drawSidePocketTable(): void {
        const ctx = this._context;
        const W = GameConfig.gameSize.x;
        const H = GameConfig.gameSize.y;
        const FELT_INSET = GameConfig.table.cushionWidth;
        const POCKETS = GameConfig.table.pocketsPositions;
        const POCKET_R = GameConfig.table.pocketRadius;

        ctx.save();
        ctx.scale(this._scale.x, this._scale.y);

        // ---- LAYER 1: Cherry wood frame ---------------------------------
        // Four mitered trapezoids (picture-frame join). Each rail uses a
        // vertical gradient that runs from the outer "catch light" to a
        // deep mahogany at the felt seam.
        const drawWoodRail = (poly: Array<[number, number]>, gradFrom: [number, number], gradTo: [number, number]) => {
            const grad = ctx.createLinearGradient(gradFrom[0], gradFrom[1], gradTo[0], gradTo[1]);
            grad.addColorStop(0,    '#B85540');
            grad.addColorStop(0.10, '#963126');
            grad.addColorStop(0.55, '#6B1F18');
            grad.addColorStop(1,    '#2E0B07');
            ctx.fillStyle = grad;
            ctx.beginPath();
            poly.forEach((p, i) => i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]));
            ctx.closePath();
            ctx.fill();
        };

        // Top
        drawWoodRail(
            [[0, 0], [W, 0], [W - FELT_INSET, FELT_INSET], [FELT_INSET, FELT_INSET]],
            [0, 0], [0, FELT_INSET]
        );
        // Bottom
        drawWoodRail(
            [[0, H], [W, H], [W - FELT_INSET, H - FELT_INSET], [FELT_INSET, H - FELT_INSET]],
            [0, H], [0, H - FELT_INSET]
        );
        // Left
        drawWoodRail(
            [[0, 0], [FELT_INSET, FELT_INSET], [FELT_INSET, H - FELT_INSET], [0, H]],
            [0, 0], [FELT_INSET, 0]
        );
        // Right
        drawWoodRail(
            [[W, 0], [W - FELT_INSET, FELT_INSET], [W - FELT_INSET, H - FELT_INSET], [W, H]],
            [W, 0], [W - FELT_INSET, 0]
        );

        // Outer catch-light pinstripe (top + left = bright, bottom + right = shadow)
        ctx.fillStyle = 'rgba(255,200,170,0.55)';
        ctx.fillRect(0, 0, W, 2);
        ctx.fillStyle = 'rgba(255,200,170,0.45)';
        ctx.fillRect(0, 0, 2, H);
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, H - 2, W, 2);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(W - 2, 0, 2, H);

        // ---- LAYER 2: Cobalt felt with lamp hot-spot --------------------
        const feltX = FELT_INSET;
        const feltY = FELT_INSET;
        const feltW = W - 2 * FELT_INSET;
        const feltH = H - 2 * FELT_INSET;

        const feltGrad = ctx.createRadialGradient(
            W / 2, H * 0.40, 0,
            W / 2, H * 0.40, Math.max(feltW, feltH) * 0.6
        );
        feltGrad.addColorStop(0,    '#2C7AC7');
        feltGrad.addColorStop(0.55, '#1E5FA8');
        feltGrad.addColorStop(1,    '#103E72');
        ctx.fillStyle = feltGrad;
        ctx.fillRect(feltX, feltY, feltW, feltH);

        // Warm overhead lamp glow (additive cream tint)
        const lampGrad = ctx.createRadialGradient(
            W / 2, H * 0.38, 0,
            W / 2, H * 0.38, Math.max(feltW, feltH) * 0.55
        );
        lampGrad.addColorStop(0,    'rgba(255,230,176,0.18)');
        lampGrad.addColorStop(0.45, 'rgba(255,230,176,0.04)');
        lampGrad.addColorStop(1,    'rgba(255,230,176,0)');
        ctx.fillStyle = lampGrad;
        ctx.fillRect(feltX, feltY, feltW, feltH);

        // Felt edge inner shadow (sells the wood-to-felt drop)
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(feltX, feltY, feltW, feltH);

        // Head string line + foot spot (faint, on felt)
        ctx.strokeStyle = 'rgba(0,0,0,0.28)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(375, FELT_INSET + 6);
        ctx.lineTo(375, H - FELT_INSET - 6);
        ctx.stroke();
        ctx.fillStyle = 'rgba(244,236,219,0.55)';
        ctx.beginPath();
        ctx.arc(375, 412, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(1125, 412, 3, 0, Math.PI * 2);
        ctx.fill();

        // ---- LAYER 3: Pockets --------------------------------------------
        POCKETS.forEach(p => {
            // Outer rim shadow (dark collar)
            const rimGrad = ctx.createRadialGradient(p.x, p.y, POCKET_R * 0.9, p.x, p.y, POCKET_R + 8);
            rimGrad.addColorStop(0,    'rgba(0,0,0,0)');
            rimGrad.addColorStop(0.6,  'rgba(0,0,0,0.55)');
            rimGrad.addColorStop(1,    'rgba(0,0,0,0)');
            ctx.fillStyle = rimGrad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, POCKET_R + 8, 0, Math.PI * 2);
            ctx.fill();

            // Dark hole — cylinder with subtle inner shadow
            const holeGrad = ctx.createRadialGradient(p.x, p.y - POCKET_R * 0.1, 0, p.x, p.y, POCKET_R);
            holeGrad.addColorStop(0,    '#1a1a1d');
            holeGrad.addColorStop(0.55, '#08080a');
            holeGrad.addColorStop(1,    '#000000');
            ctx.fillStyle = holeGrad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, POCKET_R, 0, Math.PI * 2);
            ctx.fill();

            // Deep top-arc inner shadow (sells it as a hole, not a button)
            ctx.strokeStyle = 'rgba(0,0,0,0.85)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(p.x, p.y - 3, POCKET_R - 4, Math.PI * 1.15, Math.PI * 1.85);
            ctx.stroke();
        });

        // ---- LAYER 4: Diamond rail markers (ivory) ----------------------
        // 3 per long-rail half (top/bottom × left/right), 3 per short-rail.
        // Centered in the visible wood band (FELT_INSET / 2 offset).
        const DIAMOND_SIZE = 12;
        const woodMid = FELT_INSET / 2;
        const drawDiamond = (cx: number, cy: number) => {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = '#F4ECDB';
            ctx.fillRect(-DIAMOND_SIZE / 2, -DIAMOND_SIZE / 2, DIAMOND_SIZE, DIAMOND_SIZE);
            // Top half highlight
            ctx.fillStyle = 'rgba(255,255,255,0.45)';
            ctx.fillRect(-DIAMOND_SIZE / 2, -DIAMOND_SIZE / 2, DIAMOND_SIZE, DIAMOND_SIZE / 2);
            // Bottom half shadow
            ctx.fillStyle = 'rgba(0,0,0,0.12)';
            ctx.fillRect(-DIAMOND_SIZE / 2, 0, DIAMOND_SIZE, DIAMOND_SIZE / 2);
            ctx.restore();
        };
        // Long rails — 3 between each pocket pair (left half: TL→TM, right half: TM→TR)
        const topY = woodMid;
        const botY = H - woodMid;
        const leftHalf  = [62, 750];
        const rightHalf = [750, W - 62];
        for (const seg of [leftHalf, rightHalf]) {
            for (const t of [0.25, 0.5, 0.75]) {
                const x = seg[0] + (seg[1] - seg[0]) * t;
                drawDiamond(x, topY);
                drawDiamond(x, botY);
            }
        }
        // Short rails (3 diamonds each, between TL/BL and TR/BR)
        const leftX  = woodMid;
        const rightX = W - woodMid;
        const shortSeg = [62, H - 62];
        for (const t of [0.25, 0.5, 0.75]) {
            const y = shortSeg[0] + (shortSeg[1] - shortSeg[0]) * t;
            drawDiamond(leftX, y);
            drawDiamond(rightX, y);
        }

        ctx.restore();
    }

    // Side Pocket menu background — slate-deep gradient with a faint felt
    // glow at the center (the cobalt table is implied behind the menu but
    // dimmed). Replaces the main_menu_background.png.
    public drawSidePocketMenuBg(): void {
        const ctx = this._context;
        const W = GameConfig.gameSize.x;
        const H = GameConfig.gameSize.y;

        ctx.save();
        ctx.scale(this._scale.x, this._scale.y);

        // Slate page gradient
        const bg = ctx.createRadialGradient(W / 2, H * 0.35, 0, W / 2, H * 0.35, Math.max(W, H));
        bg.addColorStop(0,    '#1d2640');
        bg.addColorStop(0.6,  '#14192A');
        bg.addColorStop(1,    '#0B0F1B');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // Faint cobalt glow center — hints at the table beneath
        const glow = ctx.createRadialGradient(W / 2, H * 0.55, 0, W / 2, H * 0.55, H * 0.7);
        glow.addColorStop(0,   'rgba(30, 95, 168, 0.32)');
        glow.addColorStop(0.5, 'rgba(30, 95, 168, 0.08)');
        glow.addColorStop(1,   'rgba(30, 95, 168, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);

        // Subtle paper-cream top-edge brand stripe
        const topStripe = ctx.createLinearGradient(0, 0, 0, 4);
        topStripe.addColorStop(0, 'rgba(244, 236, 219, 0.45)');
        topStripe.addColorStop(1, 'rgba(244, 236, 219, 0)');
        ctx.fillStyle = topStripe;
        ctx.fillRect(0, 0, W, 4);

        ctx.restore();
    }
}

const canvas : HTMLCanvasElement = document.getElementById('screen') as HTMLCanvasElement;
const container : HTMLElement = document.getElementById('gameArea') as HTMLElement;
export const Canvas2D = new Canvas2D_Singleton(canvas, container);

window.addEventListener('resize', Canvas2D.resizeCanvas.bind(Canvas2D));
