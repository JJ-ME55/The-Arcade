import {
    BALL_RELEASE_HEIGHT_M, BALL_RELEASE_FORWARD_M, BALL_RELEASE_LATERAL_M,
    RIM_X_BASE_M, RIM_HEIGHT_M, RIM_FORWARD_M,
    RIM_INNER_RADIUS_M, RIM_TUBE_RADIUS_M,
    BACKBOARD_X_BASE_M, BACKBOARD_Z_M, BACKBOARD_HALF_WIDTH_M,
    BACKBOARD_TOP_Y_M, BACKBOARD_BOTTOM_Y_M,
    SHOOTER_SQUARE_HALF_WIDTH_M, SHOOTER_SQUARE_BOTTOM_Y_M, SHOOTER_SQUARE_TOP_Y_M,
    BALL_RADIUS_M,
    GRAVITY_M_S2, PHYSICS_DT, MAX_TRAJECTORY_STEPS,
    VELOCITY_SCALE_M_S, VELOCITY_BASELINE_M_S, SHOT_ELEVATION_RAD,
    MIN_ANGLE_RAD, MAX_ANGLE_RAD, MIN_POWER, MAX_POWER,
    MIN_ELEVATION_RAD, MAX_ELEVATION_RAD,
    RIM_BOUNCE_FACTOR, RIM_TANGENT_FRICTION_MU,
    BACKBOARD_BOUNCE_FACTOR, BACKBOARD_TANGENT_FRICTION_MU,
    AIR_DRAG_PER_STEP,
    INITIAL_BACKSPIN_HZ, BALL_MOI_FACTOR,
    FLOOR_Y_M,
} from './constants.js';
import { backboardOffsetX, backboardOffsetAtPhase, frequencyForShot } from './backboard.js';

/**
 * Basketball Hoops — server-side 3D physics + collision (v0.4)
 *
 * Simulates a single free-throw shot in 3D space.
 *  - input:   { angle, power } from the client (touch flick on mobile,
 *             mouse arrow on desktop — same encoding).
 *  - process: 3D parabolic trajectory under gravity, collision against
 *             the rim ring (treated as a circular tube — a torus),
 *             the backboard (vertical rect perpendicular to z), and
 *             the floor. Multi-bounce: after a collision the ball
 *             keeps simulating, so backboard → rim → out flows happen
 *             naturally.
 *  - output:  { result, trajectory, hitBackboard, hitRim }
 *
 * Coordinate system (right-handed):
 *   x = lateral (player's right = +x)
 *   y = height (up = +y)
 *   z = depth (toward hoop = +z)
 *
 * Result is one of:
 *   'swish'    — ball passed through rim ring with no metal contact
 *   'rim_in'   — touched rim metal but went through
 *   'bank_in'  — bounced off backboard then went through rim
 *   'rim_out'  — touched rim metal but didn't go through
 *   'bank_out' — bounced off backboard but didn't go through rim
 *   'short'    — ball never reached the rim (fell in front)
 *   'long'     — ball flew past the backboard entirely
 *   'wide'     — ball missed the rim/backboard laterally
 *   'invalid'  — input failed validation
 *
 * Determinism: same inputs always produce the same outputs — the
 * integrity invariant for fair wagered matches.
 */

export function validateShotInput({ angle, power, elevation }) {
    if (typeof angle !== 'number' || !Number.isFinite(angle)) return 'angle_invalid';
    if (typeof power !== 'number' || !Number.isFinite(power)) return 'power_invalid';
    if (angle < MIN_ANGLE_RAD || angle > MAX_ANGLE_RAD) return 'angle_out_of_range';
    if (power < MIN_POWER || power > MAX_POWER) return 'power_out_of_range';
    // Elevation is optional — when omitted, simulateShot uses the
    // SHOT_ELEVATION_RAD default for backward compatibility.
    if (elevation !== undefined && elevation !== null) {
        if (typeof elevation !== 'number' || !Number.isFinite(elevation)) return 'elevation_invalid';
        if (elevation < MIN_ELEVATION_RAD || elevation > MAX_ELEVATION_RAD) return 'elevation_out_of_range';
    }
    return null;
}

