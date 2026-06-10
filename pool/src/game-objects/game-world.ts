import { IInputConfig, IBallConfig, ITableConfig, IVector2, IPhysicsConfig, IAssetsConfig, ILabelsConfig, IMatchScoreConfig, IAIConfig } from './../game.config.type';
import { AI } from './../ai/ai-trainer';
import { mapRange } from '../common/helper';
import { Referee } from './referee';
import { Player } from './player';
import { Stick } from './stick';
import { Color } from '../common/color';
import { Vector2 } from '../geom/vector2';
import { GameConfig } from '../game.config';
import { Assets } from '../assets';
import { Canvas2D } from '../canvas';
import { Ball } from './ball';
import { Mouse } from '../input/mouse';
import { Keyboard } from '../input/keyboard';
import { SpinHud } from '../input/spin-hud';
import { State } from './state';
import { applySidespinToCushionBounce, applyTopBackSpinToBallCollision } from '../physics/spin';
import { stepWorld, mouthAt } from '../sim/world';
import type { SerializableBall, TableConfig, PhysicsConfig, ShotEvent } from '../sim/types';
import { syncBallsToSerializable, syncSerializableToBalls, buildSimTableConfig, buildSimPhysicsConfig } from '../sim/browser-adapter';

//------Configurations------//

const physicsConfig: IPhysicsConfig = GameConfig.physics;
const inputConfig: IInputConfig = GameConfig.input;
const ballConfig: IBallConfig = GameConfig.ball;
const tableConfig: ITableConfig = GameConfig.table;
const labelsConfig: ILabelsConfig = GameConfig.labels;
const matchScoreConfig: IMatchScoreConfig = GameConfig.matchScore;
const aiConfig: IAIConfig = GameConfig.ai;
const gameSize: IVector2 = GameConfig.gameSize;
const sprites: IAssetsConfig = GameConfig.sprites;
const sounds: IAssetsConfig = GameConfig.sounds;

export class GameWorld {

    //------Members------//

    private _stick: Stick;
    private _cueBall: Ball;
    private _8Ball: Ball;
    private _balls: Ball[];
    private _players: Player[] = [new Player(), new Player()];
    private _currentPlayerIndex = 0;
    private _turnState: State;
    private _referee: Referee;

    // Sim core configs — built once per match in initMatch(), passed to
    // stepWorld() every frame in simulateFrame(). The sim itself is stateless
    // beyond its event accumulator; all state lives on the Balls.
    private _simTable: TableConfig | null = null;
    private _simPhysics: PhysicsConfig | null = null;
    private _simTick: number = 0;

    // Sink ghosts — Miniclip-style pot animation. The sim hides a potted
    // ball the instant its centre crosses the hole; the render keeps a
    // ghost for ~240ms that accelerates into the pocket centre while
    // shrinking and fading. Purely cosmetic — game logic sees the ball
    // as potted immediately, so rules/turn flow are untouched.
    private _sinkGhosts: Array<{
        ballId: number;
        from: { x: number; y: number };
        to: { x: number; y: number };
        start: number;
        rollAngle: number;
        motionAngle: number;
    }> = [];

    //------Properties------//

    public get currentPlayer(): Player {
        return this._players[this._currentPlayerIndex];
    }

    public get nextPlayer(): Player {
        return this._players[(this._currentPlayerIndex + 1) % this._players.length];
    }

    public get balls(): Ball[] {
        return this._balls
    }

    public get isBallInHand(): boolean {
        return this._turnState.ballInHand;
    }

    public get isTurnValid(): boolean {
        return this._turnState.isValid;
    }

    public get isGameOver(): boolean {
        return this._referee.isGameOver(this.currentPlayer, this._cueBall, this._8Ball);
    }

    public get isBallsMoving(): boolean {
        return this._balls.some(ball => ball.moving);
    }

    public get numOfPocketedBallsOnTurn(): number {
        return this._turnState.pocketedBalls.length;
    }

    //------Constructor------//

    constructor() {
        this.initMatch();
    }

    //------Private Methods------//

    private getBallsByColor(color: Color): Ball[] {
        return this._balls.filter((ball: Ball) => ball.color === color);
    }

