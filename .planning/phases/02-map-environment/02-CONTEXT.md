# Phase 2 Context: Map & Environment

## Visual Reference

Two reference screenshots of aim_ag_texture2 provided by the project owner (CS:GO port by DatGuy). These are the definitive visual target — match this exactly.

## Color Palette

Directly from the reference screenshots:

| Surface | Color | Notes |
|---------|-------|-------|
| Structural elements (walls, platforms, cover boxes, ramps) | **Orange/yellow** | Bright, saturated. Mix of orange and yellow tones across different blocks |
| Floor surfaces | **Light grey/beige** | With visible white grid lines (dev texture style) |
| Upper platforms, overhangs, accent structures | **Dark grey/brown** | Darker contrast against the orange |
| Skybox | **Overcast blue-grey** | Moody, matches the original exactly |

- All surfaces are flat, solid colors — no complex textures or detail maps
- Grid lines visible on floor surfaces only
- Orange elements vary slightly between bright orange and golden yellow for visual variety

## Geometry Accuracy

- **Pixel-perfect recreation** — extract exact dimensions from the original aim_ag_texture2 BSP file
- Research phase should source the BSP geometry data (brush positions, dimensions, angles) to get precise measurements
- Every platform, ramp, wall, cover box, and decorative element matched to the original
- Scale must be correct relative to player height (72 Hammer Units equivalent)
- No approximation — this is a 1:1 recreation, not "inspired by"

## Layout (from reference screenshots)

- Large open central ground floor
- Scattered orange box covers on ground level (various sizes — small cubes for crouching behind, medium boxes for full cover)
- Multi-level platforms around the perimeter (3-4 floors)
- Ramps/triangular wedges connecting levels
- Walkways and balconies overlooking the center
- Archway/dome structures (visible in screenshots)
- Arrow/chevron decorative shapes at the very top (cosmetic only)
- Rectangular arena shape overall
- Mirror-symmetrical layout

## Boundaries & Environment

- **Perimeter walls** contain all players — no invisible walls needed, the geometry itself forms the boundary
- **No invisible ceiling** — the decorative top elements and perimeter walls prevent going above the playable area
- **Arrow/chevron shapes** at the top are decorative only — players cannot reach them
- **No fall-off zones or death boundaries** — the arena is fully enclosed
- **Skybox**: overcast blue-grey, matching the original aim_ag_texture2 sky

## Lighting

- Bright, even, static lighting throughout
- No dark corners or shadowed areas
- Uniform illumination ensures maximum visibility at all times
- Matching the original's flat, bright look where player silhouettes are always clearly visible against surfaces

## Spawn Points

- One fixed spawn point per team on opposite ends of the map (ground level)
- Positions should mirror each other exactly (symmetry requirement)
- Research should identify the original T and CT spawn locations from the BSP

## Deferred Ideas

- (none captured during discussion)

---
*Created: 2026-02-13*
