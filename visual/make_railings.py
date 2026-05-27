"""
Replace box walkway rails with cylindrical metal railings.
Run with: blender --background arena_map.blend --python make_railings.py
"""

import bpy
import bmesh
import math
import mathutils

print("\n" + "="*60)
print("CYLINDRICAL RAILING CONVERSION")
print("="*60)

# === Step 1: Create metallic railing material ===
mat_name = "Metal"
mat = bpy.data.materials.get(mat_name)
if not mat:
    mat = bpy.data.materials.new(name=mat_name)
mat.use_nodes = True
mat.node_tree.nodes.clear()
bsdf = mat.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
bsdf.inputs['Base Color'].default_value = (0.4, 0.4, 0.45, 1.0)  # Steel grey
bsdf.inputs['Metallic'].default_value = 0.8
bsdf.inputs['Roughness'].default_value = 0.4
output = mat.node_tree.nodes.new('ShaderNodeOutputMaterial')
mat.node_tree.links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])
print(f"Created material: {mat_name}")

# === Step 2: Delete old box rails ===
old_rails = [
    'Walk_E_rail_in',
    'Walk_S_rail_in',
    'Walk_S_rail_out',
    'Walk_W_rail_in',
    'Walk_W_rail_out',
    'Walk_corner_rail_S',
    'Walk_corner_rail_W',
    'Walk_NW_slope_rail_in',
    'Walk_NW_slope_rail_out',
]

deleted = 0
for name in old_rails:
    obj = bpy.data.objects.get(name)
    if obj:
        bpy.data.objects.remove(obj, do_unlink=True)
        deleted += 1
print(f"Deleted {deleted} old box rails")

# === Step 3: Helper functions ===

RAIL_RADIUS = 0.04  # 4cm tube radius
RAIL_SEGMENTS = 8   # Octagonal cross-section (good enough for game)

def create_tube(name, start, end, radius=RAIL_RADIUS, segments=RAIL_SEGMENTS):
    """Create a tube mesh between two 3D points."""
    direction = mathutils.Vector(end) - mathutils.Vector(start)
    length = direction.length
    if length < 0.001:
        return None

    bm = bmesh.new()

    # Create cylinder along Z axis, then transform
    bmesh.ops.create_cone(bm,
        cap_ends=True,
        cap_tris=False,
        segments=segments,
        radius1=radius,
        radius2=radius,
        depth=length,
    )

    # The cylinder is centered at origin along Z.
    # We need to rotate it to align with our direction and move to position.
    midpoint = (mathutils.Vector(start) + mathutils.Vector(end)) / 2

    # Rotation from Z to direction
    z_axis = mathutils.Vector((0, 0, 1))
    dir_norm = direction.normalized()

    if abs(z_axis.dot(dir_norm)) > 0.9999:
        # Nearly parallel to Z, use identity or flip
        if z_axis.dot(dir_norm) > 0:
            rot = mathutils.Matrix.Identity(4)
        else:
            rot = mathutils.Matrix.Rotation(math.pi, 4, 'X')
    else:
        rot_axis = z_axis.cross(dir_norm).normalized()
        rot_angle = math.acos(max(-1, min(1, z_axis.dot(dir_norm))))
        rot = mathutils.Matrix.Rotation(rot_angle, 4, rot_axis)

    # Apply rotation then translation
    transform = mathutils.Matrix.Translation(midpoint) @ rot
    bmesh.ops.transform(bm, matrix=transform, verts=bm.verts)

    # Create mesh
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(bpy.data.materials[mat_name])
    bpy.context.scene.collection.objects.link(obj)

    return obj


def create_railing_section(name_prefix, start_2d, end_2d, floor_z,
                            inner_side=True, is_slope=False,
                            slope_start_z=None, slope_end_z=None):
    """
    Create a railing section with two horizontal rails and vertical posts.

    start_2d/end_2d: (x, y) endpoints of the railing line
    floor_z: Z height of the walkway floor (for flat sections)
    inner_side: which side faces the arena
    is_slope: if True, floor_z varies linearly from slope_start_z to slope_end_z
    """
    sx, sy = start_2d
    ex, ey = end_2d

    # Rail heights above floor
    BOTTOM_RAIL_H = 0.35  # 35cm above floor
    TOP_RAIL_H = 1.05     # 105cm above floor (waist height)
    POST_SPACING = 3.0    # Post every 3 units

    objects = []

    # Calculate direction and length
    dx = ex - sx
    dy = ey - sy
    length = math.sqrt(dx*dx + dy*dy)

    if length < 0.01:
        return objects

    def z_at_t(t):
        """Get floor Z at parameter t (0=start, 1=end)."""
        if is_slope:
            return slope_start_z + t * (slope_end_z - slope_start_z)
        return floor_z

    # Bottom horizontal rail
    s_z = z_at_t(0) + BOTTOM_RAIL_H
    e_z = z_at_t(1) + BOTTOM_RAIL_H
    obj = create_tube(f"{name_prefix}_bot", (sx, sy, s_z), (ex, ey, e_z))
    if obj:
        objects.append(obj)

    # Top horizontal rail
    s_z = z_at_t(0) + TOP_RAIL_H
    e_z = z_at_t(1) + TOP_RAIL_H
    obj = create_tube(f"{name_prefix}_top", (sx, sy, s_z), (ex, ey, e_z))
    if obj:
        objects.append(obj)

    # Vertical posts
    num_posts = max(2, int(length / POST_SPACING) + 1)
    for i in range(num_posts):
        t = i / max(1, num_posts - 1)
        px = sx + t * dx
        py = sy + t * dy
        fz = z_at_t(t)

        post_bot = fz + 0.05  # Slightly above floor
        post_top = fz + TOP_RAIL_H + RAIL_RADIUS

        obj = create_tube(f"{name_prefix}_post{i}", (px, py, post_bot), (px, py, post_top))
        if obj:
            objects.append(obj)

    return objects


