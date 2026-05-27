"""
Convert west walkway underside into a corridor:
1. Remove support columns under west walkway
2. Add solid west wall (ground to walkway floor)
3. Add east wall with two doorway entrances
Run with: blender --background arena_map.blend --python make_corridor.py
"""

import bpy
import bmesh
import mathutils

print("\n" + "="*60)
print("WEST WALKWAY CORRIDOR CONVERSION")
print("="*60)

# === Step 1: Find and delete west walkway columns ===
# West walkway columns have names like Walk_col_W_* and Walk_col_corner
deleted_cols = []
for obj in list(bpy.data.objects):
    if obj.type != 'MESH':
        continue
    name = obj.name
    # Delete west walkway columns (Walk_col_W_*) and corner column
    if name.startswith('Walk_col_W_') or name == 'Walk_col_corner':
        deleted_cols.append(name)
        bpy.data.objects.remove(obj, do_unlink=True)

print(f"Deleted {len(deleted_cols)} columns: {deleted_cols}")

# === Step 2: Define corridor geometry ===
# West walkway: X: -15.50 to -12.50, Y: -20.50 to 12.00, floor Z: 3.85-4.15
# Corridor walls: ground (Z:0) to walkway floor (Z:3.85)
# Wall thickness: 0.25 units

WALL_THICK = 0.25
CORR_WEST_X = -15.50   # West edge of walkway
CORR_EAST_X = -12.50   # East edge of walkway
CORR_Y_START = -20.50  # South end
CORR_Y_END = 12.00     # North end
FLOOR_Z = 0.0
CEIL_Z = 3.85          # Walkway floor underside

# Doorway dimensions
DOOR_HEIGHT = 2.5       # Door opening height
DOOR_WIDTH = 3.0        # Door opening width

# Two doorways on east wall, evenly distributed
DOOR1_Y_START = -14.0
DOOR1_Y_END = DOOR1_Y_START + DOOR_WIDTH  # -14 to -11
DOOR2_Y_START = 1.0
DOOR2_Y_END = DOOR2_Y_START + DOOR_WIDTH  # 1 to 4

mat_O = bpy.data.materials.get('O')

def create_box(name, x1, y1, z1, x2, y2, z2, material=None):
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

    # Bottom
    bm.faces.new([verts[3], verts[2], verts[1], verts[0]])
    # Top
    bm.faces.new([verts[4], verts[5], verts[6], verts[7]])
    # Front (-Y)
    bm.faces.new([verts[0], verts[1], verts[5], verts[4]])
    # Back (+Y)
    bm.faces.new([verts[2], verts[3], verts[7], verts[6]])
    # Left (-X)
    bm.faces.new([verts[3], verts[0], verts[4], verts[7]])
    # Right (+X)
    bm.faces.new([verts[1], verts[2], verts[6], verts[5]])

    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new(name, mesh)
    if material:
        obj.data.materials.append(material)
    bpy.context.scene.collection.objects.link(obj)

    return obj

# === Step 3: Create west wall (solid, full length) ===
print("\nCreating west corridor wall...")
create_box("Corr_wall_W",
    CORR_WEST_X, CORR_Y_START, FLOOR_Z,
    CORR_WEST_X + WALL_THICK, CORR_Y_END, CEIL_Z,
    material=mat_O)
print(f"  West wall: X:{CORR_WEST_X:.1f}, Y:{CORR_Y_START:.1f} to {CORR_Y_END:.1f}, Z:{FLOOR_Z:.1f} to {CEIL_Z:.1f}")

# === Step 4: Create east wall with two doorways ===
print("\nCreating east corridor wall with doorways...")

# East wall X position (inner face faces the corridor, outer faces arena)
EW_X1 = CORR_EAST_X - WALL_THICK  # -12.75
EW_X2 = CORR_EAST_X               # -12.50

# Section 1: South of door 1 (full height)
create_box("Corr_wall_E_sec1",
    EW_X1, CORR_Y_START, FLOOR_Z,
    EW_X2, DOOR1_Y_START, CEIL_Z,
    material=mat_O)
print(f"  East section 1: Y:{CORR_Y_START:.1f} to {DOOR1_Y_START:.1f} (solid)")

# Door 1 lintel (above door opening)
create_box("Corr_wall_E_lintel1",
    EW_X1, DOOR1_Y_START, DOOR_HEIGHT,
    EW_X2, DOOR1_Y_END, CEIL_Z,
    material=mat_O)
print(f"  Door 1: Y:{DOOR1_Y_START:.1f} to {DOOR1_Y_END:.1f}, opening Z:0 to {DOOR_HEIGHT:.1f}")

# Section 2: Between door 1 and door 2 (full height)
create_box("Corr_wall_E_sec2",
    EW_X1, DOOR1_Y_END, FLOOR_Z,
    EW_X2, DOOR2_Y_START, CEIL_Z,
    material=mat_O)
print(f"  East section 2: Y:{DOOR1_Y_END:.1f} to {DOOR2_Y_START:.1f} (solid)")

# Door 2 lintel (above door opening)
create_box("Corr_wall_E_lintel2",
    EW_X1, DOOR2_Y_START, DOOR_HEIGHT,
    EW_X2, DOOR2_Y_END, CEIL_Z,
    material=mat_O)
print(f"  Door 2: Y:{DOOR2_Y_START:.1f} to {DOOR2_Y_END:.1f}, opening Z:0 to {DOOR_HEIGHT:.1f}")

# Section 3: North of door 2 (full height)
create_box("Corr_wall_E_sec3",
    EW_X1, DOOR2_Y_END, FLOOR_Z,
    EW_X2, CORR_Y_END, CEIL_Z,
    material=mat_O)
print(f"  East section 3: Y:{DOOR2_Y_END:.1f} to {CORR_Y_END:.1f} (solid)")

# === Step 5: Add a floor inside the corridor ===
# (The main floor already exists, but just in case there's a gap)
# Skip - the main floor should already cover this area

# === Step 6: Save ===
bpy.ops.wm.save_mainfile()
print("\nSaved blend file")

mesh_count = sum(1 for obj in bpy.data.objects if obj.type == 'MESH')
print(f"Total meshes: {mesh_count}")

print("\n" + "="*60)
print("CORRIDOR CONVERSION COMPLETE")
print("="*60)