/**
 * Simulate one shot. Pure — same inputs always produce identical output.
 *
 * @param {object} params
 * @param {number} params.angle - lateral aim radians (positive = player's right)
 * @param {number} params.power - normalized [0, 1]
 * @param {number} params.attemptSeed - drives backboard motion
 * @param {number} params.shotIndex - 0-indexed shot within attempt
 * @returns {{
 *   result: string,
 *   trajectory: Array<{x:number,y:number,z:number,vx:number,vy:number,vz:number}>,
 *   hitBackboard: boolean,
 *   hitRim: boolean,
 *   reason?: string,
 * }}
 */
export function simulateShot({ angle, power, elevation, attemptSeed, shotIndex, shotStartT = 0, motionStartT = 0, rimPhaseAtShotStart = null }) {
    const validationError = validateShotInput({ angle, power, elevation });
    if (validationError) {
        return { result: 'invalid', reason: validationError, trajectory: [], hitBackboard: false, hitRim: false };
    }

    // Initial velocity decomposed by elevation + lateral aim. When the
    // payload omits `elevation`, fall back to SHOT_ELEVATION_RAD (55°)
    // so older clients continue to work.
    const elev = (elevation === undefined || elevation === null) ? SHOT_ELEVATION_RAD : elevation;
    // Baseline+linear power-to-velocity. See constants.js for the
    // 5-band tuning rationale.
    const powerNorm = (power - MIN_POWER) / (MAX_POWER - MIN_POWER);
    const v = VELOCITY_BASELINE_M_S + powerNorm * (VELOCITY_SCALE_M_S - VELOCITY_BASELINE_M_S);
    const vyInit = v * Math.sin(elev);
    const vHoriz = v * Math.cos(elev);
    let vx = vHoriz * Math.sin(angle);     // lateral
    let vy = vyInit;                        // up
    let vz = vHoriz * Math.cos(angle);     // forward

    // Initial backspin. Spin axis is horizontal and perpendicular to
    // the ball's flight direction (computed as up × v_horiz, sign
    // flipped so the top of the ball moves against the direction of
    // travel). Magnitude = 2π · INITIAL_BACKSPIN_HZ. With zero
    // horizontal velocity (pure-vertical shot, degenerate edge case)
    // we leave the ball un-spun rather than picking an arbitrary axis.
    const omegaMag = 2 * Math.PI * INITIAL_BACKSPIN_HZ;
    const vh0 = Math.sqrt(vx * vx + vz * vz);
    let ox = vh0 > 1e-6 ? -omegaMag * (vz / vh0) : 0;
    let oy = 0;
    let oz = vh0 > 1e-6 ?  omegaMag * (vx / vh0) : 0;

    let x = BALL_RELEASE_LATERAL_M;
    let y = BALL_RELEASE_HEIGHT_M;
    let z = BALL_RELEASE_FORWARD_M;

    const trajectory = [{ x: r3(x), y: r3(y), z: r3(z), vx: r3(vx), vy: r3(vy), vz: r3(vz) }];
    // Events captured during simulation so the client can fire sound
    // effects + net animation at the right moment during playback.
    const events = [];

    let hitBackboard = false;
    let hitRim = false;
    let scored = false;
    // True when the ball's centre crossed the rim plane within the
    // cleanZone — drives the swish-vs-rim_in classification at the
    // end. A clean cross counts as a swish even if the ball grazed
    // the rim earlier in its arc; otherwise it's a rim_in.
    let cleanCross = false;
    let backboardActive = false;  // set true after ball passes z=rim_z so we don't trigger on shots that haven't reached the rim yet

    // Per-shot rim frequency (rad/sec). Constant within the shot —
    // shotIndex doesn't change during simulation. The caller-provided
    // rimPhaseAtShotStart is the cumulative phase at the moment the
    // shot was launched; physics increments forward from there.
    const shotFreqHz = frequencyForShot(shotIndex);
    const phaseRatePerStep = 2 * Math.PI * shotFreqHz * PHYSICS_DT;

    for (let step = 1; step <= MAX_TRAJECTORY_STEPS; step++) {
        const t = step * PHYSICS_DT;

        // Rim+backboard x-offset. When the caller passed an explicit
        // phase, use the phase-based path (preserves continuity across
        // tier boundaries). Otherwise fall back to the legacy single-
        // frequency `motionT` path so existing tests keep working.
        let rigOffset;
        if (rimPhaseAtShotStart !== null) {
            const phase = rimPhaseAtShotStart + step * phaseRatePerStep;
            rigOffset = backboardOffsetAtPhase(shotIndex, phase);
        } else {
            const motionT = (shotStartT - motionStartT) + t;
            rigOffset = backboardOffsetX(attemptSeed, shotIndex, motionT);
        }
        const rimX = RIM_X_BASE_M + rigOffset;
        const bbX = BACKBOARD_X_BASE_M + rigOffset;

        // Euler step
        const prevX = x;
        const prevY = y;
        const prevZ = z;
        vy -= GRAVITY_M_S2 * PHYSICS_DT;
        x += vx * PHYSICS_DT;
        y += vy * PHYSICS_DT;
        z += vz * PHYSICS_DT;

        // --- Ball-rim torus collision (treat rim as a circular tube) ---
        // 1. Find the nearest point on the rim ring (a circle in the
        //    plane y=rim_y, centred at (rimX, rim_y, rim_z), radius
        //    RIM_INNER_RADIUS_M).
        // 2. The tube of the torus has radius RIM_TUBE_RADIUS_M around
        //    that ring. Ball collides if dist(ball, nearest_ring_point)
        //    < BALL_RADIUS_M + RIM_TUBE_RADIUS_M.
        const dx = x - rimX;
        const dz = z - RIM_FORWARD_M;
        const horizDist = Math.sqrt(dx * dx + dz * dz);
        if (horizDist > 1e-6) {
            const ringPx = rimX + (RIM_INNER_RADIUS_M * dx / horizDist);
            const ringPz = RIM_FORWARD_M + (RIM_INNER_RADIUS_M * dz / horizDist);
            const ringPy = RIM_HEIGHT_M;
            const ddx = x - ringPx;
            const ddy = y - ringPy;
            const ddz = z - ringPz;
            const distSq = ddx * ddx + ddy * ddy + ddz * ddz;
            const minDist = BALL_RADIUS_M + RIM_TUBE_RADIUS_M;
            if (distSq < minDist * minDist) {
                const dist = Math.sqrt(distSq) || 1e-6;
                const nx = ddx / dist;
                const ny = ddy / dist;
                const nz = ddz / dist;
                // Spin-coupled rim contact. The contact point on the
                // ball is on its surface facing the ring point:
                //   r_c = -BALL_RADIUS · n  (relative to ball centre)
                // The velocity AT the contact point combines linear
                // and rotational components:
                //   v_c = v + ω × r_c
                // Friction opposes the *tangential* component of v_c
                // (not just v) — this is the slip-vs-grip distinction
                // Okubo & Hubbard 2006 captures formally. A backspin-
                // ning ball has a v_c with reduced tangential speed,
                // so it grips the rim instead of sliding (the real-
                // basketball "shooter's roll"). See Gemini verdict
                // §1; PHYSICS_RESEARCH.md §3.1 (basketball physics).
                const rcX = -BALL_RADIUS_M * nx;
                const rcY = -BALL_RADIUS_M * ny;
                const rcZ = -BALL_RADIUS_M * nz;
                // v_spin = ω × r_c
                const spinVx = oy * rcZ - oz * rcY;
                const spinVy = oz * rcX - ox * rcZ;
                const spinVz = ox * rcY - oy * rcX;
                // Contact-point velocity
                const vcx = vx + spinVx;
                const vcy = vy + spinVy;
                const vcz = vz + spinVz;

                // Normal component uses LINEAR v (ω × r is ⊥ to n,
                // so it contributes nothing along n).
                const dot = vx * nx + vy * ny + vz * nz;
                // Tangential component of CONTACT-POINT velocity
                const vtx = vcx - dot * nx;
                const vty = vcy - dot * ny;
                const vtz = vcz - dot * nz;
                const vtMag = Math.sqrt(vtx * vtx + vty * vty + vtz * vtz);

                // Normal reflection (damped restitution)
                const newVnx = -RIM_BOUNCE_FACTOR * dot * nx;
                const newVny = -RIM_BOUNCE_FACTOR * dot * ny;
                const newVnz = -RIM_BOUNCE_FACTOR * dot * nz;

                // Coulomb friction impulse magnitude: μ · |J_n|
                // where |J_n| = (1 + e) · |v_n| for unit mass.
                const frictionImpulseMag = Math.min(
                    vtMag,
                    RIM_TANGENT_FRICTION_MU * Math.abs(dot) * (1 + RIM_BOUNCE_FACTOR),
                );
                // Friction impulse vector (opposes tangential motion)
                let Jfx = 0, Jfy = 0, Jfz = 0;
                if (vtMag > 1e-9) {
                    const k = -frictionImpulseMag / vtMag;
                    Jfx = vtx * k;
                    Jfy = vty * k;
                    Jfz = vtz * k;
                }
                // Apply linear: tangential preserved minus friction,
                // normal reflected.
                vx = (vx - dot * nx) + newVnx + Jfx;
                vy = (vy - dot * ny) + newVny + Jfy;
                vz = (vz - dot * nz) + newVnz + Jfz;

                // Apply angular impulse on ball:
                //   Δω = (r_c × J_f) / I, where I = MOI · r² (unit mass)
                // Backspin + glancing rim contact → friction torque
                // typically increases backspin further (the "grip"),
                // which then feeds back into the next rim contact.
                const Iinv = 1 / (BALL_MOI_FACTOR * BALL_RADIUS_M * BALL_RADIUS_M);
                ox += (rcY * Jfz - rcZ * Jfy) * Iinv;
                oy += (rcZ * Jfx - rcX * Jfz) * Iinv;
                oz += (rcX * Jfy - rcY * Jfx) * Iinv;
                // Push the ball out so it doesn't re-collide next step.
                x = ringPx + nx * (minDist + 0.001);
                y = ringPy + ny * (minDist + 0.001);
                z = ringPz + nz * (minDist + 0.001);
                hitRim = true;
                events.push({ step, type: 'rim' });
            }
        }

        // --- Ball-backboard front-face collision (swept + spin-coupled) ---
        // The backboard is a vertical wall at z = BACKBOARD_Z_M, facing
        // the player (front face = -z direction). We only collide on the
        // FRONT face — a ball that flew over the top doesn't get sent
        // back from behind.
        //
        // Rebuilt to mirror the rim contact: swept detection against the
        // ball-centre contact plane (fast banks no longer tunnel through
        // the board), normal/tangential decomposition using the
        // contact-point velocity (v + ω×r), Coulomb friction across the
        // full x-y tangent plane, and an angular-impulse update.
        // Supersedes the old `vz = -|vz|·BOUNCE` + vx-only damping. The
        // "vy unchanged" caveat in PHYSICS_RESEARCH.md §5 Rec 3 / §6 Q3
        // applied to the pre-spin model — a spin-coupled impulse
        // necessarily resolves across the whole tangent plane, which is
        // what gives banks a correct deflection angle instead of the old
        // "every bank looks identical" behaviour.
        const bbContactZ = BACKBOARD_Z_M - BALL_RADIUS_M;
        if (vz > 0 && prevZ < bbContactZ && z >= bbContactZ) {
            // Ball centre crossed the front-face contact plane this
            // step. Interpolate the crossing so the in-bounds test and
            // the repositioning are tunnelling-proof.
            const span = z - prevZ;
            const tCross = span > 1e-9 ? (bbContactZ - prevZ) / span : 0;
            const hitX = prevX + (x - prevX) * tCross;
            const hitY = prevY + (y - prevY) * tCross;
            // STRICT bounds — ball CENTRE must be inside the board.
            // The previous +BALL_RADIUS_M margin was physically motivated
            // (ball edge grazes the board edge → corner contact) but
            // the visual result was misses-that-look-over still
            // bouncing back. Fish's call: balls that visually clear
            // the board fly past. Edge-graze realism trades against
            // miss readability; readability wins here.
            const inX = Math.abs(hitX - bbX) <= BACKBOARD_HALF_WIDTH_M;
            const inY = hitY >= BACKBOARD_BOTTOM_Y_M && hitY <= BACKBOARD_TOP_Y_M;
            if (inX && inY) {
                // Front-face outward normal points back toward the
                // player; the contact point is on the ball's +z side.
                const nx = 0, ny = 0, nz = -1;
                const rcX = -BALL_RADIUS_M * nx;
                const rcY = -BALL_RADIUS_M * ny;
                const rcZ = -BALL_RADIUS_M * nz;
                const spinVx = oy * rcZ - oz * rcY;
                const spinVy = oz * rcX - ox * rcZ;
                const spinVz = ox * rcY - oy * rcX;
                const vcx = vx + spinVx;
                const vcy = vy + spinVy;
                const vcz = vz + spinVz;

                const dot = vx * nx + vy * ny + vz * nz;
                const vtx = vcx - dot * nx;
                const vty = vcy - dot * ny;
                const vtz = vcz - dot * nz;
                const vtMag = Math.sqrt(vtx * vtx + vty * vty + vtz * vtz);

                const newVnx = -BACKBOARD_BOUNCE_FACTOR * dot * nx;
                const newVny = -BACKBOARD_BOUNCE_FACTOR * dot * ny;
                const newVnz = -BACKBOARD_BOUNCE_FACTOR * dot * nz;

                const frictionImpulseMag = Math.min(
                    vtMag,
                    BACKBOARD_TANGENT_FRICTION_MU * Math.abs(dot) * (1 + BACKBOARD_BOUNCE_FACTOR),
                );
                let Jfx = 0, Jfy = 0, Jfz = 0;
                if (vtMag > 1e-9) {
                    const k = -frictionImpulseMag / vtMag;
                    Jfx = vtx * k;
                    Jfy = vty * k;
                    Jfz = vtz * k;
                }
                // PHYSICS_RESEARCH.md §5 Rec 3 / §6 Q3: leave vy
                // UNCHANGED by backboard friction. The earlier spin-
                // coupled rebuild applied friction to the full tangent
                // plane, which killed the descent gravity needs to drop
                // bank shots into the rim — centred banks in the lower
                // 75% of the board should drop, and don't unless vy
                // passes through. Restoring the research-recommended
                // behaviour for the backboard. (Rim still uses the
                // full spin-coupled impulse — different surface, real
                // basketballs DO grip the rim much more than glass.)
                Jfy = 0;
                vx = (vx - dot * nx) + newVnx + Jfx;
                vy = (vy - dot * ny) + newVny + Jfy;
                vz = (vz - dot * nz) + newVnz + Jfz;

                const Iinv = 1 / (BALL_MOI_FACTOR * BALL_RADIUS_M * BALL_RADIUS_M);
                ox += (rcY * Jfz - rcZ * Jfy) * Iinv;
                oy += (rcZ * Jfx - rcX * Jfz) * Iinv;
                oz += (rcX * Jfy - rcY * Jfx) * Iinv;

                // Snap to the contact point — undoes any single-step
                // tunnelling past the board face.
                x = hitX;
                y = hitY;
                z = bbContactZ - 0.001;
                if (!hitBackboard) events.push({ step, type: 'backboard' });
                hitBackboard = true;

                // Shooter's-square auto-guide. A board hit INSIDE the
                // painted red rectangle overrides the post-bounce
                // velocity to free-fall from the hit point into the
                // rim centre — the iconic "bank off the square"
                // almost-always-goes-in shot. Skill stays in HITTING
                // the rectangle; reward is reliability.
                if (hitY > SHOOTER_SQUARE_BOTTOM_Y_M
                    && hitY < SHOOTER_SQUARE_TOP_Y_M
                    && Math.abs(hitX - bbX) < SHOOTER_SQUARE_HALF_WIDTH_M
                    && hitY > RIM_HEIGHT_M + 0.05) {
                    // Free-fall time from hit Y to rim height — gives
                    // a natural gravity-driven drop with vy = 0 at the
                    // board. The lateral + depth velocities carry the
                    // ball over to the rim in the same time T.
                    const dropDist = hitY - RIM_HEIGHT_M;
                    const T = Math.sqrt(2 * dropDist / GRAVITY_M_S2);
                    if (T > 1e-3) {
                        vx = (rimX - hitX) / T;
                        vy = 0;
                        vz = (RIM_FORWARD_M - z) / T;
                        ox = 0; oy = 0; oz = 0;
                    }
                }
            }
        }

        // --- Score detection ---
        // Ball passed downward through y=rim_y. Check if its horizontal
        // position at that moment was inside the rim ring (allowing
        // for ball radius). v0.5: scoring tolerance widened so that
        // "close enough" descents through the rim plane count, even
        // if the ball grazed the rim or banked off the backboard.
        if (!scored && prevY > RIM_HEIGHT_M && y <= RIM_HEIGHT_M && vy < 0) {
            const t01 = (prevY - RIM_HEIGHT_M) / (prevY - y || 1e-9);
            const crossX = (x - vx * PHYSICS_DT) + (vx * PHYSICS_DT) * t01;
            const crossZ = prevZ + (z - prevZ) * t01;
            const crossDx = crossX - rimX;
            const crossDz = crossZ - RIM_FORWARD_M;
            const crossHoriz = Math.sqrt(crossDx * crossDx + crossDz * crossDz);
            // Clean-pass zone (arcade-friendly, widened for Fish's
            // 5-band feel spec). Set to rim_radius + ball_radius/2 so
            // a descending ball whose CENTRE crosses anywhere within
            // half-a-ball-width past the rim ring still reads as a
            // swish. Anything between this and outerZone is still
            // classified as rim_in. Widened from the strict
            // RIM_INNER_RADIUS_M after playtest showed scored shots
            // were almost all classifying as rim_in rather than swish.
            const cleanZone = RIM_INNER_RADIUS_M + BALL_RADIUS_M * 0.5;
            // Outer tolerance: ball center must be within rim_r +
            // 1.3·ball_r of rim centre at the crossing AND have made
            // rim/backboard contact for the rattle to drop. Hard
            // physical bound is rim_r + ball_r = 0.35 m; 1.3 leaves
            // a small arcade fudge for "kissed the edge and rolled in".
            const outerZone = RIM_INNER_RADIUS_M + BALL_RADIUS_M * 1.3;
            // Latch cleanCross on ANY descending cross within cleanZone
            // — not just the first one that scored. After a rim-graze
            // collision, the ball can get deflected outside the rim
            // ring on its first descent (registering rim_in), then
            // settle centrally on a later descent. Players read that
            // as a swish, so the classification should too.
            const isClean = crossHoriz <= cleanZone;
            if (isClean) cleanCross = true;
            if (!scored && crossHoriz <= outerZone) {
                const willScore = isClean || hitRim || hitBackboard;
                if (willScore) {
                    events.push({ step, type: 'score' });
                }
                scored = willScore;
            }
        }

        // --- Air drag ---
        // Per-step multiplicative damping on all velocity components.
        // Subtle (~7%/s) but adds realism to the apex of the shot and
        // matches the linearDamping convention of engine-backed
        // basketball games. See PHYSICS_RESEARCH.md §5 Rec 4. Angular
        // velocity decays at the same rate — physically slightly
        // slower than linear drag, but the difference is invisible at
        // the timescales of a free throw.
        vx *= AIR_DRAG_PER_STEP;
        vy *= AIR_DRAG_PER_STEP;
        vz *= AIR_DRAG_PER_STEP;
        ox *= AIR_DRAG_PER_STEP;
        oy *= AIR_DRAG_PER_STEP;
        oz *= AIR_DRAG_PER_STEP;

        // --- Termination conditions ---
        // Floor-touch terminates first. The z/x cuts below catch
        // way-off shots so they don't simulate for 3+ s (which
        // emptied the strict 4-ball rack and felt like "can't flick").
        // Thresholds are MUCH looser than the old z>BACKBOARD_Z_M+1.0
        // / |x-rimX|>2.0 cuts: the ball still visibly travels past the
        // cage wall before terminating; we just don't simulate all the
        // way to the floor 7-8 m back.
        if (y <= FLOOR_Y_M + BALL_RADIUS_M) {
            trajectory.push({ x: r3(x), y: r3(y), z: r3(z), vx: r3(vx), vy: r3(vy), vz: r3(vz) });
            return classifyOutcome({ scored, hitBackboard, hitRim, cleanCross, x, y, z, rimX, trajectory, events });
        }
        if (z > BACKBOARD_Z_M + 2.5) {
            trajectory.push({ x: r3(x), y: r3(y), z: r3(z), vx: r3(vx), vy: r3(vy), vz: r3(vz) });
            return classifyOutcome({ scored, hitBackboard, hitRim, cleanCross, x, y, z, rimX, trajectory, events });
        }
        if (Math.abs(x - rimX) > 3.0) {
            trajectory.push({ x: r3(x), y: r3(y), z: r3(z), vx: r3(vx), vy: r3(vy), vz: r3(vz) });
            return classifyOutcome({ scored, hitBackboard, hitRim, cleanCross, x, y, z, rimX, trajectory, events });
        }

        trajectory.push({ x: r3(x), y: r3(y), z: r3(z), vx: r3(vx), vy: r3(vy), vz: r3(vz) });
    }

    // Step cap reached without explicit termination
    return classifyOutcome({ scored, hitBackboard, hitRim, cleanCross, x, y, z, rimX: RIM_X_BASE_M, trajectory, events });
}