# === Step 4: Create all railing sections ===
# Walkway layout (Blender coords, Z-up):
# - South walkway: X:-12.50 to 3, Y:-23.35 to -20.65, floor Z:4.0
# - West walkway: X:-15.35 to -12.65, Y:-20.50 to 12, floor Z:4.0
# - East walkway: X:16.65 to 19.35, Y:-15 to 0, floor Z:4.0
# - Corner (SW): X:-15.50 to -12.50, Y:-23.50 to -20.50, floor Z:4.0
# - NW slope: X:-15.35 to -12.65, Y:12 to 18, floor from Z:4.0 to Z:0.0

WALK_FLOOR_Z = 4.0
all_objects = []

# --- South walkway rails ---
# Inner rail (north side, facing arena)
objs = create_railing_section("rail_S_in",
    (-12.50, -20.65), (3.0, -20.65), WALK_FLOOR_Z)
all_objects.extend(objs)
print(f"South inner rail: {len(objs)} objects")

# Outer rail (south side)
objs = create_railing_section("rail_S_out",
    (-14.0, -23.35), (3.0, -23.35), WALK_FLOOR_Z)
all_objects.extend(objs)
print(f"South outer rail: {len(objs)} objects")

# --- West walkway rails ---
# Inner rail (east side, facing arena)
objs = create_railing_section("rail_W_in",
    (-12.65, -20.50), (-12.65, 12.0), WALK_FLOOR_Z)
all_objects.extend(objs)
print(f"West inner rail: {len(objs)} objects")

# Outer rail (west side)
objs = create_railing_section("rail_W_out",
    (-15.35, -20.50), (-15.35, 12.0), WALK_FLOOR_Z)
all_objects.extend(objs)
print(f"West outer rail: {len(objs)} objects")

# --- East walkway rail ---
# Inner rail only (east walkway connects two buildings)
objs = create_railing_section("rail_E_in",
    (16.65, -15.0), (16.65, 0.0), WALK_FLOOR_Z)
all_objects.extend(objs)
print(f"East inner rail: {len(objs)} objects")

# --- Corner (SW) rails ---
# South side of corner
objs = create_railing_section("rail_corner_S",
    (-15.50, -23.35), (-14.0, -23.35), WALK_FLOOR_Z)
all_objects.extend(objs)
print(f"Corner south rail: {len(objs)} objects")

# West side of corner
objs = create_railing_section("rail_corner_W",
    (-15.35, -23.50), (-15.35, -20.50), WALK_FLOOR_Z)
all_objects.extend(objs)
print(f"Corner west rail: {len(objs)} objects")

# --- NW slope rails ---
# Slope goes from Y:12 (floor Z:4.0) to Y:18 (floor Z:0.0)
# Inner rail (east side)
objs = create_railing_section("rail_slope_in",
    (-12.65, 12.0), (-12.65, 18.0), 0,
    is_slope=True, slope_start_z=4.0, slope_end_z=0.0)
all_objects.extend(objs)
print(f"Slope inner rail: {len(objs)} objects")

# Outer rail (west side)
objs = create_railing_section("rail_slope_out",
    (-15.35, 12.0), (-15.35, 18.0), 0,
    is_slope=True, slope_start_z=4.0, slope_end_z=0.0)
all_objects.extend(objs)
print(f"Slope outer rail: {len(objs)} objects")

print(f"\nTotal railing objects created: {len(all_objects)}")

# === Step 5: Save and export ===
bpy.ops.wm.save_mainfile()
print("Saved blend file")

# Count totals
mesh_count = sum(1 for obj in bpy.data.objects if obj.type == 'MESH')
print(f"Total meshes in scene: {mesh_count}")

print("\n" + "="*60)
print("RAILING CONVERSION COMPLETE")
print("="*60)
