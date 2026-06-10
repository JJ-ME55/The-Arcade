import { MenuActionType } from './menu/menu-action-type';
import { IGameConfig } from './game.config.type';

export const GameConfig : IGameConfig = {

    gameSize: { x: 1500, y: 825 },

    soundOn: true,

    timeoutToHideStickAfterShot: 500,

    timeoutToHideBallAfterPocket: 100,

    loadingScreenTimeout: 5000,

    loadingScreenImagePosition: { x: 450, y: 112.5 },

    timeoutToLoadSubMenu: 100,

    // Side Pocket palette — paper cream on cobalt felt for in-canvas labels.
    // Font stack: Lilita One (brand display) with Impact as the immediate
    // fallback so we stay readable while webfonts hydrate.
    labels: {
        currentPlayer: {
            position: { x: 640, y: 260},
            color: '#F4ECDB',
            font: '70px "Lilita One", Impact, sans-serif',
            alignment: 'top',
            text: 'PLAYER ',
        },
        overalScores: [
            {
                position: { x: 628, y: 460 },
                color: '#F4ECDB',
                font: '200px "Lilita One", Impact, sans-serif',
                alignment: 'top'
            },
            {
                position: { x: 778, y: 460 },
                color: '#F4ECDB',
                font: '200px "Lilita One", Impact, sans-serif',
                alignment: 'top'
            }
        ]
    },

    redBallsPositions: [
        { x: 1056, y: 433 },
        { x: 1090, y: 374 },
        { x: 1126, y: 393 },
        { x: 1126, y: 472 },
        { x: 1162, y: 335 },
        { x: 1162, y: 374 },
        { x: 1162, y: 452 },
    ],

    yellowBallsPositions: [
        { x: 1022, y: 413 },
        { x: 1056, y: 393 },
        { x: 1090, y: 452 },
        { x: 1126, y: 354 },
        { x: 1126, y: 433 },
        { x: 1162, y: 413 },
        { x: 1162, y: 491 },
    ],

    cueBallPosition: { x: 413, y: 413 },

    eightBallPosition: { x: 1090, y: 413 },

    matchScore: {
        scoresPositions: [
            { x: 420, y: 27 },
            { x: 932, y: 27 }
        ],
        unitMargin: 20
    },

    sprites: {
        basePath: 'assets/sprites/',
        paths: {
            menuBackground : 'main_menu_background.png',
            table : 'spr_background4.png',
            cueBall : 'spr_ball2.png',
            redBall : 'spr_redBall2.png',
            yellowBall : 'spr_yellowBall2.png',
            blackBall : 'spr_blackBall2.png',
            stick : 'spr_stick.png',
            twoPlayersButton : '2_players_button.png',
            twoPlayersButtonHovered : '2_players_button_hover.png',
            onePlayerButton : '1_player_button.png',
            onePlayerButtonHovered : '1_player_button_hover.png',
            muteButton : 'mute_button.png',
            muteButtonHovered : 'mute_button_hover.png',
            muteButtonPressed : 'mute_button_pressed.png',
            muteButtonPressedHovered : 'mute_button_pressed_hover.png',
            easyButton : 'easy_button.png',
            easyButtonHovered : 'easy_button_hover.png',
            mediumButton : 'medium_button.png',
            mediumButtonHovered : 'medium_button_hover.png',
            hardButton : 'hard_button.png',
            hardButtonHovered : 'hard_button_hover.png',
            backButton : 'back_button.png',
            backButtonHovered : 'back_button_hover.png',
            continueButton : 'continue_button.png',
            continueButtonHovered : 'continue_button_hover.png',
            insaneButton : 'insane_button.png',
            insaneButtonHovered : 'insane_button_hover.png',
            controls : 'controls.png',
            redScore: 'red_score.png',
            yellowScore: 'yellow_score.png'
        }
    },

    sounds: {
        basePath: 'assets/sounds/',
        paths: {
            ballsCollide: 'BallsCollide.wav',
            strike: 'Strike.wav',
            rail: 'Hole.wav',
        }
    },

    // Physics — two-regime model from deep-research workflow wghummavd
    // (2026-06). Velocity in our codebase is in px/TICK (not px/sec),
    // so the literal physics decel (17.3 px/tick²) was 25× too strong
    // — a 60 px/tick shot stopped in 4 frames. Retuned empirically to
    // match the original game's stop-time (~4s for medium shots) while
    // keeping the two-regime SHAPE: snappy slide, long slow roll.
    //
    // Tuning constraints:
    //   - Hard shot (120 px/tick) stops in ~4.5s
    //   - Medium shot (60 px/tick) stops in ~4s
    //   - Soft shot (15 px/tick) stops in ~2.5s
    //   - Slide phase ~25-50% of total time (snappy feel)
    //   - Roll phase ~50-75% (long, slow tail)
    //   - Ratio slidingDecel:rollingDecel ≈ 15× (close to research's 20-30×)
    physics: {
        // Retuned 2026-06 per JJ playtest: "balls slow down prematurely
        // and the power settings seem weaker than they should." Eased
        // sliding and especially rolling so a hard shot covers ~2 table
        // widths instead of stopping after 1. Slip threshold lowered so
        // the long rolling tail kicks in sooner — most of the "feel" of
        // a pool shot is in that slow roll, not the brief slide.
        //
        // For v0=50 (max power): sliding 50→15 = 29 frames @ ~940 px,
        // rolling 15→0 = 250 frames @ ~1875 px, total ~2815 px / ~4.7 s.
        // For v0=25 (half):       sliding 25→15 = 8 frames @ ~160 px,
        // rolling 15→0 = 250 frames @ ~1875 px, total ~2035 px / ~4.3 s.
        // Differentiation comes from sliding distance, not rolling
        // (which converges to a fixed tail given threshold + decel).
        friction:           0.018,   // legacy, unused by stepWorld
        slidingDecel:       1.2,     // was 1.5 — eased so power reads stronger
        rollingDecel:       0.06,    // was 0.10 — long lazy roll, like real felt
        rollSlipThreshold:  15,      // was 20 — earlier transition to rolling
        collisionLoss:      0.018,
    },

    // Table geometry — aligned to designer Round 2 spec (asset/side_pocket_handoff/
    // source/round2_canvas.jsx). The table has THREE visual layers (JJ
    // playtest 2026-06 caught that I'd flattened them):
    //   1. Wood frame      0 → feltInset (48)      cherry-stained mitered rails
    //   2. Cushion bumper  feltInset → cushionWidth (48 → 78)  felt-wrapped strip
    //   3. Play surface    cushionWidth → table-cushionWidth (78 → 1422)
    //                       recessed felt where the balls live
    // cushionWidth = feltInset + cushionThickness = 48 + 30 = 78 is the
    // ball-bounce boundary (where the cushion's inner face meets the
    // play area). POCKET_R = 42 = regulation 2.2× ball diameter.
    table: {
        cushionWidth:     78,
        feltInset:        48,
        cushionThickness: 30,
        pocketRadius:     42,
        pocketsPositions: [
            { x: 62,   y: 62  },   // TL corner
            { x: 750,  y: 56  },   // Top side
            { x: 1438, y: 62  },   // TR corner
            { x: 62,   y: 763 },   // BL corner
            { x: 750,  y: 769 },   // Bottom side
            { x: 1438, y: 763 }    // BR corner
        ]
    },

    ball: {
        diameter: 38,
        origin: { x: 25, y: 25 },
        minVelocityLength: 0.05,
        maxExpectedVelocity: 120,
        maxExpectedCollisionForce: 70
    },

    stick: {
        origin: { x: 970, y: 11 },
        shotOrigin: { x: 950, y: 11 },
        powerToAddPerFrame: 1,
        movementPerFrame: 3,
        maxPower: 50
    },

    input: {
        mouseSelectButton: 0,
        mouseShootButton: 0,
        mousePlaceBallButton: 0,
        increaseShotPowerKey: 87,
        decreaseShotPowerKey: 83,
        toggleMenuKey: 27
    },

    mainMenu : {
        
        labels: [
            {
                text: 'SIDE POCKET',
                position: { x: 200, y: 130 },
                font: '120px "Lilita One", Impact, sans-serif',
                color: '#F4ECDB',
                alignment: 'left',
            },
            {
                text: 'THE ARCADE · 8-BALL',
                position: { x: 200, y: 175 },
                font: '22px "Inter", system-ui, sans-serif',
                color: '#B7AE94',
                alignment: 'left',
            },
            {
                text: `© ${new Date().getFullYear()} The Arcade`,
                position: { x: 1250, y: 800 },
                font: '14px "IBM Plex Mono", monospace',
                color: '#6E6750',
                alignment: 'left',
            }
        ],

        buttons: [
            { 
                action: MenuActionType.PVP,
                position: { x: 200, y: 200 },
                sprite: 'twoPlayersButton', 
                spriteOnHover: 'twoPlayersButtonHovered', 
            },
            { 
                action: MenuActionType.GoToSubMenu,
                value: 0,
                position: { x: 200, y: 400 },
                sprite: 'onePlayerButton', 
                spriteOnHover: 'onePlayerButtonHovered', 
            },
            { 
                action: MenuActionType.ToggleSound,
                position: { x: 1430, y: 10 },
                sprite: 'muteButton', 
                spriteOnHover: 'muteButtonHovered', 
            },
        ],

        subMenus: [
            {
                
                labels: [
                    {
                        text: 'CHOOSE DIFFICULTY',
                        position: { x: 200, y: 100 },
                        font: '72px "Lilita One", Impact, sans-serif',
                        color: '#F4ECDB',
                        alignment: 'left',
                    },
                    {
                        text: `© ${new Date().getFullYear()} The Arcade`,
                        position: { x: 1250, y: 800 },
                        font: '14px "IBM Plex Mono", monospace',
                        color: '#6E6750',
                        alignment: 'left',
                    }
                ],

                buttons: [
                    {
                        action: MenuActionType.GoToPreviousMenu,
                        position: { x: 100, y: 150 },
                        sprite: 'backButton', 
                        spriteOnHover: 'backButtonHovered', 
                    },
                    {
                        action: MenuActionType.PVC,
                        position: { x: 200, y: 150 },
                        value: 30,
                        sprite: 'easyButton',
                        spriteOnHover: 'easyButtonHovered'
                    },
                    {
                        action: MenuActionType.PVC,
                        position: { x: 200, y: 300 },
                        value: 50,
                        sprite: 'mediumButton',
                        spriteOnHover: 'mediumButtonHovered'
                    },
                    {
                        action: MenuActionType.PVC,
                        position: { x: 200, y: 450 },
                        value: 100,
                        sprite: 'hardButton',
                        spriteOnHover: 'hardButtonHovered'
                    },
                    {
                        action: MenuActionType.PVC,
                        position: { x: 200, y: 600 },
                        value: 700,
                        sprite: 'insaneButton',
                        spriteOnHover: 'insaneButtonHovered'
                    },
                    { 
                        action: MenuActionType.ToggleSound,
                        position: { x: 1430, y: 10 },
                        sprite: 'muteButton', 
                        spriteOnHover: 'muteButtonHovered', 
                    },
                ],

                subMenus: []
            }
        ]
    },
    
    cursor: {
        default: 'default',
        button: 'pointer'
    },

    ai: {
        on: true,
        trainIterations: 8,   // was 30 — synchronous trainer froze the renderer for tens of seconds per AI turn under two-regime physics (each sim ~3x longer); 8 iterations + the 400-tick cap in ai-trainer.ts keeps an opponent turn under ~1s
        playerIndex: 1,
        ballDistanceBonus: 1/5800,
        validTurnBonus: 5000,
        pocketedBallBonus: 2000,
        invalidTurnPenalty: 3000,
        gameWonBonus: 50000,
        gameLossPenalty: 50000,
        shotPowerMutationVariance: 15,
        minShotPower: 10,
    },
};
