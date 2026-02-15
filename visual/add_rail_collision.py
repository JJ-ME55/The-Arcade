"""
Add invisible collision walls at railing positions.
The cylindrical railings (0.04m radius) are too thin for reliable Octree
collision. These walls provide solid collision barriers.
Uses a 'Collision' material that export_glb.py renders as invisible.
Run with: blender --background arena_map.blend --python add_rail_collision.py
"""

import bpy
import bmesh
import mathutils

print("\n" + "="*60)
print("ADD RAILING COLLISION WALLS")
print("="*60)

# Create collision material (will be made invisible in export)
mat_name = "Collision"
mat = bpy.data.materials.get(mat_name)
if not mat:
    mat = bpy.data.materials.new(name=mat_name)
mat.use_nodes = True
mat.node_tree.nodes.clear()
bsdf = mat.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
bsdf.inputs['Base Color'].default_value = (0.5, 0.5, 0.5, 1.0)
bsdf.inputs['Alpha'].default_value = 0.0
output = mat.node_tree.nodes.new('ShaderNodeOutputMaterial')
mat.node_tree.links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])
mat.blend_method = 'CLIP' if hasattr(mat, 'blend_method') else None
print(f"Created material: {mat_name}")

WALL_THICK = 0.08  # 8cm thick walls (enough for collision)
RAIL_H = 1.10      # Height from floor to just above top rail
WALK_Z = 4.15      # Top of walkway floor surface

def create_box(name, x1, y1, z1, x2, y2, z2):
    """Create a box mesh between two corner points."""
    bm = bmesh.new()
    verts = [
        bm.verts.new((x1, y1, z1)),
        bm.verts.new((x2, y1, z1)),
        bm.verts.new((x2, y2, z1)),
        bm.verts.new((x1, y2, z1)),
        bm.verts.new((x1, y1, z2)),
        bm.verts.new((x2, y1, z2)),
        bm.verts.new((x2, y2, z2)),
        bm.verts.new((x1, y2, z2)),
    ]
    bm.faces.new([verts[3], verts[2], verts[1], verts[0]])
    bm.faces.new([verts[4], verts[5], verts[6], verts[7]])
    bm.faces.new([verts[0], verts[1], verts[5], verts[4]])
    bm.faces.new([verts[2], verts[3], verts[7], verts[6]])
    bm.faces.new([verts[3], verts[0], verts[4], verts[7]])
    bm.faces.new([verts[1], verts[2], verts[6], verts[5]])

    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(mat)
    bpy.context.scene.collection.objects.link(obj)
    return obj

def create_slope_wall(name, x, y_start, y_end, z_top_start, z_top_end):
    """Create a wall that follows a slope. Wall goes from floor to RAIL_H above floor."""
    bm = bmesh.new()
    t = WALL_THICK / 2

    # Bottom-left (start, low)
    v0 = bm.verts.new((x - t, y_start, z_top_start))
    v1 = bm.verts.new((x + t, y_start, z_top_start))
    v2 = bm.verts.new((x + t, y_start, z_top_start + RAIL_H))
    v3 = bm.verts.new((x - t, y_start, z_top_start + RAIL_H))

    # Bottom-right (end, low)
    v4 = bm.verts.new((x - t, y_end, z_top_end))
    v5 = bm.verts.new((x + t, y_end, z_top_end))
    v6 = bm.verts.new((x + t, y_end, z_top_end + RAIL_H))
    v7 = bm.verts.new((x - t, y_end, z_top_end + RAIL_H))

    bm.faces.new([v3, v2, v1, v0])  # Start face
    bm.faces.new([v4, v5, v6, v7])  # End face
    bm.faces.new([v0, v1, v5, v4])  # Bottom
    bm.faces.new([v2, v3, v7, v6])  # Top
    bm.faces.new([v3, v0, v4, v7])  # Left (-X)
    bm.faces.new([v1, v2, v6, v5])  # Right (+X)

    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(mat)
    bpy.context.scene.collection.objects.link(obj)
    return obj

T = WALL_THICK / 2
count = 0

# --- Flat walkway collision walls ---

# South inner rail: Y:-20.65, X:-12.50 to 3.0
create_box("rcol_S_in", -12.50, -20.65 - T, WALK_Z, 3.0, -20.65 + T, WALK_Z + RAIL_H)
count += 1

# South outer rail: Y:-23.35, X:-14.0 to 3.0
create_box("rcol_S_out", -14.0, -23.35 - T, WALK_Z, 3.0, -23.35 + T, WALK_Z + RAIL_H)
count += 1

# West inner rail: X:-12.65, Y:-20.50 to 12.0
create_box("rcol_W_in", -12.65 - T, -20.50, WALK_Z, -12.65 + T, 12.0, WALK_Z + RAIL_H)
count += 1

# West outer rail: X:-15.35, Y:-20.50 to 12.0
create_box("rcol_W_out", -15.35 - T, -20.50, WALK_Z, -15.35 + T, 12.0, WALK_Z + RAIL_H)
count += 1

# East inner rail: X:16.65, Y:-15.0 to 0.0
create_box("rcol_E_in", 16.65 - T, -15.0, WALK_Z, 16.65 + T, 0.0, WALK_Z + RAIL_H)
count += 1

# Corner south: Y:-23.35, X:-15.50 to -14.0
create_box("rcol_corner_S", -15.50, -23.35 - T, WALK_Z, -14.0, -23.35 + T, WALK_Z + RAIL_H)
count += 1

# Corner west: X:-15.35, Y:-23.50 to -20.50
create_box("rcol_corner_W", -15.35 - T, -23.50, WALK_Z, -15.35 + T, -20.50, WALK_Z + RAIL_H)
count += 1

# --- Slope collision walls ---
# Slope goes from (Y:12, Z:4.15) to (Y:21, Z:0.0)

# Slope inner: X:-12.65
create_slope_wall("rcol_slope_in", -12.65, 12.0, 21.0, WALK_Z, 0.0)
count += 1

# Slope outer: X:-15.35
create_slope_wall("rcol_slope_out", -15.35, 12.0, 21.0, WALK_Z, 0.0)
count += 1

print(f"\nCreated {count} collision walls")

# Also delete old _top rail boxes that are redundant now
old_tops = []
for obj in list(bpy.data.objects):
    if obj.type != 'MESH':
        continue
    if obj.name.endswith('_top') and ('rail' in obj.name.lower() or 'Walk_' in obj.name):
        if 'rcol' not in obj.name and 'rail_' not in obj.name.split('_top')[0][-4:]:
            # Only delete Walk_*_rail_*_top objects
            if obj.name.startswith('Walk_'):
                old_tops.append(obj.name)
                bpy.data.objects.remove(obj, do_unlink=True)

if old_tops:
    print(f"Deleted {len(old_tops)} old rail top boxes: {old_tops}")

# Save
bpy.ops.wm.save_mainfile()
print("\nSaved blend file")

mesh_count = sum(1 for obj in bpy.data.objects if obj.type == 'MESH')
print(f"Total meshes: {mesh_count}")

print("\n" + "="*60)
print("COLLISION WALLS COMPLETE")
print("="*60)