    private handleInput(): void {
        // Click-to-lock flow (JJ 2026-06 confirmed): the cue follows the
        // mouse until the player CLICKS THE CANVAS, which locks the cue
        // direction. Then the player adjusts power (slider or W/S) and
        // either clicks the canvas again OR clicks the React SHOOT
        // button to fire. The lock is critical because moving the mouse
        // toward the React HUD's SHOOT button (which is below the
        // iframe) would otherwise drag the cue with it and the shot
        // would fire in the wrong direction.
        //
        // Inputs:
        //   click in 'follow' → lock the cue at current rotation
        //   click in 'locked' → fire the shot + unlock for next turn
        //   ESC in 'locked' → unlock back to follow (re-aim)
        if (!AI.finishedSession) return;

        if (Keyboard.isPressed(inputConfig.toggleMenuKey) && this._stick.aimState === 'locked') {
            this._stick.unlockAim();
            return;
        }
        if (Mouse.isPressed(inputConfig.mouseShootButton)) {
            if (this._stick.aimState === 'follow') {
                this._stick.lockAim();
            } else {
                this.shootCueBall(this._stick.power, this._stick.rotation);
                this._stick.unlockAim();
            }
        }
    }

    private isBallPosOutsideTopBorder(position: Vector2): boolean {
        const topBallEdge: number = position.y - ballConfig.diameter / 2;
        return topBallEdge <= tableConfig.cushionWidth;
    }

    private isBallPosOutsideLeftBorder(position: Vector2): boolean {
        const leftBallEdge: number = position.x - ballConfig.diameter / 2;
        return leftBallEdge <= tableConfig.cushionWidth;
    }

    private isBallPosOutsideRightBorder(position: Vector2): boolean {
        const rightBallEdge: number = position.x + ballConfig.diameter / 2;
        return rightBallEdge >= gameSize.x - tableConfig.cushionWidth;
    }

    private isBallPosOutsideBottomBorder(position: Vector2): boolean {
        const bottomBallEdge: number = position.y + ballConfig.diameter / 2;
        return bottomBallEdge >= gameSize.y - tableConfig.cushionWidth;
    }

    private handleCollisionWithTopCushion(ball: Ball): void {
        ball.position = ball.position.addY(tableConfig.cushionWidth - ball.position.y + ballConfig.diameter / 2);
        ball.velocity = new Vector2(ball.velocity.x, -ball.velocity.y);
        this.applyCushionSpin(ball, 'top');
    }

    private handleCollisionWithLeftCushion(ball: Ball): void {
        ball.position = ball.position.addX(tableConfig.cushionWidth - ball.position.x + ballConfig.diameter / 2);
        ball.velocity = new Vector2(-ball.velocity.x, ball.velocity.y);
        this.applyCushionSpin(ball, 'left');
    }

    private handleCollisionWithRightCushion(ball: Ball): void {
        ball.position = ball.position.addX(gameSize.x - tableConfig.cushionWidth - ball.position.x - ballConfig.diameter / 2);
        ball.velocity = new Vector2(-ball.velocity.x, ball.velocity.y);
        this.applyCushionSpin(ball, 'right');
    }

    private handleCollisionWithBottomCushion(ball: Ball): void {
        ball.position = ball.position.addY(gameSize.y - tableConfig.cushionWidth - ball.position.y - ballConfig.diameter / 2);
        ball.velocity = new Vector2(ball.velocity.x, -ball.velocity.y);
        this.applyCushionSpin(ball, 'bottom');
    }

    /**
     * Apply the sidespin response after a standard cushion reflect.
     * Per pool/src/physics/spin.ts — pure helper handles the kick math.
     */
    private applyCushionSpin(ball: Ball, cushion: 'top'|'bottom'|'left'|'right'): void {
        const result = applySidespinToCushionBounce(cushion, { x: ball.velocity.x, y: ball.velocity.y }, ball.spinX);
        ball.velocity = new Vector2(result.velocity.x, result.velocity.y);
        ball.spinX = result.spinAfter;
    }

    private resolveBallCollisionWithCushion(ball: Ball): void {

        let collided: boolean = false;

        if(this.isBallPosOutsideTopBorder(ball.nextPosition)) {
            this.handleCollisionWithTopCushion(ball);
            collided = true;
        }
        if(this.isBallPosOutsideLeftBorder(ball.nextPosition)) {
            this.handleCollisionWithLeftCushion(ball);
            collided = true;
        }
        if(this.isBallPosOutsideRightBorder(ball.nextPosition)) {
            this.handleCollisionWithRightCushion(ball);
            collided = true;
        }
        if(this.isBallPosOutsideBottomBorder(ball.nextPosition)) {
            this.handleCollisionWithBottomCushion(ball);
            collided = true;
        }

        if(collided) {
            ball.velocity = ball.velocity.mult(1 - physicsConfig.collisionLoss);
        }
    }

