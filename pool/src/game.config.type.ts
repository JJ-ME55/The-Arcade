import { MenuActionType } from './menu/menu-action-type';

export interface IGameConfig {
    gameSize:                     IVector2;
    soundOn:                      boolean;
    timeoutToHideStickAfterShot:  number;
    timeoutToHideBallAfterPocket: number;
    loadingScreenTimeout:         number;
    timeoutToLoadSubMenu:         number;
    loadingScreenImagePosition:   IVector2;
    labels:                       ILabelsConfig;
    redBallsPositions:            IVector2[];
    yellowBallsPositions:         IVector2[];
    cueBallPosition:              IVector2;
    eightBallPosition:            IVector2;
    matchScore:                   IMatchScoreConfig;
    sprites:                      IAssetsConfig;
    sounds:                       IAssetsConfig;
    physics:                      IPhysicsConfig;
    table:                        ITableConfig;
    ball:                         IBallConfig;
    stick:                        IStickConfig;
    input:                        IInputConfig;
    mainMenu:                     IMenuConfig;
    cursor:                       ICursorConfig;
    ai:                           IAIConfig;
}

export interface IVector2 {
    x: number;
    y: number;
}

export interface ILabelsConfig {
    currentPlayer: ILabel;
    overalScores:  ILabel[];
}

export interface IMatchScoreConfig {
    scoresPositions: IVector2[];
    unitMargin:      number;
}

export interface IAssetsConfig {
    basePath: string;
    paths:    { [key: string]: string };
}

export interface IPhysicsConfig {
    /** Legacy exponential-damping coefficient — unused as of 2026-06
     *  two-regime physics refactor. Kept for back-compat. */
    friction:           number;
    /** Constant velocity decrement per tick during sliding (μ_s·g·dt). */
    slidingDecel:       number;
    /** Constant velocity decrement per tick during rolling (μ_r·g·dt). */
    rollingDecel:       number;
    /** Speed threshold below which the ball is in pure-rolling regime. */
    rollSlipThreshold:  number;
    collisionLoss:      number;
}

export interface ITableConfig {
    // Distance from canvas edge to the ball-bounce boundary (the inner
    // face of the cushion bumper). Used by sim/world.ts for collision
    // detection. Per designer Round 2: = feltInset + cushionThickness.
    cushionWidth:     number,
    // Visible wood-frame thickness on each side of the canvas. The
    // cushion bumper strip sits between feltInset and cushionWidth.
    // Used by canvas drawSidePocketTable only — sim doesn't see it.
    feltInset:        number,
    // Cushion bumper thickness (the felt-wrapped strip between the wood
    // frame and the play area). cushionWidth = feltInset + cushionThickness.
    // Used by canvas only.
    cushionThickness: number,
    pocketRadius:     number,
    pocketsPositions: IVector2[]
}

export interface IBallConfig {
    diameter:                  number;
    origin:                    IVector2;
    minVelocityLength:         number;
    maxExpectedVelocity:       number;
    maxExpectedCollisionForce: number;
}

export interface IStickConfig {
    origin:             IVector2,
    shotOrigin:         IVector2,
    powerToAddPerFrame: number,
    movementPerFrame:   number,
    maxPower:           number
}

export interface IInputConfig {
    mouseSelectButton:    number;
    mouseShootButton:     number;
    mousePlaceBallButton: number;
    increaseShotPowerKey: number;
    decreaseShotPowerKey: number;
    toggleMenuKey:        number;
}

export interface IMenuConfig {
    labels:   ILabel[];
    buttons:  IButton[];
    subMenus: IMenuConfig[];
}

export interface IButton {
    action:        MenuActionType;
    position:      IVector2;
    sprite:        string;
    spriteOnHover: string;
    value?:        number;
}

export interface ILabel {
    position:  IVector2;
    font:      string;
    color:     string;
    alignment: string;
    text?:     string;
}

export interface ICursorConfig {
    default: string,
    button:  string,
}
export interface IAIConfig {
    on:                        boolean;
    trainIterations:           number;
    playerIndex:               number;
    ballDistanceBonus:         number;
    validTurnBonus:            number;
    pocketedBallBonus:         number;
    invalidTurnPenalty:        number;
    gameWonBonus:              number;
    gameLossPenalty:           number;
    shotPowerMutationVariance: number;
    minShotPower:              number;
}