/**
 * Classify the shot outcome given final state + collision flags.
 */
function classifyOutcome({ scored, hitBackboard, hitRim, cleanCross, x, y, z, rimX, trajectory, events }) {
    if (scored) {
        let result;
        if (hitBackboard) result = 'bank_in';
        else if (cleanCross) result = 'swish';
        else result = 'rim_in';
        return { result, trajectory, hitBackboard, hitRim, events };
    }
    // Missed — categorize the way it missed
    if (hitBackboard && !scored) {
        return { result: 'bank_out', trajectory, hitBackboard, hitRim, events };
    }
    if (hitRim && !scored) {
        return { result: 'rim_out', trajectory, hitBackboard, hitRim, events };
    }
    // No rim or backboard contact at all
    if (z < RIM_FORWARD_M - RIM_INNER_RADIUS_M) {
        return { result: 'short', trajectory, hitBackboard, hitRim, events };
    }
    if (z > BACKBOARD_Z_M) {
        return { result: 'long', trajectory, hitBackboard, hitRim, events };
    }
    if (Math.abs(x - rimX) > RIM_INNER_RADIUS_M) {
        return { result: 'wide', trajectory, hitBackboard, hitRim, events };
    }
    return { result: 'wide', trajectory, hitBackboard, hitRim, events };
}

function r3(v) { return Math.round(v * 1000) / 1000; }
