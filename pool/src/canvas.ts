import { IVector2 } from './game.config.type';
import { GameConfig } from './game.config';
import { Vector2 } from './geom/vector2';

// Render padding in game-coord units. Originally added so the cue
// stick could extend past the table when aiming — JJ tried 300 then
// 150 then said "I don't need to see the whole cue, table is too
// small." Locked at 0: table fills the iframe edge-to-edge, cue
// clips at the table boundary like every other pool client.
const RENDER_PADDING = 0;

// Small color helpers used by drawAmericanBall to derive a brighter
// highlight and a darker shadow from each base ball color. Keeps the
// palette declarative: one hex per ball, gradient stops computed.
function lightenColor(hex: string): string {
    const { r, g, b } = parseHex(hex);
    const f = 0.45;  // 45% blend with white
    return `rgb(${Math.round(r + (255 - r) * f)},${Math.round(g + (255 - g) * f)},${Math.round(b + (255 - b) * f)})`;
}
function darkenColor(hex: string): string {
    const { r, g, b } = parseHex(hex);
    const f = 0.55;  // keep 55% of source color
    return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
}
function parseHex(hex: string): { r: number; g: number; b: number } {
    const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (!m) return { r: 128, g: 128, b: 128 };
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

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

        // Total viewport including render padding on every side so the cue
        // stick can draw past the table edge.
        const tableW = GameConfig.gameSize.x;
        const tableH = GameConfig.gameSize.y;
        const totalW = tableW + RENDER_PADDING * 2;
        const totalH = tableH + RENDER_PADDING * 2;
        const widthToHeight: number = totalW / totalH;

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

        // scale converts game-space units to CSS pixels — sized against the
        // total padded viewport so the table fills (table / total) of the
        // canvas with padding around it.
        this._scale = new Vector2(cssWidth / totalW, cssHeight / totalH);
    }

    // Render padding accessor — Mouse.ts subtracts this from converted
    // pageX/pageY so game coords stay table-relative.
    public get renderPadding(): number {
        return RENDER_PADDING;
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
        // Shift to the inset table origin so game-coord (0,0) lands at the
        // top-left of the felt area, not the canvas edge. Cue stick draws
        // that extend past the table fall into the padding ring.
        this._context.translate(RENDER_PADDING + position.x, RENDER_PADDING + position.y);
        this._context.rotate(rotation);
        this._context.drawImage(sprite, 0, 0, sprite.width, sprite.height, -origin.x, -origin.y, sprite.width, sprite.height);
        this._context.restore();
    }


    public drawText(text: string, font:string, color: string, position: IVector2, textAlign: string = 'left'): void {
        this._context.save();
        this._context.scale(this._scale.x, this._scale.y);
        this._context.translate(RENDER_PADDING, RENDER_PADDING);
        this._context.fillStyle = color;
        this._context.font = font;
        this._context.textAlign = textAlign as CanvasTextAlign;
        this._context.fillText(text, position.x, position.y);
        this._context.restore();
    }

    public changeCursor(cursor: string): void {
        this._canvas.style.cursor = cursor;
    }

    /**
     * Side Pocket aim guide — dotted line from cue ball in the aim
     * direction, with a ghost-ball circle at the predicted contact /
     * stop point. Miniclip-style. JJ 2026-06: "still no visible white
     * guide line."
     */
    public drawAimGuide(startX: number, startY: number, endX: number, endY: number, ballR: number): void {
        const ctx = this._context;
        ctx.save();
        ctx.scale(this._scale.x, this._scale.y);
        ctx.translate(RENDER_PADDING, RENDER_PADDING);

        // Skip drawing the line through the cue ball itself
        const dx = endX - startX;
        const dy = endY - startY;
        const len = Math.hypot(dx, dy);
        if (len < ballR * 2) {
            ctx.restore();
            return;
        }
        const nx = dx / len, ny = dy / len;
        const lineStartX = startX + nx * ballR;
        const lineStartY = startY + ny * ballR;
        const lineEndX = endX - nx * ballR;
        const lineEndY = endY - ny * ballR;

        // Dotted line — white with slight transparency, dash pattern
        ctx.setLineDash([8, 8]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(lineStartX, lineStartY);
        ctx.lineTo(lineEndX, lineEndY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Ghost-ball circle at the contact / stop point
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(endX, endY, ballR, 0, Math.PI * 2);
        ctx.stroke();
        // Subtle inner fill so the ghost reads against the felt
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fill();

        ctx.restore();
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
        // Three-layer table per designer Round 2 spec (JJ playtest 2026-06):
        //   FELT_INSET (48)         = outer wood frame thickness
        //   CUSHION_INNER (78)      = where balls bounce + where play surface starts
        //                             (= feltInset + cushionThickness)
        // Cushion bumper sits between FELT_INSET and CUSHION_INNER as a
        // felt-wrapped strip with a light highlight on top and a shadow
        // line dropping to the recessed play surface.
        const FELT_INSET = GameConfig.table.feltInset;
        const CUSHION_INNER = GameConfig.table.cushionWidth;
        const POCKETS = GameConfig.table.pocketsPositions;
        const POCKET_R = GameConfig.table.pocketRadius;

        ctx.save();
        ctx.scale(this._scale.x, this._scale.y);
        ctx.translate(RENDER_PADDING, RENDER_PADDING);

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

        // ---- LAYER 2: Recessed play surface (felt) ---------------------
        // Drawn BEFORE cushions per designer Round 2 spec — the felt
        // extends UNDER the cushion strip and behind the pockets. This
        // way the cushion's edge reads as floating on top of the felt
        // (giving the proper visual "drop" depth) rather than meeting
        // the felt at a flat seam.
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

        // Warm overhead lamp glow (additive cream tint) — only over the
        // play surface (where the lamp would actually illuminate)
        const lampGrad = ctx.createRadialGradient(
            W / 2, H * 0.38, 0,
            W / 2, H * 0.38, Math.max(feltW, feltH) * 0.55
        );
        lampGrad.addColorStop(0,    'rgba(255,230,176,0.18)');
        lampGrad.addColorStop(0.45, 'rgba(255,230,176,0.04)');
        lampGrad.addColorStop(1,    'rgba(255,230,176,0)');
        ctx.fillStyle = lampGrad;
        ctx.fillRect(feltX, feltY, feltW, feltH);

        // ---- LAYER 3: Cushion bumpers (6 chamfered polygons) -----------
        // Port of designer's buildCushions() — replaces the flat-rectangle
        // ring with 6 V-tipped polygons:
        //   top   (split in 2 by top side pocket)
        //   bottom (split in 2 by bottom side pocket)
        //   left  (single piece between TL and BL)
        //   right (single piece between TR and BR)
        // Each cushion has chamfered ends pointing toward its adjacent
        // pockets (CHAMFER = 30px miter). Endpoints land exactly where
        // the pocket circle crosses the wood-seam line (Pythagoras).
        const I = FELT_INSET;        // 48 — outer/wood seam
        const J = CUSHION_INNER;     // 78 — inner/play-surface seam
        const C = 30;                // chamfer miter (CHAMFER_T)

        type CushSide = 'top' | 'bottom' | 'left' | 'right';
        interface Cush {
            side: CushSide;
            poly: Array<[number, number]>;
        }

        // Pocket positions — OUR config order:
        //   [0]=TL  [1]=top-side  [2]=TR  [3]=BL  [4]=bottom-side  [5]=BR
        const cushions: Cush[] = [];

        // Helper: where pocket circle crosses the outer cushion line (y=I or x=I).
        // For TOP cushions, atCoord = I; we solve for the x offset from the
        // pocket centre at which the pocket circle reaches y = I.
        const pocketOffsetX = (pCenter: { x: number; y: number }, atY: number): number => {
            const d = atY - pCenter.y;
            const r2 = POCKET_R * POCKET_R - d * d;
            return Math.sqrt(Math.max(0, r2));
        };
        const pocketOffsetY = (pCenter: { x: number; y: number }, atX: number): number => {
            const d = atX - pCenter.x;
            const r2 = POCKET_R * POCKET_R - d * d;
            return Math.sqrt(Math.max(0, r2));
        };

        // TOP — two cushions split by the top side pocket
        for (const half of [
            { L: POCKETS[0], R: POCKETS[1] },   // TL → top-side
            { L: POCKETS[1], R: POCKETS[2] },   // top-side → TR
        ]) {
            const xL = half.L.x + pocketOffsetX(half.L, I);
            const xR = half.R.x - pocketOffsetX(half.R, I);
            cushions.push({
                side: 'top',
                poly: [
                    [xL,     I],
                    [xR,     I],
                    [xR - C, J],
                    [xL + C, J],
                ],
            });
        }

        // BOTTOM
        const Ibot = H - I;
        const Jbot = H - J;
        for (const half of [
            { L: POCKETS[3], R: POCKETS[4] },   // BL → bottom-side
            { L: POCKETS[4], R: POCKETS[5] },   // bottom-side → BR
        ]) {
            const xL = half.L.x + pocketOffsetX(half.L, Ibot);
            const xR = half.R.x - pocketOffsetX(half.R, Ibot);
            cushions.push({
                side: 'bottom',
                poly: [
                    [xL + C, Jbot],
                    [xR - C, Jbot],
                    [xR,     Ibot],
                    [xL,     Ibot],
                ],
            });
        }

        // LEFT — single piece TL → BL
        {
            const yT = POCKETS[0].y + pocketOffsetY(POCKETS[0], I);
            const yB = POCKETS[3].y - pocketOffsetY(POCKETS[3], I);
            cushions.push({
                side: 'left',
                poly: [
                    [I, yT],
                    [J, yT + C],
                    [J, yB - C],
                    [I, yB],
                ],
            });
        }

        // RIGHT — single piece TR → BR
        const Iright = W - I;
        const Jright = W - J;
        {
            const yT = POCKETS[2].y + pocketOffsetY(POCKETS[2], Iright);
            const yB = POCKETS[5].y - pocketOffsetY(POCKETS[5], Iright);
            cushions.push({
                side: 'right',
                poly: [
                    [Jright, yT + C],
                    [Iright, yT],
                    [Iright, yB],
                    [Jright, yB - C],
                ],
            });
        }

        // Draw each cushion polygon with directional gradient + outline.
        // Gradients per designer Round 2 spec — brightest at 68% along the
        // wood→felt axis, darkest at the felt edge (the "drop shadow").
        const drawCushion = (c: Cush) => {
            let grad: CanvasGradient;
            if (c.side === 'top') {
                grad = ctx.createLinearGradient(0, I, 0, J);
            } else if (c.side === 'bottom') {
                grad = ctx.createLinearGradient(0, Jbot, 0, Ibot);
            } else if (c.side === 'left') {
                grad = ctx.createLinearGradient(I, 0, J, 0);
            } else {
                grad = ctx.createLinearGradient(Iright, 0, Jright, 0);
            }
            grad.addColorStop(0,    '#143E72');
            grad.addColorStop(0.35, '#1E5FA8');
            grad.addColorStop(0.68, '#2470BD');
            grad.addColorStop(1,    '#08213F');

            ctx.fillStyle = grad;
            ctx.beginPath();
            c.poly.forEach((p, i) => i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]));
            ctx.closePath();
            ctx.fill();

            // Wrap-fold seam outline — implies the felt fabric wrapping
            // the rubber inside the cushion
            ctx.strokeStyle = 'rgba(0,0,0,0.32)';
            ctx.lineWidth = 0.9;
            ctx.stroke();
        };

        cushions.forEach(drawCushion);

        // Cushion bullnose highlights — small bright dots at each chamfer
        // tip catching light on the rounded felt-wrap fold. Two per
        // cushion (one at each pocket-facing tip).
        const drawBullnose = (c: Cush) => {
            // Outer-edge corners (the tips facing pockets) — first 2 verts
            // for top/bottom in poly order; first+last for left/right.
            const tipIdxs = c.side === 'top'    ? [0, 1]
                          : c.side === 'bottom' ? [3, 2]
                          : c.side === 'left'   ? [0, 3]
                          :                       [1, 2];
            // Centre of the polygon for nudging the highlight inward
            const xs = c.poly.map(p => p[0]);
            const ys = c.poly.map(p => p[1]);
            const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
            const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
            for (const idx of tipIdxs) {
                const [tx, ty] = c.poly[idx];
                const dx = cx - tx, dy = cy - ty;
                const len = Math.hypot(dx, dy) || 1;
                const nx = tx + (dx / len) * 5;
                const ny = ty + (dy / len) * 5;
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                ctx.beginPath();
                ctx.arc(nx, ny, 2.4, 0, Math.PI * 2);
                ctx.fill();
            }
        };
        cushions.forEach(drawBullnose);

        // Head string line + foot spot (faint, on the play surface)
        ctx.strokeStyle = 'rgba(0,0,0,0.28)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(375, CUSHION_INNER + 6);
        ctx.lineTo(375, H - CUSHION_INNER - 6);
        ctx.stroke();
        ctx.fillStyle = 'rgba(244,236,219,0.55)';
        ctx.beginPath();
        ctx.arc(375, 412, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(1125, 412, 3, 0, Math.PI * 2);
        ctx.fill();

        // ---- LAYER 4: Pockets ------------------------------------------
        // JJ 2026-06: "the pockets seem to eat into the wood" — Miniclip
        // has the wood visibly carved around each pocket. We approximate
        // by drawing the VISIBLE pocket at a slightly larger radius than
        // the physics-capture POCKET_R (sim still uses POCKET_R for
        // ball-in-pocket detection). The visible hole punches further
        // into the wood frame, giving the "eaten into wood" look.
        const VISIBLE_POCKET_R = POCKET_R + 6;   // 48 visible vs 42 capture
        POCKETS.forEach(p => {
            // Outer rim shadow (soft dark collar extending beyond the
            // hole — sells depth and "wood curving away" effect)
            const rimGrad = ctx.createRadialGradient(p.x, p.y, VISIBLE_POCKET_R * 0.85, p.x, p.y, VISIBLE_POCKET_R + 10);
            rimGrad.addColorStop(0,    'rgba(0,0,0,0)');
            rimGrad.addColorStop(0.55, 'rgba(0,0,0,0.65)');
            rimGrad.addColorStop(1,    'rgba(0,0,0,0)');
            ctx.fillStyle = rimGrad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, VISIBLE_POCKET_R + 10, 0, Math.PI * 2);
            ctx.fill();

            // Brass pocket rim — thin warm-metal ring at the visible
            // pocket edge. Catches "rim light" before the hole drops.
            const brassGrad = ctx.createRadialGradient(p.x, p.y, VISIBLE_POCKET_R - 4, p.x, p.y, VISIBLE_POCKET_R + 1);
            brassGrad.addColorStop(0,    'rgba(201, 162, 74, 0)');
            brassGrad.addColorStop(0.6,  'rgba(201, 162, 74, 0.55)');
            brassGrad.addColorStop(1,    'rgba(110, 76, 22, 0.75)');
            ctx.fillStyle = brassGrad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, VISIBLE_POCKET_R + 1, 0, Math.PI * 2);
            ctx.fill();

            // Dark hole — cylinder with subtle inner shadow
            const holeGrad = ctx.createRadialGradient(p.x, p.y - VISIBLE_POCKET_R * 0.1, 0, p.x, p.y, VISIBLE_POCKET_R);
            holeGrad.addColorStop(0,    '#1a1a1d');
            holeGrad.addColorStop(0.55, '#08080a');
            holeGrad.addColorStop(1,    '#000000');
            ctx.fillStyle = holeGrad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, VISIBLE_POCKET_R, 0, Math.PI * 2);
            ctx.fill();

            // Deep top-arc inner shadow (sells it as a hole, not a button)
            ctx.strokeStyle = 'rgba(0,0,0,0.85)';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(p.x, p.y - 3, VISIBLE_POCKET_R - 4, Math.PI * 1.15, Math.PI * 1.85);
            ctx.stroke();

            // Subtle bottom-rim highlight — faint light catching the
            // far inside lip of the pocket
            ctx.strokeStyle = 'rgba(255,255,255,0.10)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(p.x, p.y + 2, VISIBLE_POCKET_R - 3, Math.PI * 0.2, Math.PI * 0.8);
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

    // ====================================================================
    // SIDE POCKET — procedural American 8-ball ball
    //
    // Replaces the UK red/yellow PNG sprites. Renders a numbered ball at
    // any position: solid (1-7) or striped (9-15) in the brand palette,
    // plus the off-white cue (0) and near-black eight (8). Source colors
    // lifted from Round 2 colors_and_type.css / round2_canvas.jsx.
    //
    // Drawn in game-coords; Canvas2D wraps the scale + padding translate.
    // Each ball ≈ 38px diameter (matches GameConfig.ball.diameter).
    // ====================================================================
    public drawAmericanBall(position: IVector2, ballId: number, rotation: number = 0): void {
        const ctx = this._context;
        const R = GameConfig.ball.diameter / 2;  // 19
        const isStripe = ballId >= 9 && ballId <= 15;
        const baseN = isStripe ? ballId - 8 : ballId;  // 1-7 color index

        // Brand ball palette (from Round 2 colors_and_type.css)
        const SOLID_COLORS: Record<number, string> = {
            1: '#F4B924',  // yellow
            2: '#1F5BB3',  // blue
            3: '#C6312A',  // red
            4: '#5B2680',  // purple
            5: '#E2691C',  // orange
            6: '#1E7A3A',  // green
            7: '#6E2618',  // burgundy
        };
        const CUE_COLOR = '#FAF6E4';
        const EIGHT_COLOR = '#0E0E10';

        ctx.save();
        ctx.scale(this._scale.x, this._scale.y);
        ctx.translate(RENDER_PADDING + position.x, RENDER_PADDING + position.y);

        // TOP-DOWN SHADOW (Miniclip-style) — soft circular vignette
        // OUTSIDE the ball perimeter. No directional ellipse — that
        // makes the ball look 3D-angled, wrong for top-down pool.
        // The shadow is symmetric and sells "ball resting on felt"
        // depth without implying a side-lit camera.
        const shadowGrad = ctx.createRadialGradient(0, 0, R * 0.95, 0, 0, R * 1.4);
        shadowGrad.addColorStop(0, 'rgba(0,0,0,0.35)');
        shadowGrad.addColorStop(0.5, 'rgba(0,0,0,0.18)');
        shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = shadowGrad;
        ctx.beginPath();
        ctx.arc(0, 0, R * 1.4, 0, Math.PI * 2);
        ctx.fill();

        // ROLLING — apply the ball's rotation. The pattern (stripe band,
        // number disc) rotates inside the perimeter; the specular and
        // vignette stay fixed in screen space (light source is the
        // overhead lamp, not the ball itself). Save/rotate/restore so
        // only the pattern rolls.
        if (ballId === 0) {
            // Cue ball — uniform off-white. Rotation invisible (symmetric).
            this.drawBallBase(ctx, R, CUE_COLOR);
            this.drawBallSpecular(ctx, R);
        } else if (ballId === 8) {
            // 8-ball — black base with a rolling white number disc.
            this.drawBallBase(ctx, R, EIGHT_COLOR);
            ctx.save();
            ctx.rotate(rotation);
            this.drawNumberDot(ctx, R, 8);
            ctx.restore();
            this.drawBallSpecular(ctx, R);
        } else {
            const c = SOLID_COLORS[baseN] || '#999999';
            if (isStripe) {
                // White base + rotated stripe band + rotated number disc.
                this.drawBallBase(ctx, R, '#FAF6E4');
                ctx.save();
                ctx.rotate(rotation);
                this.drawStripeBand(ctx, R, c);
                this.drawNumberDot(ctx, R, ballId);
                ctx.restore();
            } else {
                this.drawBallBase(ctx, R, c);
                ctx.save();
                ctx.rotate(rotation);
                this.drawNumberDot(ctx, R, ballId);
                ctx.restore();
            }
            this.drawBallSpecular(ctx, R);
        }

        // BALL RIM — thin dark outline grounds the ball on the felt.
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(0, 0, R, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    // Solid base disc — flat color with subtle inner shading for depth.
    // No directional highlight here; the specular is a separate layer.
    private drawBallBase(
        ctx: CanvasRenderingContext2D,
        R: number,
        baseColor: string,
    ): void {
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
        grad.addColorStop(0, lightenColor(baseColor));
        grad.addColorStop(0.55, baseColor);
        grad.addColorStop(1, darkenColor(baseColor));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, R, 0, Math.PI * 2);
        ctx.fill();
    }

    // Specular highlight — fixed in screen space (light source is the
    // overhead lamp at upper-left, doesn't rotate with the ball).
    private drawBallSpecular(
        ctx: CanvasRenderingContext2D,
        R: number,
    ): void {
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.ellipse(-R * 0.35, -R * 0.4, R * 0.28, R * 0.18, -Math.PI * 0.18, 0, Math.PI * 2);
        ctx.fill();
        // Tighter inner bright spot
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.beginPath();
        ctx.ellipse(-R * 0.4, -R * 0.45, R * 0.13, R * 0.08, -Math.PI * 0.18, 0, Math.PI * 2);
        ctx.fill();
    }

    // Striped band — colored horizontal stripe across the middle.
    // Clipped to the ball circle. Rotates with the ball.
    private drawStripeBand(
        ctx: CanvasRenderingContext2D,
        R: number,
        bandColor: string,
    ): void {
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, R, 0, Math.PI * 2);
        ctx.clip();
        const bandGrad = ctx.createLinearGradient(0, -R * 0.45, 0, R * 0.45);
        bandGrad.addColorStop(0, darkenColor(bandColor));
        bandGrad.addColorStop(0.5, bandColor);
        bandGrad.addColorStop(1, darkenColor(bandColor));
        ctx.fillStyle = bandGrad;
        ctx.fillRect(-R, -R * 0.45, R * 2, R * 0.9);
        ctx.restore();
    }

    // White number disc — rotates with the ball (rolling effect).
    private drawNumberDot(
        ctx: CanvasRenderingContext2D,
        R: number,
        n: number,
    ): void {
        // White circle
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.42, 0, Math.PI * 2);
        ctx.fill();
        // Tiny inner bevel
        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
        // Number text — black for all balls (white disc is universal)
        ctx.fillStyle = '#14192A';
        ctx.font = `bold ${Math.round(R * 0.55)}px "Bitter", Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(n), 0, 0);
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
        ctx.translate(RENDER_PADDING, RENDER_PADDING);

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
