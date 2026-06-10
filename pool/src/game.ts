import { AI } from './ai/ai-trainer';
import { GoToPreviousMenuCommand } from './menu/commands/go-to-previous-menu-command';
import { GoToSubMenuCommand } from './menu/commands/go-to-sub-menu-command';
import { ToggleSoundCommand } from './menu/commands/toggle-sound-command';
import { PVCCommand } from './menu/commands/pvc-command';
import { PVPCommand } from './menu/commands/pvp-command';
import { IMenuCommand } from './menu/commands/menu-command';
import { GameConfig } from './game.config';
import { MenuActionType } from './menu/menu-action-type';
import { Menu } from './menu/menu';
import { Assets } from './assets';
import { GameWorld } from './game-objects/game-world';
import { Keyboard } from './input/keyboard';
import { Canvas2D } from './canvas';
import { Mouse } from './input/mouse';
import { IAssetsConfig, IInputConfig } from './game.config.type';

//------Configurations------//

const sprites: IAssetsConfig = GameConfig.sprites;
const inputConfig: IInputConfig = GameConfig.input;

export class Game {

    //------Members------//

    private _menuActionsMap: Map<MenuActionType, IMenuCommand>;
    private _previousMenus: Menu[] = [];
    private _menu: Menu = new Menu();
    private _poolGame: GameWorld;
    private _isLoading: boolean;
    private _inGame: boolean;

    //------Private Methods------//

    private initMenuActions(): void {
        this._menuActionsMap = new Map<MenuActionType, IMenuCommand>();
        this._menuActionsMap.set(MenuActionType.PVP, new PVPCommand(this));
        this._menuActionsMap.set(MenuActionType.PVC, new PVCCommand(this));
        this._menuActionsMap.set(MenuActionType.ToggleSound, new ToggleSoundCommand());
        this._menuActionsMap.set(MenuActionType.GoToSubMenu, new GoToSubMenuCommand(this));
        this._menuActionsMap.set(MenuActionType.GoToPreviousMenu, new GoToPreviousMenuCommand(this));
    }

    private initMainMenu(): void {
        this._menu.init(this._menuActionsMap, GameConfig.mainMenu);
    }

    private displayLoadingScreen(): Promise<void> {
        return new Promise((resolve) => {
            this._isLoading = true;
            Canvas2D.clear();
            Canvas2D.drawImage(
                Assets.getSprite(sprites.paths.controls),
                GameConfig.loadingScreenImagePosition
                );
            setTimeout(() => {
                this._isLoading = false;
                resolve();
            }, GameConfig.loadingScreenTimeout);
        });
    }

    private handleInput(): void {
        if(this._inGame && Keyboard.isPressed(inputConfig.toggleMenuKey)) {
            if(this._menu.active) {
                this._menu.active = false;
            }
            else {
                this.initMainMenu();
                this._menu.active = true;
            }
        }
    }

    private update(): void {
        if (this._isLoading) return;
        this.handleInput();
        this._menu.active ? this._menu.update() : this._poolGame.update();
        Keyboard.reset();
        Mouse.reset();
    }

    private draw(): void {
        if (this._isLoading) return;
        if(AI.finishedSession){
            Canvas2D.clear();
            this._menu.active ? this._menu.draw() : this._poolGame.draw();
        }
    }

    private gameLoop(): void {
        this.update();
        this.draw();
        window.requestAnimationFrame(() => {
            this.gameLoop();
        });
    }

    //------Public Methods------//