    private resolveBallsCollision (first: Ball, second: Ball): boolean {

        if(!first.visible || !second.visible){
            return false;
        }

        // Find a normal vector
        const n: Vector2 = first.position.subtract(second.position);

        // Find distance
        const dist: number = n.length;

        if(dist > ballConfig.diameter){
            return false;
        }

        // Snapshot pre-collision velocities — needed for top/back spin
        // follow-through calculation (forward direction = pre-collision
        // velocity direction of the cue ball).
        const firstPre = { x: first.velocity.x, y: first.velocity.y };
        const secondPre = { x: second.velocity.x, y: second.velocity.y };

        // Find minimum translation distance
        const mtd = n.mult((ballConfig.diameter - dist) / dist);

        // Push-pull balls apart
        first.position = first.position.add(mtd.mult(0.5));
        second.position = second.position.subtract(mtd.mult(0.5));

        // Find unit normal vector
        const un = n.mult(1/n.length);

        // Find unit tangent vector
        const ut = new Vector2(-un.y, un.x);

        // Project velocities onto the unit normal and unit tangent vectors
        const v1n: number = un.dot(first.velocity);
        const v1t: number = ut.dot(first.velocity);
        const v2n: number = un.dot(second.velocity);
        const v2t: number = ut.dot(second.velocity);

        // Convert the scalar normal and tangential velocities into vectors
        const v1nTag: Vector2 = un.mult(v2n);
        const v1tTag: Vector2 = ut.mult(v1t);
        const v2nTag: Vector2 = un.mult(v1n);
        const v2tTag: Vector2 = ut.mult(v2t);

        // Update velocities
        first.velocity = v1nTag.add(v1tTag);
        second.velocity = v2nTag.add(v2tTag);

        first.velocity = first.velocity.mult(1 - physicsConfig.collisionLoss);
        second.velocity = second.velocity.mult(1 - physicsConfig.collisionLoss);

        // Apply top/back-spin to whichever ball is the cue ball.
        // Per pool's design, only the cue ball carries gameplay-relevant
        // top/back spin — object balls' spin is ignored for simplicity.
        if (first.color === Color.white && first.spinY !== 0) {
            const r = applyTopBackSpinToBallCollision(
                { x: first.velocity.x, y: first.velocity.y },
                firstPre,
                first.spinY
            );
            first.velocity = new Vector2(r.velocity.x, r.velocity.y);
            first.spinY = r.spinAfter;
        }
        if (second.color === Color.white && second.spinY !== 0) {
            const r = applyTopBackSpinToBallCollision(
                { x: second.velocity.x, y: second.velocity.y },
                secondPre,
                second.spinY
            );
            second.velocity = new Vector2(r.velocity.x, r.velocity.y);
            second.spinY = r.spinAfter;
        }

        return true;
    }

    private handleCollisions(): void {
        for(let i = 0 ; i < this._balls.length ; i++ ){ 
            
            this.resolveBallCollisionWithCushion(this._balls[i]);

            for(let j = i + 1 ; j < this._balls.length ; j++ ){
                const firstBall = this._balls[i];
                const secondBall = this._balls[j];
                const collided = this.resolveBallsCollision(firstBall, secondBall);
                
                if(collided){
                    const force: number = firstBall.velocity.length + secondBall.velocity.length
                    const volume: number = mapRange(force, 0, ballConfig.maxExpectedCollisionForce, 0, 1);
                    Assets.playSound(sounds.paths.ballsCollide, volume);

                    if(!this._turnState.firstCollidedBallColor) {
                        const color: Color = firstBall.color === Color.white ? secondBall.color : firstBall.color;
                        this._turnState.firstCollidedBallColor = color;
                    }
                }
            }
        }    
    }

    private isInsidePocket(position: Vector2): boolean {
        return tableConfig.pocketsPositions
            .some((pocketPos: Vector2) => position.distFrom(pocketPos) <= tableConfig.pocketRadius);

    }

    private resolveBallInPocket(ball: Ball): void {

        if (this.isInsidePocket(ball.position)) {
            ball.hide();
        }
    }

    private isValidPlayerColor(color: Color): boolean {
        return color === Color.red || color === Color.yellow;
    }

    private handleBallsInPockets(): void {
        // NOTE: the old radial resolveBallInPocket() call was removed —
        // the sim (stepWorld) is the single pot authority now. A second
        // hide path here bypassed the sim's pocket_drop events, which
        // the sink animation and the React HUD bridge both depend on.
        this._balls.forEach((ball: Ball) => {
            if (!ball.visible && !this._turnState.pocketedBalls.includes(ball)) {
                Assets.playSound(sounds.paths.rail, 1);
                if(!this.currentPlayer.color && this.isValidPlayerColor(ball.color)) {
                    this.currentPlayer.color = ball.color;
                    this.nextPlayer.color = ball.color === Color.yellow ? Color.red : Color.yellow;
                    // Announce group assignment to the React HUD. The
                    // internal colour enums are legacy UK-pool naming:
                    // Color.yellow is the group RENDERED as solids
                    // (ball ids 1-7), Color.red renders as stripes
                    // (ids 9-15). JJ 2026-06-10: "when the first pot is
                    // in, a message should say 'You're Stripes'".
                    const groupOf = (c: Color): 'solids' | 'stripes' =>
                        c === Color.yellow ? 'solids' : 'stripes';
                    this.postMatch({
                        kind: 'groups',
                        p0: groupOf(this._players[0].color as Color),
                        p1: groupOf(this._players[1].color as Color),
                        assignedTo: this._currentPlayerIndex
                    });
                }
                this._turnState.pocketedBalls.push(ball);
            }
        });
    }

