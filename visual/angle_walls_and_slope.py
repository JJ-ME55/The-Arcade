"""
1. Angle the corridor walls so they lean inward (wider at bottom)
2. Extend the NW slope ramp to be less steep
Run with: blender --background arena_map.blend --python angle_walls_and_slope.py
"""

import bpy
import bmesh
import math
import mathutils

print("\n" + "="*60)
print("ANGLE CORRIDOR WALLS + EXTEND NW SLOPE")
print("="*60)

# ============================================================
# PART 1: Angle the corridor east wall outward at the bottom
# ============================================================
# Currently east wall is vertical at X: -12.75 to -12.50
# We want the bottom to extend further east (into the arena)
# Bottom at X: -12.00, top at X: -12.50 (0.50 unit lean over 3.85m height)
# This gives a ~7.4 degree angle from vertical

LEAN_AMOUNT = 0.75  # How far the bottom extends beyond the top (in X)

print("\n--- Angling corridor east wall ---")

east_wall_objs = [
    'Corr_wall_E_sec1',
    'Corr_wall_E_sec2',
    'Corr_wall_E_sec3',
    'Corr_wall_E_lintel1',
    'Corr_wall_E_lintel2',
]

for name in east_wall_objs:
    obj = bpy.data.objects.get(name)
    if not obj:
        print(f"  {name}: NOT FOUND")
        continue

    mesh = obj.data
    inv = obj.matrix_world.inverted()

    # For each vertex, apply lean based on Z position
    # At Z=3.85 (top): no lean (stay at original X)
    # At Z=0 (bottom): lean by LEAN_AMOUNT toward +X (east/into arena)
    CEIL_Z = 3.85

    for v in mesh.vertices:
        world = obj.matrix_world @ v.co
        # Only lean the outer face (the arena-facing side, higher X values)
        # Check if this vertex is on the outer face (X ≈ -12.50)
        if world.x > -12.60:  # Outer face vertices
            t = 1.0 - (world.z / CEIL_Z)  # 0 at top, 1 at bottom
            t = max(0, min(1, t))
            new_x = world.x + LEAN_AMOUNT * t
            target = mathutils.Vector((new_x, world.y, world.z))
            v.co = inv @ target

    mesh.update()
    print(f"  {name}: angled outward")

# Also angle the west wall (lean outward toward -X)
print("\n--- Angling corridor west wall ---")
obj = bpy.data.objects.get('Corr_wall_W')
if obj:
    mesh = obj.data
    inv = obj.matrix_world.inverted()
    CEIL_Z = 3.85

    for v in mesh.vertices:
        world = obj.matrix_world @ v.co
        # Outer face is the west-facing side (lower X values, X ≈ -15.50)
        if world.x < -15.40:
            t = 1.0 - (world.z / CEIL_Z)
            t = max(0, min(1, t))
            new_x = world.x - LEAN_AMOUNT * t  # Lean toward -X
            target = mathutils.Vector((new_x, world.y, world.z))
            v.co = inv @ target

    mesh.update()
    print(f"  Corr_wall_W: angled outward")

# ============================================================
# PART 2: Extend NW slope to be less steep
# ============================================================
# Current slope: Y:12 to Y:18, Z: 4.0 to 0.0 (6 units long, ~33° angle)
# New slope: Y:12 to Y:21, Z: 4.0 to 0.0 (9 units long, ~24° angle)

OLD_SLOPE_END_Y = 18.0
NEW_SLOPE_END_Y = 21.0

print("\n--- Extending NW slope ramp ---")
print(f"  Old: Y:12 to {OLD_SLOPE_END_Y} (6 units, ~33°)")
print(f"  New: Y:12 to {NEW_SLOPE_END_Y} (9 units, ~24°)")

# Modify Walk_NW_slope floor
obj = bpy.data.objects.get('Walk_NW_slope')
if obj:
    mesh = obj.data
    inv = obj.matrix_world.inverted()

    for v in mesh.vertices:
        world = obj.matrix_world @ v.co
        # Move vertices at Y=18 to Y=21
        if abs(world.y - OLD_SLOPE_END_Y) < 0.1:
            target = mathutils.Vector((world.x, NEW_SLOPE_END_Y, world.z))
            v.co = inv @ target

    mesh.update()
    print(f"  Walk_NW_slope: extended to Y:{NEW_SLOPE_END_Y}")
else:
    print("  Walk_NW_slope: NOT FOUND")

# Modify slope railing cylinders
# These were created by make_railings.py as rail_slope_in_* and rail_slope_out_*
# Each has vertices at Y:12 and Y:18
# We need to move Y:18 vertices to Y:21

slope_rail_prefixes = ['rail_slope_in_', 'rail_slope_out_']
modified_rails = 0

for obj in list(bpy.data.objects):
    if obj.type != 'MESH':
        continue

    match = False
    for prefix in slope_rail_prefixes:
        if obj.name.startswith(prefix):
            match = True
            break

    if not match:
        continue

    mesh = obj.data
    inv = obj.matrix_world.inverted()

    # For horizontal rail tubes and vertical posts at the end:
    # Move any vertex near Y=18 to Y=21
    changed = False
    for v in mesh.vertices:
        world = obj.matrix_world @ v.co
        if abs(world.y - OLD_SLOPE_END_Y) < 0.2:
            target = mathutils.Vector((world.x, NEW_SLOPE_END_Y, world.z))
            v.co = inv @ target
            changed = True

    if changed:
        mesh.update()
        modified_rails += 1

print(f"  Modified {modified_rails} slope railing objects")

# Also need to move the slope's outer walkway rail posts if they exist at the old end
# And the existing Walk_NW_slope_rail_in / _out if they still exist
for name in ['Walk_NW_slope_rail_in', 'Walk_NW_slope_rail_out']:
    obj = bpy.data.objects.get(name)
    if not obj:
        continue
    mesh = obj.data
    inv = obj.matrix_world.inverted()
    for v in mesh.vertices:
        world = obj.matrix_world @ v.co
        if abs(world.y - OLD_SLOPE_END_Y) < 0.2:
            target = mathutils.Vector((world.x, NEW_SLOPE_END_Y, world.z))
            v.co = inv @ target
    mesh.update()
    print(f"  {name}: extended to Y:{NEW_SLOPE_END_Y}")

# ============================================================
# Save
# ============================================================
bpy.ops.wm.save_mainfile()
print("\nSaved blend file")

mesh_count = sum(1 for obj in bpy.data.objects if obj.type == 'MESH')
print(f"Total meshes: {mesh_count}")

print("\n" + "="*60)
print("COMPLETE")
print("="*60)
