import { GameConfig } from './game.config';
import { IAssetsConfig } from './game.config.type';

//------Configurations------//

const sprites: IAssetsConfig = GameConfig.sprites;
const sounds: IAssetsConfig = GameConfig.sounds;

class Assets_Singleton {

    //------Members------//

    _sprites: Map<string, HTMLImageElement>;
    _sounds: Map<string, HTMLAudioElement>;

    //------Constructor------//

    constructor() {
        this._sprites = new Map<string, HTMLImageElement>();
        this._sounds = new Map<string, HTMLAudioElement>();
    }

    //------Private Methods------//

    private loadSprite(path: string): Promise<void> {
        const img = new Image();
        this._sprites.set(path, img);

        return new Promise(resolve => {
            img.onload = () => resolve();
            img.src = sprites.basePath + path;
        });
    }
    
    private async loadGameSprites(): Promise<void> {
        const loadPromises = Object.values(sprites.paths).map(this.loadSprite.bind(this));

        await Promise.all(loadPromises);
    }

    private loadSound(path: string): Promise<void> {
        const audio: HTMLAudioElement = new Audio(sounds.basePath + path);
        this._sounds.set(path, audio);
        audio.load();

        // CRITICAL FIX 2026-06: in real browsers, `audio.onloadeddata`
        // does NOT reliably fire without a user gesture under Chrome's
        // autoplay policy. The previous code awaited only onloadeddata
        // and hung forever on production — game.init() never completed,
        // gameLoop never started, canvas stayed transparent, and the
        // React→iframe globals stayed as the index.html stubs (so the
        // Shoot button and power slider were dead). JJ verified blank
        // canvas + stub handlers via Claude_in_Chrome probe.
        //
        // The new behaviour resolves on the FIRST of:
        //   - `canplaythrough` (the strongest "ready" signal)
        //   - `loadeddata` (kept for back-compat with browsers that fire
        //     it without gesture)
        //   - `loadedmetadata` (fires even when full decode is blocked)
        //   - `error` (so a single bad asset doesn't deadlock init)
        //   - a 1500ms safety timeout (so missing events never hang init)
        // The audio still plays correctly when invoked later via a user
        // gesture; we just don't BLOCK init on the event.
        return new Promise(resolve => {
            let settled = false;
            const done = () => {
                if (settled) return;
                settled = true;
                resolve();
            };
            audio.addEventListener('canplaythrough', done, { once: true });
            audio.addEventListener('loadeddata', done, { once: true });
            audio.addEventListener('loadedmetadata', done, { once: true });
            audio.addEventListener('error', done, { once: true });
            // Belt-and-braces: 1.5 s timeout. Even with all four events
            // failing to fire, init must not deadlock — the game runs
            // fine without preloaded audio (sounds just play late on
            // first invocation).
            setTimeout(done, 1500);
        });
    }

    private async loadGameSounds(): Promise<void> {
        const loadPromises = Object.values(sounds.paths).map(this.loadSound.bind(this));
        
        await Promise.all(loadPromises);
    }

    //------Public Methods------//

    public async loadGameAssets(): Promise<void> {
        await this.loadGameSounds();
        await this.loadGameSprites();
    }

    public getSprite(key: string): HTMLImageElement {
        return this._sprites.get(key);
    }

    public getSound(key: string): HTMLAudioElement {
        return this._sounds.get(key).cloneNode(true) as HTMLAudioElement;
    }

    public playSound(key: string, volume: number): void {
        if(GameConfig.soundOn) {
            const sound = this.getSound(key);
            sound.volume = volume;
            sound.play();
        }
    }
}

export const Assets = new Assets_Singleton();