    /**
     * Post a match-state event to the parent React MatchHUD (when the
     * iframe is wrapped with ?hud=parent). Same channel pattern as the
     * power slider's 'side-pocket-power' messages.
     */
    private postMatch(payload: Record<string, unknown>): void {
        if ((window as any).__SIDE_POCKET_PARENT_HUD && window.parent !== window) {
            try {
                window.parent.postMessage({ type: 'side-pocket-match', ...payload }, '*');
            } catch {
                /* same-origin iframe — postMessage never throws in practice */
            }
        }
    }

    private handleBallInHand(): void {

        if(Mouse.isPressed(inputConfig.mousePlaceBallButton) && this.isValidPosToPlaceCueBall(Mouse.position)) {
            this.placeBallInHand(Mouse.position);
        }
        else {
            this._stick.movable = false;
            this._stick.visible = false;
            this._cueBall.position = Mouse.position;
        }
    }

    private handleGameOver(): void {
        const winnerIdx = this._turnState.isValid
            ? this._currentPlayerIndex
            : (this._currentPlayerIndex + 1) % this._players.length;
        if (this._turnState.isValid) {
            this.currentPlayer.overallScore++;
        }
        else {
            this.nextPlayer.overallScore++;
        }
        this.postMatch({ kind: 'gameover', winner: winnerIdx });
        this.initMatch();
        // initMatch starts a fresh rack — tell the HUD to clear its
        // racks/groups (win counters persist on the React side).
        this.postMatch({ kind: 'reset' });
    }

    private nextTurn(): void {

        const foul = !this._turnState.isValid;

        if (this.isGameOver) {
            this.handleGameOver();
            return;
        }

        if(!this._cueBall.visible){
            this._cueBall.show(Vector2.copy(GameConfig.cueBallPosition));
        }

        if(foul || this._turnState.pocketedBalls.length === 0) {
            this._currentPlayerIndex++;
            this._currentPlayerIndex = this._currentPlayerIndex % this._players.length;
        }

        this._stick.show(this._cueBall.position);

        this._turnState = new State();
        this._turnState.ballInHand = foul;

        // Turn change → React HUD (avatar highlight + "Your Shot" /
        // "Opponent's Turn" + foul indicator).
        this.postMatch({ kind: 'turn', current: this._currentPlayerIndex, ballInHand: foul });

        if (this.isAITurn()) {
            AI.startSession(this);
        }
    }

    private drawCurrentPlayerLabel(): void {
        
        Canvas2D.drawText(
            labelsConfig.currentPlayer.text + (this._currentPlayerIndex + 1), 
            labelsConfig.currentPlayer.font, 
            labelsConfig.currentPlayer.color, 
            labelsConfig.currentPlayer.position, 
            labelsConfig.currentPlayer.alignment
            );
    }

    private drawMatchScores(): void {
        for(let i = 0 ; i < this._players.length ; i++){    
            for(let j = 0 ; j < this._players[i].matchScore ; j++){
                const scorePosition: Vector2 = Vector2.copy(matchScoreConfig.scoresPositions[i]).addToX(j * matchScoreConfig.unitMargin);
                const scoreSprite: HTMLImageElement = this._players[i].color === Color.red ? Assets.getSprite(sprites.paths.redScore) : Assets.getSprite(sprites.paths.yellowScore);
                Canvas2D.drawImage(scoreSprite, scorePosition);
            }
        }    
    }

    private drawOverallScores(): void {
        for(let i = 0 ; i < this._players.length ; i++){ 
            Canvas2D.drawText(
                this._players[i].overallScore.toString(), 
                labelsConfig.overalScores[i].font,
                labelsConfig.overalScores[i].color,
                labelsConfig.overalScores[i].position,
                labelsConfig.overalScores[i].alignment
                );   
        }
    }

