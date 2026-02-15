"""
Fix geometry issues:
1. Extend watchtower pillars down to ground level (Z:0)
2. Recreate slope railings to match the extended/gentler slope
Run with: blender --background arena_map.blend --python fix_geometry.py
"""

import bpy
import bmesh
import math
import mathutils

print("\n" + "="*60)
print("FIX GEOMETRY ISSUES")
print("="*60)

# ============================================================
# PART 1: Extend watchtower pillars to ground
# ============================================================
print("\n--- Extending watchtower pillars to ground ---")

tower_pillars = [
    'Tower_SW_pil_NE', 'Tower_SW_pil_NW', 'Tower_SW_pil_SE', 'Tower_SW_pil_SW',
    'Tower_NW_pil_NE', 'Tower_NW_pil_NW', 'Tower_NW_pil_SE', 'Tower_NW_pil_SW',
]

for name in tower_pillars:
    obj = bpy.data.objects.get(name)
    if not obj:
        print(f"  {name}: NOT FOUND")
        continue

    mesh = obj.data
    inv = obj.matrix_world.inverted()

    # Find the bottom Z vertices (currently at Z:4.00) and move to Z:0.00
    for v in mesh.vertices:
        world = obj.matrix_world @ v.co
        if abs(world.z - 4.00) < 0.1:  # Bottom vertices
            target = mathutils.Vector((world.x, world.y, 0.0))
            v.co = inv @ target

    mesh.update()
    print(f"  {name}: extended to ground (Z:0)")

# ============================================================
# PART 2: Delete old slope railings and recreate
# ============================================================
print("\n--- Removing old slope railings ---")

deleted = 0
for obj in list(bpy.data.objects):
    if obj.type != 'MESH':
        continue
    if obj.name.startswith('rail_slope_'):
        print(f"  Deleting {obj.name}")
        bpy.data.objects.remove(obj, do_unlink=True)
        deleted += 1
print(f"  Deleted {deleted} old slope rail objects")

# --- Helper to create tube ---
RAIL_RADIUS = 0.04
RAIL_SEGMENTS = 8
mat_metal = bpy.data.materials.get('Metal')

def create_tube(name, start, end, radius=RAIL_RADIUS, segments=RAIL_SEGMENTS):
    direction = mathutils.Vector(end) - mathutils.Vector(start)
    length = direction.length
    if length < 0.001:
        return None

    bm = bmesh.new()
    bmesh.ops.create_cone(bm,
        cap_ends=True,
        cap_tris=False,
        segments=segments,
        radius1=radius,
        radius2=radius,
        depth=length,
    )

    midpoint = (mathutils.Vector(start) + mathutils.Vector(end)) / 2
    z_axis = mathutils.Vector((0, 0, 1))
    dir_norm = direction.normalized()

    if abs(z_axis.dot(dir_norm)) > 0.9999:
        if z_axis.dot(dir_norm) > 0:
            rot = mathutils.Matrix.Identity(4)
        else:
            rot = mathutils.Matrix.Rotation(math.pi, 4, 'X')
    else:
        rot_axis = z_axis.cross(dir_norm).normalized()
        rot_angle = math.acos(max(-1, min(1, z_axis.dot(dir_norm))))
        rot = mathutils.Matrix.Rotation(rot_angle, 4, rot_axis)

    transform = mathutils.Matrix.Translation(midpoint) @ rot
    bmesh.ops.transform(bm, matrix=transform, verts=bm.verts)

    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new(name, mesh)
    if mat_metal:
        obj.data.materials.append(mat_metal)
    bpy.context.scene.collection.objects.link(obj)
    return obj

# --- Recreate slope railings ---
print("\n--- Creating new slope railings ---")

# New slope dimensions (after extension):
# Y: 12 to 21, Z: 4.15 (walkway surface) to 0.0 (ground)
SLOPE_Y_START = 12.0
SLOPE_Y_END = 21.0
SLOPE_Z_START = 4.15   # Walkway surface (use top of floor, not bottom)
SLOPE_Z_END = 0.0      # Ground level
SLOPE_LENGTH = SLOPE_Y_END - SLOPE_Y_START  # 9 units

# Rail heights above slope surface
BOTTOM_RAIL_H = 0.35
TOP_RAIL_H = 1.05
POST_SPACING = 3.0

# Inner rail X (east side of walkway)
INNER_X = -12.65
# Outer rail X (west side of walkway)
OUTER_X = -15.35

def slope_z_at_y(y):
    """Get slope surface Z at given Y."""
    t = (y - SLOPE_Y_START) / SLOPE_LENGTH
    t = max(0, min(1, t))
    return SLOPE_Z_START + t * (SLOPE_Z_END - SLOPE_Z_START)

def create_slope_railing(name_prefix, x):
    """Create railing section along the slope at given X."""
    objects = []

    # Bottom horizontal rail
    s_z = slope_z_at_y(SLOPE_Y_START) + BOTTOM_RAIL_H
    e_z = slope_z_at_y(SLOPE_Y_END) + BOTTOM_RAIL_H
    obj = create_tube(f"{name_prefix}_bot",
        (x, SLOPE_Y_START, s_z),
        (x, SLOPE_Y_END, e_z))
    if obj:
        objects.append(obj)

    # Top horizontal rail
    s_z = slope_z_at_y(SLOPE_Y_START) + TOP_RAIL_H
    e_z = slope_z_at_y(SLOPE_Y_END) + TOP_RAIL_H
    obj = create_tube(f"{name_prefix}_top",
        (x, SLOPE_Y_START, s_z),
        (x, SLOPE_Y_END, e_z))
    if obj:
        objects.append(obj)

    # Vertical posts
    num_posts = max(2, int(SLOPE_LENGTH / POST_SPACING) + 1)
    for i in range(num_posts):
        t = i / max(1, num_posts - 1)
        py = SLOPE_Y_START + t * SLOPE_LENGTH
        fz = slope_z_at_y(py)

        post_bot = fz + 0.05
        post_top = fz + TOP_RAIL_H + RAIL_RADIUS

        obj = create_tube(f"{name_prefix}_post{i}",
            (x, py, post_bot),
            (x, py, post_top))
        if obj:
            objects.append(obj)

    return objects

# Create inner rail (east side)
objs = create_slope_railing("rail_slope_in", INNER_X)
print(f"  Slope inner rail: {len(objs)} objects")

# Create outer rail (west side)
objs = create_slope_railing("rail_slope_out", OUTER_X)
print(f"  Slope outer rail: {len(objs)} objects")

# ============================================================
# Save
# ============================================================
bpy.ops.wm.save_mainfile()
print("\nSaved blend file")

mesh_count = sum(1 for obj in bpy.data.objects if obj.type == 'MESH')
print(f"Total meshes: {mesh_count}")

print("\n" + "="*60)
print("GEOMETRY FIXES COMPLETE")
print("="*60)
