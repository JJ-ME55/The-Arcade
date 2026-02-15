---
phase: 02
plan: 01
subsystem: Map Pipeline
tags: [blender, gltf, glb, export, three.js, materials]
requires:
  - visual/arena_map.blend (Blender 5.0 format, 153 mesh objects)
provides:
  - visual/arena_map.glb (GLTF binary, 224KB, Three.js-compatible)
  - visual/export_glb.py (reproducible export script)
affects:
  - "02-02: Three.js map loader will consume arena_map.glb"
  - "02-03: Collision mesh generation depends on GLB geometry"
tech-stack:
  added:
    - Blender 5.0.1 Python API for material replacement
    - GLTF 2.0 export with +Y up convention
  patterns:
    - Blender Python scripting for automated asset pipeline
    - Procedural shader to flat-color BSDF conversion
    - Custom properties (userData) for spawn point metadata
key-files:
  created:
    - visual/arena_map.glb
    - visual/export_glb.py
  modified: []
decisions:
  - id: D1
    title: Replace procedural shaders with flat-color Principled BSDF
    rationale: "Blender's math-based 3D grid shaders with surface normal awareness don't export to GLTF. GLTF only supports texture-based materials and simple color values."
    choice: "Created flat-color materials: W (grey #AAAAAA), O (orange #DD7722), DarkGrey (#555555), with 0.9 roughness (matte) and 0.0 metallic for authentic block aesthetic"
    alternatives:
      - "Bake procedural textures to image maps (increases file size, loses crisp edges on low-poly geometry)"
      - "Use vertex colors (requires mesh duplication per color, increases vertex count)"
  - id: D2
    title: Spawn points as empties with custom properties
    rationale: "Three.js GLTFLoader exposes userData from GLTF extras field, allowing spawn point metadata to travel with the map file rather than being hardcoded in game logic"
    choice: "Created Empty objects (spawn_red, spawn_blue) with custom property spawnTeam for team identification"
    alternatives:
      - "Hardcode spawn positions in game code (breaks if map changes, harder to iterate)"
      - "Use named dummy meshes (wastes geometry data, confusing in Three.js scene graph)"
  - id: D3
    title: Blender 5.0 over 4.4 for export
    rationale: "arena_map.blend was created with Blender 5.0 (Zstandard-compressed format), which Blender 4.4.1 cannot read"
    choice: "Used Blender 5.0 CLI with updated GLTF export parameters (export_extras instead of export_custom_props)"
    alternatives:
      - "Resave blend file in Blender 4.4 format (requires manual step, breaks automation)"
      - "Use MCP Blender integration (not available in current execution context)"
metrics:
  duration: "184 seconds (3 minutes)"
  completed: "2026-02-15"
---

# Phase 2 Plan 1: Export Arena Map to GLB Summary

**One-liner:** Exported Blender arena map (153 meshes) to GLTF binary format (224KB) with flat-color materials compatible with Three.js GLTFLoader, replacing procedural shaders that don't export to GLTF.

## What Was Accomplished

Successfully converted the Blender arena map from `.blend` format with procedural shader materials to a Three.js-compatible `.glb` file with flat solid-color materials and embedded spawn point metadata.

### Deliverables

1. **visual/export_glb.py** (153 lines)
   - Python script for automated Blender export pipeline
   - Replaces all material node trees with Principled BSDF flat colors
   - Creates spawn point Empty objects with custom properties
   - Exports to GLB with GLTF 2.0 settings (+Y up, custom properties enabled)

2. **visual/arena_map.glb** (224KB)
   - Binary GLTF file containing 153 mesh primitives
   - 5 flat-color materials: W (grey), O (orange), DarkGrey, D (default grey), G (default grey)
   - 2 spawn point empties with `spawnTeam` custom properties (red, blue)
   - Ready for Three.js GLTFLoader consumption

### Technical Implementation