    private isInsideTableBoundaries(position: Vector2): boolean {
        let insideTable: boolean =  !this.isInsidePocket(position);
        insideTable = insideTable && !this.isBallPosOutsideTopBorder(position);
        insideTable = insideTable && !this.isBallPosOutsideLeftBorder(position);
        insideTable = insideTable && !this.isBallPosOutsideRightBorder(position);
        insideTable = insideTable && !this.isBallPosOutsideBottomBorder(position);

        return insideTable;
    }

    private isAITurn(): boolean {
        return AI.finishedSession && aiConfig.on && this._currentPlayerIndex === aiConfig.playerIndex;
    }

    //------Public Methods------//

    public initMatch(): void {

        // Stable ball IDs per the sim's convention (see sim/types.ts):
        //   0      = cue ball
        //   1-7    = first object group (variable-name "redBalls" — Color.yellow)
        //   8      = black (the 8 ball)
        //   9-15   = second object group (variable-name "yellowBalls" — Color.red)
        // Browser ↔ server convergence depends on these IDs matching.
        const redBalls: Ball[] = GameConfig.redBallsPositions
            .map((position: Vector2, i: number) => new Ball(Vector2.copy(position), Color.yellow, 1 + i));

        const yellowBalls: Ball[] = GameConfig.yellowBallsPositions
            .map((position: Vector2, i: number) => new Ball(Vector2.copy(position), Color.red, 9 + i));

        this._8Ball = new Ball(Vector2.copy(GameConfig.eightBallPosition), Color.black, 8);

        this._cueBall = new Ball(Vector2.copy(GameConfig.cueBallPosition), Color.white, 0);

        this._stick = new Stick(Vector2.copy(GameConfig.cueBallPosition));

        this._balls = [
            ...redBalls,
            ... yellowBalls,
            this._8Ball,
            this._cueBall,
        ];

        // Build sim configs from GameConfig once — same values stepWorld
        // sees every frame from now until the next initMatch.
        this._simTable = buildSimTableConfig();
        this._simPhysics = buildSimPhysicsConfig();
        this._simTick = 0;

        this._currentPlayerIndex = 0;

        this._players.forEach((player: Player) => {
            player.matchScore = 0;
            player.color = null;
        });
        this._turnState = new State();
        this._referee = new Referee();

        if (this.isAITurn()) {
            AI.startSession(this);
        }
    }

    public isValidPosToPlaceCueBall(position: Vector2): boolean {
        let noOverlap: boolean =  this._balls.every((ball: Ball) => {
            return ball.color === Color.white || 
                   ball.position.distFrom(position) > ballConfig.diameter;
        })

        return noOverlap && this.isInsideTableBoundaries(position);
    }

    public placeBallInHand(position: Vector2): void {
        this._cueBall.position = position;
        this._turnState.ballInHand = false;
        this._stick.show(this._cueBall.position);
    }

    public concludeTurn(): void {

        this._turnState.pocketedBalls.forEach((ball: Ball) => {
            const ballIndex: number = this._balls.indexOf(ball);
            if(ball.color != Color.white) {
                this._balls.splice(ballIndex, 1);
            }
        });
        
        if(this.currentPlayer.color) {
            this.currentPlayer.matchScore = 8 - this.getBallsByColor(this.currentPlayer.color).length - this.getBallsByColor(Color.black).length;
        }

        if(this.nextPlayer.color) {
            this.nextPlayer.matchScore = 8 - this.getBallsByColor(this.nextPlayer.color).length - this.getBallsByColor(Color.black).length;
        }

        this._turnState.isValid = this._referee.isValidTurn(this.currentPlayer, this._turnState);
    }

    /**
     * Drive a shot from the parent React MatchHUD's Shoot button (when
     * the iframe is wrapped via ?hud=parent). Bypasses the click-to-aim
     * state machine entirely — the React button is the player's intent
     * to fire NOW.
     *
     * If power hasn't been set yet (slider at 0, never touched), seeds
     * it to maxPower * 0.5 so the ball actually moves. Rotation comes
     * from wherever the cue is currently pointing.
     */
    public forceShootFromHud(): void {
        if (!AI.finishedSession) return;
        if (!this._stick.visible || !this._stick.movable) return;
        let power = this._stick.power;
        if (power < 1) {
            power = Math.round(GameConfig.stick.maxPower * 0.5);
        }
        this.shootCueBall(power, this._stick.rotation);
    }

    /**
     * React MatchHUD calls this when the player drags the gold power
     * slider. pct is the slider's percentage (0..100); we map it to
     * stick power (0..stickConfig.maxPower).
     */
    public setStickPowerFromHud(pct: number): void {
        if (!this._stick.visible || !this._stick.movable) return;
        const clamped = Math.max(0, Math.min(100, pct));
        const targetPower = Math.round((clamped / 100) * GameConfig.stick.maxPower);
        this._stick.setPowerDirect(targetPower);
    }

