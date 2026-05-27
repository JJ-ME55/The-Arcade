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
}

const canvas : HTMLCanvasElement = document.getElementById('screen') as HTMLCanvasElement;
const container : HTMLElement = document.getElementById('gameArea') as HTMLElement;
export const Canvas2D = new Canvas2D_Singleton(canvas, container);

window.addEventListener('resize', Canvas2D.resizeCanvas.bind(Canvas2D));