    public async init(): Promise<void> {
        await Assets.loadGameAssets();
        // 3D-baked sphere sprites for drawAmericanBall. Generated offline
        // by pool/scripts/bake-ball-sprites.js (Three.js + headless
        // Chromium). Soft-fails if any sphere is missing — falls back
        // to procedural draw rather than blocking the game.
        await Canvas2D.preloadSphereSprites();
        // AAA atlas — 16 balls × 32 rotation frames. Falls back to the
        // sphere-base + procedural-overlay path if any frame fails to
        // load. Preferred when available because Miniclip's actual
        // rolling visual (per ex-Miniclip dev Ivo Alves's CV) is also
        // a pre-baked Cocos2d sprite atlas — same technique.
        await Canvas2D.preloadBallAtlas();

        this.initMenuActions();
        this.initMainMenu();

        // Phase B Match HUD — when the hub's React MatchHUD wraps this
        // iframe (?hud=parent), skip the in-canvas menu + the 5-second
        // controls overlay entirely and start a PvP match immediately.
        // The React HUD owns the player/score/timer/Shoot chrome; the
        // iframe just renders the cobalt table + balls + cue.
        if ((window as any).__SIDE_POCKET_PARENT_HUD) {
            this._menu.active = false;
            this._inGame = true;
            this._poolGame = new GameWorld();
            this._poolGame.initMatch();

            // Drain any buffered React→iframe calls that happened during
            // the 5-15s asset-load gap (index.html script installed stub
            // handlers that pushed to __SIDE_POCKET_BUFFER). Replay them
            // in order so the iframe is in sync with the React HUD state.
            const buffer: Array<[string, ...unknown[]]> =
                (window as any).__SIDE_POCKET_BUFFER || [];
            (window as any).__SIDE_POCKET_BUFFER = [];

            // Install the REAL handlers (overwrite the stubs).
            (window as any).__SIDE_POCKET_FORCE_SHOOT = () => {
                this._poolGame?.forceShootFromHud();
            };
            (window as any).__SIDE_POCKET_SET_POWER = (pct: number) => {
                this._poolGame?.setStickPowerFromHud(pct);
            };
            (window as any).__SIDE_POCKET_SET_SPIN = (x: number, y: number) => {
                this._poolGame?.setSpinFromHud(x, y);
            };
            (window as any).__SIDE_POCKET_TIMEOUT = () => {
                this._poolGame?.forfeitTurn();
            };
            // Debug probe — expose internal state so playtest can diagnose
            // why force_shoot does nothing. JJ 2026-06: "yet to see a ball
            // moving since the gap analysis." This lets a Claude_in_Chrome
            // probe inspect what guard is failing inside forceShootFromHud.
            (window as any).__SIDE_POCKET_DEBUG = () => {
                const pg: any = this._poolGame;
                if (!pg) return { error: 'no poolGame' };
                const stick = pg._stick;
                const cue = pg._cueBall;
                return {
                    AI_finishedSession: AI.finishedSession,
                    stick_visible: stick?._visible,
                    stick_movable: stick?._movable,
                    stick_power: stick?._power,
                    stick_rotation: stick?._rotation,
                    stick_aimState: stick?._aimState,
                    cue_position: cue ? { x: cue._position?.x, y: cue._position?.y } : null,
                    cue_velocity: cue ? { x: cue._velocity?.x, y: cue._velocity?.y } : null,
                    cue_moving: cue?._moving,
                    cue_visible: cue?._visible,
                    isBallInHand: pg.isBallInHand,
                    isBallsMoving: pg.isBallsMoving,
                    currentPlayerIndex: pg._currentPlayerIndex,
                };
            };

            // Now replay buffered actions (skip immediate shoots since
            // the player would not have aimed yet — only the LAST power
            // and spin states are interesting).
            let lastPower: number | null = null;
            let lastSpin: [number, number] | null = null;
            for (const item of buffer) {
                if (item[0] === 'power') lastPower = item[1] as number;
                else if (item[0] === 'spin') lastSpin = [item[1] as number, item[2] as number];
                // Note: buffered 'shoot' actions are discarded — firing
                // a shot before the player has aimed would be confusing.
            }
            if (lastPower !== null) this._poolGame.setStickPowerFromHud(lastPower);
            if (lastSpin !== null) this._poolGame.setSpinFromHud(lastSpin[0], lastSpin[1]);

            // Announce the opening turn now that the table is live, so the
            // React shot clock starts against an interactive game (not at
            // React mount, which races the asset load).
            this._poolGame.announceInitialTurn();
        } else {
            this._menu.active = true;
            this._poolGame = new GameWorld();
        }
        this.gameLoop();
    }

    public goToSubMenu(index: number): void {
        setTimeout(() => {
            if(this._menu){
                this._menu.active = false;
                this._previousMenus.push(this._menu);
            }
            this._menu = this._menu.getSubMenu(index);
            this._menu.active = true;   
        }, GameConfig.timeoutToLoadSubMenu);
    }
    
    public goToPreviousMenu(): void {
        if(this._previousMenus.length > 0) {
            setTimeout(() => {
                this._menu.active = false;
                this._menu = this._previousMenus.pop();
                this._menu.active = true; 
            }, GameConfig.timeoutToLoadSubMenu);
        }
    }

    public start(): void {
        this.displayLoadingScreen().then(() => {
            this._menu.active = false;
            this._inGame = true;
            this._poolGame = new GameWorld();
            this._poolGame.initMatch();
        });
    }
}

const game = new Game();
game.init();