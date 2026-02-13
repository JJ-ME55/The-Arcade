# Phase 1 Context: Movement Engine

## Test Environment

- **Orange/yellow dev-texture block arena** — flat solid-color surfaces matching the aim_ag_texture2 visual language
- Layout: flat ground plane, ramps at various angles, elevated platforms at different heights, a long straight corridor
- Purpose-built for validating every movement mechanic: running, jumping, crouching, counter-strafing, bunny hop chains, air strafe curves
- Gets replaced by the real aim_ag_texture2 map in Phase 2, but should visually feel consistent with the final game's aesthetic

## Determinism Strategy

- **Standard floating-point math** — no fixed-point arithmetic
- Handle any cross-browser desync pragmatically in Phase 7 (multiplayer) via periodic state corrections/snapping
- Rationale: keeps physics code clean and readable, avoids over-engineering for a 2-4 player game where correction mechanisms are sufficient

## Input Pipeline

### Key Bindings (Default)

| Action | Default Binding |
|--------|----------------|
| Move forward | W |
| Move backward | S |
| Move left | A |
| Move right | D |
| Jump | Spacebar |
| Crouch | Ctrl |
| Walk (slow/quiet) | Shift |
| Reload | R |
| Rifle (direct select) | 1 |
| Pistol (direct select) | 2 |
| Knife (direct select) | 3 |
| Cycle weapons | Scroll wheel |
| Shoot | Left mouse button |
| Aim down sights (ADS) | Right mouse button |

### Input Decisions

- **Jump is spacebar only** — no scroll-wheel jump binding. Scroll wheel is reserved for weapon cycling.
- **Scroll wheel cycles weapons**: rifle → pistol → knife → rifle (scroll down), reverse on scroll up
- **Mouse sensitivity slider from day 1** — competitive players need precise control over their aim sensitivity
- **Full key rebinding settings menu in Phase 1** — players can customize every binding. Build the settings UI and persistence (localStorage) as part of the engine phase.
- **Input system architecture**: event-driven capture (keydown/keyup/mousemove/wheel) feeding into a polled state map read by the game loop each tick. Raw `movementX`/`movementY` from pointer lock for mouse input — no smoothing or acceleration applied on top.

## Crosshair Customization

- Customizable from Phase 1: size, thickness, color, gap
- Players should be able to make it as small as they want (the tiny crosshair meta from CS:S)
- Settings persisted to localStorage alongside key bindings and sensitivity

## Movement Validation

### Debug Overlay

- Toggled with a key (e.g. F3 or backtick)
- Shows real-time: velocity (total + per-axis), position, acceleration, ground/air state, tick rate, FPS
- Similar to CS:S `cl_showpos 1` — enables objective comparison against known CS:S reference values

### Reference Values for Validation

| Mechanic | Expected Behavior |
|----------|-------------------|
| Ground run speed (knife) | ~250 u/s |
| Ground run speed (rifle) | ~215 u/s |
| Counter-strafe to zero | Within 1-2 ticks (~15-30ms) |
| Bhop speed gain | Measurable increase per chained hop with air strafe |
| Air strafe turn | Visible trajectory curve when strafe key + mouse sync |
| Crouch height reduction | ~45% shorter hitbox |
| Friction feel | Fluid, not sticky (friction 4.0, not 4.8) |

### Validation Method

- **Primary tester: the project owner** — has CS:S experience, can feel-check movement authenticity
- Debug overlay provides objective numbers to compare against CS:S reference values
- Iterative tuning: play → adjust → play until it feels right

## Deferred Ideas

- (none captured during discussion)

---
*Created: 2026-02-13*