    /**
     * React MatchHUD's spin widget — sets the cue-ball impact point.
     * x, y are in [-1, +1] each axis. Routed into SpinHud so the
     * existing spin-trigger code path picks it up at shoot time.
     */
    public setSpinFromHud(x: number, y: number): void {
        const cx = Math.max(-1, Math.min(1, x));
        const cy = Math.max(-1, Math.min(1, y));
        SpinHud.setFromExternal(cx, cy);
    }

    public shootCueBall(power: number, rotation: number, spinX?: number, spinY?: number): void {
        if(power > 0) {
            this._stick.rotation = rotation;
            this._stick.shoot();
            // Default the spin to whatever's set in the HUD when the caller doesn't
            // provide explicit values (input path from handleInput). The AI path
            // passes explicit zeros for now — see ai-trainer.ts. When the AI is
            // taught to use spin, it'll pass its own values here.
            const sx = spinX !== undefined ? spinX : SpinHud.spinX;
            const sy = spinY !== undefined ? spinY : SpinHud.spinY;
            this._cueBall.shoot(power, rotation, sx, sy);
            SpinHud.reset();
            this._stick.movable = false;
            setTimeout(() => this._stick.hide(), GameConfig.timeoutToHideStickAfterShot);
        }
    }

    public update(): void {

        if(this.isBallInHand) {
            this.handleBallInHand();
            return;
        }

        // Run the sim's tick: cushion + ball-ball + advance + pocket — all
        // identical to what the SolShot server will run for the same shot.
        // Replaces the previous trio: handleCollisions() + per-ball
        // ball.update() + the pocket-detection inside handleBallsInPockets().
        this.simulateFrame();

        // Bookkeeping for ball-pocket transitions (sound + player-color
        // assignment). The actual detection moved into the sim; this just
        // reacts to ball.visible flipping.
        this.handleBallsInPockets();

        this.handleInput();
        this._stick.update();

        if(!this.isBallsMoving && !this._stick.visible) {
            this.concludeTurn();
            this.nextTurn();
        }
    }

    /**
     * Run a single sim tick over the current ball state.
     * Mutates Balls in place via the adapter. Processes sim events for
     * audio feedback + foul detection (firstCollidedBallColor).
     */
    private simulateFrame(): void {
        if (!this._simTable || !this._simPhysics) return; // not initialised

        // Skip the sim entirely if no ball is moving — preserves the existing
        // behaviour where Ball.update() was a no-op for stopped balls.
        if (!this.isBallsMoving) return;

        // Snapshot Browser → sim
        const view: SerializableBall[] = syncBallsToSerializable(this._balls);
        const events: ShotEvent[] = [];

        stepWorld(view, this._simTable, this._simPhysics, events, this._simTick);
        this._simTick++;

        // Write sim → Browser
        syncSerializableToBalls(view, this._balls);

        // Advance per-ball visual roll angle (sim doesn't touch this —
        // _rollAngle is a Ball-only render-side field). Without this hop
        // every ball appeared stuck even while clearly moving on screen
        // (JJ 2026-06: "the balls are still not rolling"). The render
        // pass reads ball._rollAngle every frame in drawAmericanBall to
        // translate the number disc / stripe band along the motion axis.
        for (const ball of this._balls) ball.updateRollAngle();

        // React to events: sounds + foul detection (firstCollidedBallColor).
        // Pocket-side bookkeeping (color assignment, scoring) stays in
        // handleBallsInPockets() which fires immediately after this.
        for (const evt of events) {
            if (evt.type === 'ball_collision') {
                const first = this._balls.find(b => b.id === evt.ballId);
                const second = this._balls.find(b => b.id === evt.otherBallId);
                if (first && second) {
                    const force: number = first.velocity.length + second.velocity.length;
                    const volume: number = mapRange(force, 0, ballConfig.maxExpectedCollisionForce, 0, 1);
                    Assets.playSound(sounds.paths.ballsCollide, volume);

                    if (!this._turnState.firstCollidedBallColor) {
                        const color: Color = first.color === Color.white ? second.color : first.color;
                        this._turnState.firstCollidedBallColor = color;
                    }
                }
            }
            else if (evt.type === 'pocket_drop') {
                // Sink ghost + HUD pot event. By this point the adapter
                // has already hidden the Ball (visible=false), but it
                // keeps its final position/roll state — exactly what the
                // ghost needs to start from. The ghost pulls into the
                // pocket centre (we know which pocket from the event).
                const ball = this._balls.find(b => b.id === evt.ballId);
                const pocket = this._simTable && evt.pocketIdx !== undefined
                    ? this._simTable.pocketsPositions[evt.pocketIdx]
                    : null;
                if (ball && pocket) {
                    this._sinkGhosts.push({
                        ballId: ball.id,
                        from: { x: ball.position.x, y: ball.position.y },
                        to: { x: pocket.x, y: pocket.y },
                        start: performance.now(),
                        rollAngle: ball.rollAngle,
                        motionAngle: ball.motionAngle
                    });
                }
                if (evt.ballId !== undefined) {
                    this.postMatch({
                        kind: 'pot',
                        ballId: evt.ballId,
                        byPlayer: this._currentPlayerIndex
                    });
                }
            }
            // cushion_hit / cue_ball_potted / eight_ball_potted don't
            // drive client-side audio here — pocket sound is triggered
            // by handleBallsInPockets's visibility-transition check.
        }
    }

