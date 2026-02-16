# Phase 4: Weapons & Combat — Context

## Weapon Feel & Timing

### Two Rifles: AK-47 and M4A1
- **AK-47**: 600 RPM (0.1s cycle), 36 body damage, 143 headshot (1-tap kill through helmet), harder recoil
- **M4A1**: 667 RPM (0.09s cycle), 32 body damage, 92 headshot (2-tap kill through helmet), easier recoil
- Player chooses rifle during freeze time (quick selection menu). Both teams can use either weapon.
- Both rifles: 30/90 magazine/reserve ammo

### Pistol (Glock-style)
- 20 round magazine, 120 reserve
- Faster fire rate than rifles, better moving accuracy
- ~2 headshots to kill (per COMBAT-04)

### Knife
- Left click ~40 damage, right-click backstab instant kill (per COMBAT-05)
- Fastest movement speed

### Weapon Switching
- Key bindings: 1 = Primary (rifle), 2 = Secondary (pistol), 3 = Knife
- Draw times (CS:S authentic): Rifle 0.7s, Pistol 0.5s, Knife 0.25s
- No scroll wheel cycling, no Q quickswitch

### Movement Speed (CS:S tiers)
- Knife: 250 u/s (fastest)
- Pistol: 240 u/s
- AK-47: 215 u/s
- M4A1: 221 u/s

### Reload
- CS:S commit-style: Full animation plays, cannot cancel
- Ammo refills at 50% through animation (Decision D8 from Phase 3)
- AK reload ~2.5s, M4 reload ~3.1s, Pistol reload ~2.2s

## Recoil & Accuracy Model

### Spray Patterns
- **Fixed 30-shot patterns** per weapon with random spread overlay (CS:S faithful)
- AK pattern: Climbs up, pulls left after ~5-6 shots (harder to control)
- M4 pattern: Climbs up, drifts right (more controllable)
- Full magazine-length patterns — spray mastery is a deep skill

### First-Shot Accuracy
- **Perfect** when standing still — bullet goes exactly on crosshair
- Both AK and M4 have perfect first-shot accuracy

### Movement Inaccuracy
- **CS:S severity**: Rifles wildly inaccurate while moving — you MUST stop to shoot
- Pistol has moderate movement penalty (still usable while moving)
- Counter-strafing instantly restores accuracy (leverages Phase 1 movement engine)

### Spray Reset
- **~0.45s** to recover to first-shot accuracy after ceasing fire
- Same for both rifles (no weapon-dependent reset)

### Crouch Accuracy
- **Yes**: Crouching provides accuracy bonus (tighter spread)
- Crouch-spraying is a valid technique

### Airborne Accuracy
- **CS:S style**: Rifles completely inaccurate while airborne
- Pistol also very inaccurate in air
- Must land before shooting effectively

### Crosshair Behavior
- **Crosshair follows recoil** (CS:GO-style) — crosshair moves with spray pattern
- This is a deliberate hybrid: CS:S mechanics with CS:GO visual feedback
- Crosshair shows where bullets are actually going

## Hitbox Geometry & Registration

### Hitbox Zones (5 zones, CS:S)
| Zone | Multiplier | Shape |
|------|-----------|-------|
| Head | 4.0x | Sphere |
| Chest | 1.0x | Box |
| Stomach | 1.25x | Box |
| Arms | 1.0x | Capsules |
| Legs | 0.75x | Capsules |

### Hitbox Sizing
- Head hitbox **~15% larger** than visual model (slightly generous)
- Other hitboxes match visual model closely

### Hitbox Animation
- Primitive shapes (capsules/sphere/box) **follow the skeleton pose**
- Crouching, running, strafing change hitbox positions
- Hitboxes are not static — they track the procedural animation state

### Penetration
- **Arm penetration**: Shots through arms can also hit chest behind them
- Arms do not act as a shield when in front of torso
- Implementation: Ray tests all hitbox zones, applies damage to highest-priority hit behind arm

## Visual Combat Feedback

### Blood & Impact
- **Classic blood spray** from impact point in shot direction (not geometric particles)
- **Sparks + permanent bullet decals** on environment surfaces
- No hit markers, no damage numbers — read feedback from the world (CS:S pure)

### Headshot Feedback
- **Helmet spark**: Small bright flash/spark on headshot impact
- **Dink sound**: Distinct metallic sound on headshot (audio, Phase 6 will implement actual sound)
- Both together make headshots unmistakable

### Kill Feed
- **CS:S style**: `Killer [weapon icon] Victim` with headshot icon if applicable
- Top-right of screen
- Note: Full kill feed implementation is Phase 5 (HUD-04), but the data pipeline (who killed whom, with what weapon, headshot bool) must be built in Phase 4

### Enemy Visual Cues
- **Muzzle flashes visible** on enemy weapons at distance — gives away shooter position
- **Periodic bullet tracers** (every 3rd-5th bullet) — faint lines showing bullet path
- Tracers help read sprays but also reveal your position

### Tagging (COMBAT-08)
- Hit target experiences brief movement speed reduction
- Visual feedback for the target: being tagged is felt through movement, not shown visually

## Deferred Ideas
- (none captured)

## Scope Notes
- Kill feed UI rendering is Phase 5 (HUD-04), but Phase 4 must emit kill events with weapon/headshot data
- Headshot dink sound file is Phase 6 (AUDIO-03), but Phase 4 must trigger the audio event
- The rifle selection menu during freeze time requires Phase 5 freeze time (MATCH-02), but Phase 4 must build the weapon inventory system that supports having two rifle options
- Client-side prediction (COMBAT-11) will be skeletal in Phase 4 (single-player context) and fully realized in Phase 7 (multiplayer)

---
*Created: 2026-02-16*
