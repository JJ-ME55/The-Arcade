---
status: investigating
trigger: "critter-kart-mp-self-jitter"
created: 2026-06-12T00:00:00Z
updated: 2026-06-12T06:00:00Z
---

## Current Focus

hypothesis: velHeading NOT lerped in renderPose → camera lookAt orientation jitter, drift-specific
test: probe built and executed (ck-render-probe.mjs), measured frame-to-frame camera yaw delta in deg
expecting: bug path shows higher peak jitter than fix path, worst during drift, zero on straight
next_action: confirm root cause, document fix, awaiting orchestrator to apply

## Symptoms

expected: Player's own kart moves glass-smooth at all times in multiplayer, like single-player
actual: Constant jitter "every millisecond" — worst when drifting/turning corners, best when going straight. Survives 5 rounds of netcode fixes (corrections went to 0). Alone in the lead = no other karts visible, still jitters. Telemetry: frames=295-300/5s, slow/hitch counts near zero.
errors: None.
reproduction: Any MP race on https://the-arcade-critter-kart.vercel.app, confirmed across all fix rounds on 2026-06-12
started: Whole of 2026-06-12 and throughout MP development

## Eliminated

- hypothesis: reconciliation corrections causing jitter
  evidence: corrections went from 30/sec to 0/sec across 5 fix rounds; jitter unchanged. Telemetry confirmed.
  timestamp: 2026-06-12

- hypothesis: network timing / buffer starving
  evidence: harness passes 20/20, corrections median 0.01u. Not the cause of SP-identical pattern.
  timestamp: 2026-06-12

- hypothesis: accumulator alpha sawtooth → backward render steps
  evidence: probe test2 shows 0 backward steps at 60Hz ±1ms. Zero backward motion. Max jerk ratio 0.00x. NOT the cause of drift-specific jitter. Present in SP equally.
  timestamp: 2026-06-12

- hypothesis: deadband boostTimer adopt → 10Hz speed oscillation
  evidence: probe test3 shows <0.01u position error from 10Hz boostTimer inject. Negligible. NOT the cause.
  timestamp: 2026-06-12

- hypothesis: flattenUntil[PLAYER] repeatedly extended by 60Hz snapshots
  evidence: code analysis shows guard: `if (sft > 0 && flattenUntil[PLAYER] <= elapsed)` — only extends if not already active. Cannot fire per-frame.
  timestamp: 2026-06-12

- hypothesis: MP-specific render path differs from SP
  evidence: renderPose() for PLAYER is IDENTICAL in SP and MP when mpSmoothX/Z/H = 0 (corrections=0). The velHeading omission exists in BOTH. The jitter mechanism is shared — MP makes it more perceptible because attention is sharper.
  timestamp: 2026-06-12

## Evidence

- timestamp: 2026-06-12T01:00:00Z
  checked: GameCanvas.tsx renderPose() ~line 1442
  found: pose = { ...cur, x:lerp, z:lerp, y:lerp, heading:angleLerp } — velHeading NOT overridden, propagates from ...cur = states[PLAYER].velHeading (unlerped current state)
  implication: velHeading in the render pose is always the CURRENT physics step's value, not interpolated between prev and cur

- timestamp: 2026-06-12T01:05:00Z
  checked: updateChaseCamera() in game/render/chaseCamera.ts lines 20-28
  found: uses s.velHeading for BOTH camera position target (line 22) AND camera.lookAt() (line 28). camera.position.lerp() absorbs position jitter. camera.lookAt() sets orientation DIRECTLY — NO smoothing.
  implication: any per-step discontinuity in velHeading goes directly into camera orientation, unfiltered

- timestamp: 2026-06-12T01:10:00Z
  checked: Kart.ts syncTo() line 201-204
  found: mesh.rotation.y = state.heading + YAW_OFFSET. Uses renderPose().heading which IS lerped. mesh.position uses lerped x/z/y.
  implication: the KART MESH is smooth. The CAMERA ORIENTATION jitters. Player perceives camera jitter as kart jitter.