    public draw(): void {
        // Side Pocket procedural table chrome (replaces spr_background4.png).
        // See Canvas2D.drawSidePocketTable for the cherry/cobalt/diamond
        // composition lifted from the Round 2 designer's round2_canvas.jsx.
        Canvas2D.drawSidePocketTable();
        // Phase B — when the hub's MatchHUD wraps the iframe (?hud=parent),
        // skip in-canvas "PLAYER 1" / "00" labels. The React HUD owns those
        // (player cards + score racks in the top bar). index.html sets the
        // window flag based on the query string.
        if (!(window as any).__SIDE_POCKET_PARENT_HUD) {
            this.drawCurrentPlayerLabel();
            this.drawMatchScores();
            this.drawOverallScores();
        }
        // Sink ghosts — pot drop animation. Drawn UNDER live balls so a
        // ball rolling past a pocket passes over a sinking one.
        //
        // JJ 2026-06-10: the old version "vanishes into a black hole
        // rather than be seen going into a pocket." Cause: it lerped
        // position AND faded alpha in lockstep over 240ms, so the ball
        // was already half-transparent before it reached the rim — it
        // dissolved in open felt instead of dropping into the hole.
        //
        // New two-phase drop (340ms):
        //   TRAVEL (0 → 0.55): the ball rolls from the contact point to
        //     the pocket centre at FULL opacity and full size — you
        //     clearly see it head into the mouth. Ease-in (accelerates,
        //     like a ball catching the lip).
        //   FALL (0.55 → 1): now centred over the hole, it shrinks and
        //     darkens as it drops below the rim. Alpha only starts
        //     dropping here, so the disappearance reads as "fell in,"
        //     not "faded out."
        if (this._sinkGhosts.length > 0) {
            const SINK_MS = 340;
            const TRAVEL = 0.55;
            const now = performance.now();
            this._sinkGhosts = this._sinkGhosts.filter(g => now - g.start < SINK_MS);
            for (const g of this._sinkGhosts) {
                const t = (now - g.start) / SINK_MS;
                // Position: reach the pocket centre by t=TRAVEL, ease-in.
                const pt = Math.min(1, t / TRAVEL);
                const posEase = pt * pt;
                const x = g.from.x + (g.to.x - g.from.x) * posEase;
                const y = g.from.y + (g.to.y - g.from.y) * posEase;
                // Fall: shrink + fade only after the ball is over the hole.
                const ft = Math.max(0, (t - TRAVEL) / (1 - TRAVEL));  // 0..1
                const scale = 1 - 0.7 * ft;     // 1 → 0.30
                const alpha = 1 - ft * ft;       // hold near 1, fade late
                Canvas2D.drawAmericanBall(
                    { x, y },
                    g.ballId,
                    g.rollAngle,
                    { x: 0, y: 0 },
                    g.motionAngle,
                    scale,
                    alpha
                );
            }
        }
        this._balls.forEach((ball: Ball) => ball.draw());
        // Aim line + ghost ball preview — only when player is aiming
        // (stick visible, not after the shot). JJ 2026-06: "still no
        // visible white guide line" — Miniclip-style dotted projection
        // from cue ball through the contact point with the first ball
        // or cushion the cue will hit.
        if (this._stick.visible && this._stick.movable && !this.isBallsMoving) {
            this.drawAimLine();
        }
        this._stick.draw();
    }

