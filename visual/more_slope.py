"""
1. Increase corridor wall lean from 0.75 to 1.5 (add 0.75 more)
2. Apply same angled lean to NE building western wall
Run with: blender --background arena_map.blend --python more_slope.py
"""

import bpy
import mathutils

print("\n" + "="*60)
print("INCREASE WALL SLOPES")
print("="*60)

CORR_CEIL_Z = 3.85
EXTRA_LEAN = 0.75  # Additional lean on top of existing 0.75

# ============================================================
# PART 1: Increase corridor wall lean
# ============================================================
print("\n--- Increasing corridor wall lean ---")

# East wall sections - lean outer face further east (+X)
east_walls = [
    'Corr_wall_E_sec1', 'Corr_wall_E_sec2', 'Corr_wall_E_sec3',
    'Corr_wall_E_lintel1', 'Corr_wall_E_lintel2',
]

for name in east_walls:
    obj = bpy.data.objects.get(name)
    if not obj:
        continue
    mesh = obj.data
    inv = obj.matrix_world.inverted()

    for v in mesh.vertices:
        world = obj.matrix_world @ v.co
        # Outer face: the vertices that were originally at X:-12.50 and have been
        # leaned to ~-11.75. They'll be the ones with higher X values.
        # Inner face vertices are at X:-12.75 (unchanged).
        if world.x > -12.70:  # Outer face (already leaned)
            t = 1.0 - (world.z / CORR_CEIL_Z)
            t = max(0, min(1, t))
            new_x = world.x + EXTRA_LEAN * t
            target = mathutils.Vector((new_x, world.y, world.z))
            v.co = inv @ target
    mesh.update()
    print(f"  {name}: +{EXTRA_LEAN} lean")

# West wall - lean outer face further west (-X)
obj = bpy.data.objects.get('Corr_wall_W')
if obj:
    mesh = obj.data
    inv = obj.matrix_world.inverted()
    for v in mesh.vertices:
        world = obj.matrix_world @ v.co
        # Outer face: lower X values (already leaned from -15.50)
        if world.x < -15.30:
            t = 1.0 - (world.z / CORR_CEIL_Z)
            t = max(0, min(1, t))
            new_x = world.x - EXTRA_LEAN * t
            target = mathutils.Vector((new_x, world.y, world.z))
            v.co = inv @ target
    mesh.update()
    print(f"  Corr_wall_W: +{EXTRA_LEAN} lean")

print(f"  Total corridor lean now: {0.75 + EXTRA_LEAN}")

# ============================================================
# PART 2: Apply lean to NE building western wall
# ============================================================
print("\n--- Angling NE building west wall ---")

# First find all NE west wall objects and determine their Z range
ne_west_objs = []
for obj in bpy.data.objects:
    if obj.type != 'MESH':
        continue
    if obj.name.startswith('NE_wall_W'):
        ne_west_objs.append(obj.name)

print(f"  Found NE west wall objects: {ne_west_objs}")

# Get the full height of the NE building west wall
all_z = []
NE_WALL_X = None  # The X position of the west face
for name in ne_west_objs:
    obj = bpy.data.objects.get(name)
    if not obj:
        continue
    mesh = obj.data
    for v in mesh.vertices:
        world = obj.matrix_world @ v.co
        all_z.append(world.z)
        # Track the minimum X (westernmost face)
        if NE_WALL_X is None or world.x < NE_WALL_X:
            NE_WALL_X = world.x

if all_z:
    NE_Z_MIN = min(all_z)
    NE_Z_MAX = max(all_z)
    print(f"  Wall Z range: {NE_Z_MIN:.1f} to {NE_Z_MAX:.1f}")
    print(f"  West face X: {NE_WALL_X:.2f}")
else:
    print("  ERROR: No vertices found")
    NE_Z_MIN = 0
    NE_Z_MAX = 8
    NE_WALL_X = 11.0

NE_HEIGHT = NE_Z_MAX - NE_Z_MIN
NE_LEAN = 1.5  # Same total lean as corridor

# Apply lean: bottom extends west (-X), top stays at original position
for name in ne_west_objs:
    obj = bpy.data.objects.get(name)
    if not obj:
        continue
    mesh = obj.data
    inv = obj.matrix_world.inverted()

    for v in mesh.vertices:
        world = obj.matrix_world @ v.co
        # Only affect the west-facing face (vertices at the minimum X)
        if abs(world.x - NE_WALL_X) < 0.1:
            # t = 0 at top, 1 at bottom
            t = 1.0 - ((world.z - NE_Z_MIN) / NE_HEIGHT)
            t = max(0, min(1, t))
            new_x = world.x - NE_LEAN * t  # Lean westward
            target = mathutils.Vector((new_x, world.y, world.z))
            v.co = inv @ target

    mesh.update()
    print(f"  {name}: leaned {NE_LEAN} units at base")

# ============================================================
# Save
# ============================================================
bpy.ops.wm.save_mainfile()
print("\nSaved blend file")

print("\n" + "="*60)
print("COMPLETE")
print("="*60)