- timestamp: 2026-06-12T02:00:00Z
  checked: probe test1 — camera orientation jitter (deg/frame) on 600 frames
  found: straight line: 0.0000 deg bug / 0.0000 deg fix (zero). Hard turn: 1.70 deg max bug / 0.90 deg max fix. Drift: 2.64 deg max bug / 1.40 deg max fix. Camera in pixels (1920px, 60°FOV): straight=0px, drift bug=84.51px max, drift fix=44.87px max.
  implication: PATTERN MATCHES FISH'S REPORT. Straight = zero jitter. Drift = significant camera snap. The fix halves the peak jitter. The velHeading omission is the primary mechanism.

- timestamp: 2026-06-12T02:05:00Z
  checked: probe test2 — alpha sawtooth backward steps
  found: 0 backward steps in 600 frames at 60Hz ±1ms. Max jerk ratio 0.00x. Alpha stdev 0.3645.
  implication: Accumulator sawtooth does NOT cause backward render motion. It causes delta VARIANCE (0-step frames vs 1-step frames) but this affects SP and MP equally and has no drift-specific component.

- timestamp: 2026-06-12T02:10:00Z
  checked: probe test3 — precise 2-second drift corner comparison
  found: BUG max camera yaw jitter 1.656 deg/frame (52.98px). FIX max 1.144 deg/frame (36.60px). Mean is similar (turning produces expected camera rotation) but the BUG peaks are ~45% higher than FIX peaks — those are the unlerped velH spikes on frames where a physics step fires.
  implication: The spikes (jitter perceived by Fish) are the frames where physics fires and velHeading jumps. The fix eliminates those spikes specifically.

- timestamp: 2026-06-12T02:15:00Z
  checked: kartPhysics.ts stepKart() velHeading update logic
  found: velHeading = angleLerp(s.velHeading, heading, grip). During drift: grip = GRIP_BASE * speedFrac_scaled * DRIFT_GRIP_MULT ≈ 0.02-0.05 per step. velHeading lags far behind heading (drift angle can reach 20-40 deg during sustained drift). Each step advances velHeading slightly. The unlerped jump is small (0.03-0.08 deg/step) but at 60fps the camera sees it instantly via lookAt().
  implication: The drift grip multiplication (×0.25) is what makes drifting specifically worse — lower grip means velHeading changes less per step but the HEADING changes more, creating a larger heading-velHeading gap and more camera sensitivity to each step.

## Resolution

root_cause: |
  GameCanvas.tsx renderPose() does NOT lerp velHeading. The pose spread { ...cur,
  x:lerp, z:lerp, y:lerp, heading:lerp } leaves velHeading as states[PLAYER].velHeading
  (the CURRENT, unlerped physics state value). updateChaseCamera() uses velHeading for
  BOTH the camera position target and camera.lookAt(). camera.lookAt() sets camera
  orientation directly with NO lerp/smoothing each frame. During drifting/turning,
  velHeading advances each physics step; without the lerp, the camera orientation snaps
  by the full per-step delta (~0.03-0.08 deg) at each step fire (~60Hz), producing
  visible camera jitter. The kart MESH is smooth (heading is lerped). The jitter is
  purely the CAMERA's orientation snapping, perceived as kart jitter. On straights,
  velHeading barely changes → zero camera snap → smooth feel. Exactly matches all
  symptom reports.

fix: |
  In GameCanvas.tsx renderPose() ~line 1442-1448, add velHeading to the lerped pose:

  Current code:
    const pose = {
      ...cur,
      x: prev.x + (cur.x - prev.x) * alpha,
      z: prev.z + (cur.z - prev.z) * alpha,
      y: (prev.y ?? 0) + ((cur.y ?? 0) - (prev.y ?? 0)) * alpha,
      heading: angleLerp(prev.heading, cur.heading, alpha),
    };

  Fixed code (add one line):
    const pose = {
      ...cur,
      x: prev.x + (cur.x - prev.x) * alpha,
      z: prev.z + (cur.z - prev.z) * alpha,
      y: (prev.y ?? 0) + ((cur.y ?? 0) - (prev.y ?? 0)) * alpha,
      heading: angleLerp(prev.heading, cur.heading, alpha),
      velHeading: angleLerp(prev.velHeading ?? prev.heading, cur.velHeading, alpha),
    };

  The fallback `prev.velHeading ?? prev.heading` handles the first frame where
  prevStates[PLAYER] is initialized identically to states[PLAYER].

verification: pending — orchestrator to apply fix and verify with Fish
files_changed:
  - src/games/critter-kart/GameCanvas.tsx (renderPose, 1 line added)