    /**
     * Draw a dotted aim guide from the cue ball in the direction of the
     * cue rotation, with a ghost-ball circle at the predicted contact
     * point with the first object ball OR cushion ray-hit.
     *
     * Algorithm:
     *   1. Cast a ray from cue-ball position in the cue rotation direction.
     *   2. Find nearest hit:
     *      - Object balls: closest sphere-ray intersection (centre at
     *        offset_along_ray = (closest_point_on_ray - ball.pos) · dir,
     *        perp_distance² = |ball.pos - closest_point|²; hit if
     *        perp_distance < ball_diameter and offset > 0)
     *      - Cushions: where the ray hits the play-surface boundary
     *        (cushionWidth from each canvas edge)
     *   3. Draw dotted line from cue ball to hit point.
     *   4. Draw ghost ball circle at hit point (offset back along the
     *      ray by ball-radius so it sits where the cue ball WOULD stop).
     */
    private drawAimLine(): void {
        const cuePos = this._cueBall.position;
        const angle = this._stick.rotation;
        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);
        const ballR = ballConfig.diameter / 2;

        // Find the nearest object-ball intersection — and KEEP the ball,
        // so we can draw the contact tangent (where the object ball goes
        // after the cue strikes it). JJ 2026-06-10: "line from cue to
        // ball, then a small line from centre of ball to show where it
        // goes after." Standard Miniclip aim assist.
        let hitDist = Infinity;
        let hitBall: Ball | null = null;
        for (const b of this._balls) {
            if (b === this._cueBall || !b.visible) continue;
            const dx = b.position.x - cuePos.x;
            const dy = b.position.y - cuePos.y;
            const t = dx * dirX + dy * dirY;
            if (t < 0) continue;  // behind the cue
            const perpSq = (dx * dx + dy * dy) - t * t;
            const sumR = ballConfig.diameter;  // cue radius + object radius
            if (perpSq > sumR * sumR) continue;
            // Distance along the ray to the cue-ball CENTRE at contact
            // (the "ghost ball" position — centres exactly one diameter
            // apart).
            const back = Math.sqrt(sumR * sumR - perpSq);
            const tHit = t - back;
            if (tHit < hitDist) { hitDist = tHit; hitBall = b; }
        }

        // Find cushion intersection — distance along ray until we hit a
        // playable-boundary edge (cushion width inset from each side).
        // Tracks WHICH rail wins so we can check for pocket mouths.
        const cw = tableConfig.cushionWidth;
        const cushionHits: Array<{ d: number; rail: 'top'|'bottom'|'left'|'right' }> = [];
        if (dirX > 0.001) cushionHits.push({ d: (gameSize.x - cw - ballR - cuePos.x) / dirX, rail: 'right' });
        if (dirX < -0.001) cushionHits.push({ d: (cw + ballR - cuePos.x) / dirX, rail: 'left' });
        if (dirY > 0.001) cushionHits.push({ d: (gameSize.y - cw - ballR - cuePos.y) / dirY, rail: 'bottom' });
        if (dirY < -0.001) cushionHits.push({ d: (cw + ballR - cuePos.y) / dirY, rail: 'top' });
        let railHit: { d: number; rail: 'top'|'bottom'|'left'|'right' } | null = null;
        for (const h of cushionHits) {
            if (h.d > 0 && h.d < hitDist) { hitDist = h.d; railHit = h; hitBall = null; }
        }

        if (!isFinite(hitDist)) hitDist = 1000;

        // Ghost-ball position — where the cue ball's centre sits at the
        // moment of contact (object-ball hit) or where it stops (rail).
        let endX = cuePos.x + dirX * hitDist;
        let endY = cuePos.y + dirY * hitDist;

        // CASE A — the cue hits an object ball: draw cue→ghost + ghost
        // circle + the object-ball TANGENT. A struck ball departs along
        // the line of centres (ghost-ball centre → object-ball centre).
        if (hitBall) {
            const ox = hitBall.position.x;
            const oy = hitBall.position.y;
            let tdx = ox - endX;
            let tdy = oy - endY;
            const tlen = Math.hypot(tdx, tdy) || 1;
            tdx /= tlen; tdy /= tlen;
            Canvas2D.drawAimGuide(cuePos.x, cuePos.y, endX, endY, ballR, {
                objX: ox,
                objY: oy,
                dirX: tdx,
                dirY: tdy,
            });
            return;
        }

        // CASE B — the cue runs to a rail/pocket. Pocket-mouth awareness:
        // if the crossing point is inside a mouth, the ball sails in —
        // point the guide at the pocket centre instead of a phantom rail.
        if (railHit && this._simTable) {
            const lateral = (railHit.rail === 'top' || railHit.rail === 'bottom') ? endX : endY;
            const m = mouthAt(railHit.rail, lateral, this._simTable);
            if (m) {
                const p = this._simTable.pocketsPositions[m.pocketIdx];
                endX = p.x;
                endY = p.y;
            }
        }
        Canvas2D.drawAimGuide(cuePos.x, cuePos.y, endX, endY, ballR);
    }
}