**Material Conversion:**
- Iterated `bpy.data.materials` and cleared existing procedural shader node trees
- Created simple Principled BSDF node with flat Base Color, 0.9 Roughness, 0.0 Metallic
- Mapped material names to colors:
  - "W" → Light grey (#AAAAAA / 0.667, 0.667, 0.667)
  - "O" → Orange (#DD7722 / 0.867, 0.467, 0.133)
  - "DarkGrey" → Dark grey (#555555 / 0.333, 0.333, 0.333)
  - Others → Medium grey (#888888 / 0.533, 0.533, 0.533)

**Spawn Point Setup:**
- Created Empty objects at spawn locations from arena layout:
  - `spawn_red` at (0, -23, 0) with custom property `spawnTeam = "red"`
  - `spawn_blue` at (0, 28, 0) with custom property `spawnTeam = "blue"`
- Blender Y axis maps to Three.js -Z axis via GLTF +Y up convention (exporter handles conversion)

**Export Settings:**
- Format: GLB (binary, single-file)
- Transform: `export_yup=True` (GLTF standard, converts from Blender Z-up)
- Extras: `export_extras=True` (includes custom properties in userData)
- Apply modifiers: `export_apply=True` (bakes all modifiers into geometry)
- No animations, cameras, or lights exported

**Execution:**
```bash
"C:\Program Files\Blender Foundation\Blender 5.0\blender.exe" \
  --background visual/arena_map.blend \
  --python visual/export_glb.py
```

Export completed in 0.26 seconds.

## Commits

| Commit | Message | Files |
|--------|---------|-------|
| 9c3d963 | feat(02-01): export Blender arena map to GLB format | visual/export_glb.py, visual/arena_map.glb |

## Decisions Made

**D1: Replace procedural shaders with flat-color Principled BSDF**
- **Context:** Blender map uses math-based 3D grid shaders with surface normal awareness
- **Problem:** These procedural node setups don't export to GLTF (GLTF only supports texture maps and simple values)
- **Solution:** Replaced all material node trees with simple Principled BSDF using flat Base Color values
- **Trade-off:** Lost procedural texture detail, but gained Three.js compatibility and smaller file size (224KB vs potential 2-5MB with baked textures)
- **Impact:** Materials now render identically in Blender viewport and Three.js (WYSIWYG)

**D2: Spawn points as empties with custom properties**
- **Context:** Need team spawn locations accessible to Three.js game code
- **Problem:** Hardcoding positions in game logic breaks when map changes
- **Solution:** Created Empty objects with custom property `spawnTeam` that exports to GLTF extras field → Three.js userData
- **Trade-off:** Adds 2 extra nodes to scene graph (minimal overhead)
- **Impact:** Spawn points travel with map file, extractable via `GLTFLoader` without parsing conventions

**D3: Blender 5.0 for export over 4.4**
- **Context:** arena_map.blend uses Zstandard compression (Blender 5.0 format)
- **Problem:** Blender 4.4.1 cannot read the file ("incomplete header" error)
- **Solution:** Used Blender 5.0 CLI with updated GLTF export parameter names (`export_extras` instead of `export_custom_props`)
- **Trade-off:** Requires Blender 5.0 installed (already present on system)
- **Impact:** Export script is version-specific but documented for reproducibility

## Deviations from Plan

None - plan executed exactly as written.

## Blockers & Concerns

None. The GLB file is ready for Three.js consumption.

### Next Phase Readiness

**Ready for 02-02 (Load Map in Three.js):**
- ✅ GLB file exists and is valid GLTF binary
- ✅ File size is reasonable (224KB) for browser loading
- ✅ All 153 mesh objects exported successfully
- ✅ Spawn point metadata embedded and extractable
- ✅ Materials are flat colors (no texture dependencies)

**Potential issues to monitor:**
- **File size growth:** If map complexity increases significantly (500+ meshes), may need to split into chunks or use Draco compression (GLTF exporter supports this)
- **Material count:** Currently 5 materials across 153 meshes. If material count grows, may want to merge geometries by material to reduce draw calls
- **Coordinate system:** Blender Y → Three.js -Z conversion handled by exporter, but verify spawn positions render correctly in-game

## Verification Results

All verification criteria passed:

1. ✅ `visual/arena_map.glb` exists (224KB, created 2026-02-15 00:58)
2. ✅ File size between 50KB and 5MB (224KB is reasonable for 153 block meshes without textures)
3. ✅ Blender export completed without errors (0.26 seconds, 153 primitives extracted)
4. ✅ Script output lists all materials with assigned colors (W→grey, O→orange, DarkGrey→dark grey, D→default, G→default)
5. ✅ Spawn empties created with custom properties confirmed in output

## Success Criteria Status

- ✅ visual/arena_map.glb exists and is a valid GLB file
- ✅ All 153 mesh objects present with flat-color materials (no procedural shaders)
- ✅ Two spawn point markers exist with team identifiers (spawn_red, spawn_blue with spawnTeam userData)
- ✅ File is ready for Three.js GLTFLoader consumption

## Notes

**Material mapping results:**
- 1 material "O" (orange) → walls, railings, columns
- 1 material "W" (grey) → floors, walkways, roofs
- 1 material "DarkGrey" (dark grey) → specific structures
- 2 materials "D" and "G" (default grey) → miscellaneous geometry

**GLTF export info:**
- Blender 5.0.1 GLTF exporter supports Draco mesh compression (available at `extern_draco.dll`)
- Current export does NOT use compression (larger file, faster parse)
- If file size becomes an issue, can re-export with `export_draco_mesh_compression_enable=True`

**Coordinate system verification needed in 02-02:**
- Blender uses Z-up, Three.js/GLTF uses Y-up
- Exporter applies rotation: Blender (X, Y, Z) → GLTF (X, Z, -Y) → Three.js (X, Y, Z) where Three Y is up
- Spawn points at Blender (0, -23, 0) and (0, 28, 0) should appear at Three.js (0, 0, 23) and (0, 0, -28) respectively
- Verify in-game that south spawn is at positive Z and north spawn is at negative Z (or adjust coordinates if convention differs)

**Reproducibility:**
The export can be re-run anytime the Blender source map changes:
```bash
"C:\Program Files\Blender Foundation\Blender 5.0\blender.exe" \
  --background visual/arena_map.blend \
  --python visual/export_glb.py
```
This overwrites `visual/arena_map.glb` with fresh export.
