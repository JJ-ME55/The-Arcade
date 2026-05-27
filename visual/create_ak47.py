"""
AK-47 Model Generator for FPS Game
Run in Blender: File > Scripting tab > Open > Run Script
Exports to visual/rifle.glb (replaces existing)

Scale: 1 unit = 1 meter (real-world AK-47 dimensions)
Orientation: Barrel along +X axis (game rotates -90deg Y to face -Z forward)
Origin: Pistol grip (Hand.R bone attachment point)
"""
import bpy
import bmesh
import math

EXPORT_PATH = "C:/Users/jacob/fps-staking-game/visual/rifle.glb"
BLEND_PATH  = "C:/Users/jacob/fps-staking-game/visual/ak47.blend"

# ============================================================
# Scene Setup
# ============================================================
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()
for m in list(bpy.data.meshes):
    bpy.data.meshes.remove(m)
for m in list(bpy.data.materials):
    bpy.data.materials.remove(m)

# ============================================================
# Materials (solid colors for GLB export compatibility)
# ============================================================
def make_mat(name, color, metallic, roughness):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    return mat

M = make_mat("GunMetal", (0.06, 0.06, 0.07), 0.92, 0.28)
W = make_mat("Wood",     (0.28, 0.12, 0.05), 0.0,  0.65)

# ============================================================
# Geometry Helpers
# ============================================================
all_objects = []

def add_box(name, cx, cy, cz, sx, sy, sz, mat):
    """Box at center (cx,cy,cz) with full dimensions (sx,sy,sz)"""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x = cx + v.co.x * sx
        v.co.y = cy + v.co.y * sy
        v.co.z = cz + v.co.z * sz
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    all_objects.append(obj)
    return obj

def add_cyl_x(name, x1, x2, y, z, r, mat, seg=12):
    """Cylinder along X axis"""
    bm = bmesh.new()
    length = abs(x2 - x1)
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False,
                          segments=seg, radius1=r, radius2=r, depth=length)
    cx = (x1 + x2) / 2
    for v in bm.verts:
        ox, oy, oz = v.co.x, v.co.y, v.co.z
        v.co.x = oz + cx   # Z->X (length axis)
        v.co.y = oy + y    # Y stays
        v.co.z = -ox + z   # -X->Z (radial)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    for p in obj.data.polygons:
        p.use_smooth = True
    all_objects.append(obj)
    return obj

def add_cyl_z(name, z1, z2, x, y, r, mat, seg=12):
    """Cylinder along Z axis"""
    bm = bmesh.new()
    length = abs(z2 - z1)
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False,
                          segments=seg, radius1=r, radius2=r, depth=length)
    cz = (z1 + z2) / 2
    for v in bm.verts:
        v.co.x += x
        v.co.y += y
        v.co.z += cz
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    for p in obj.data.polygons:
        p.use_smooth = True
    all_objects.append(obj)
    return obj

def add_lofted(name, sections, mat, smooth=True, nverts=4):
    """Lofted shape from cross-sections: [(cx, cz, half_h, half_w), ...]
    nverts=4 for rectangle, nverts=8 for octagon (better shape fidelity with smooth shading)
    """
    bm = bmesh.new()
    rings = []
    for sx, sz, sh, sw in sections:
        ring = []
        if nverts == 4:
            for dh, dw in [(-sh, -sw), (sh, -sw), (sh, sw), (-sh, sw)]:
                ring.append(bm.verts.new((sx, dw, sz + dh)))
        else:
            # 8-vert rounded rectangle: corners + edge midpoints
            # Order: bottom, bottom-right, right, top-right, top, top-left, left, bottom-left
            c = 0.707  # corner chamfer factor (cos 45)
            points = [
                (0, -sw),           # bottom-center
                (sh * c, -sw * c),  # bottom-right corner
                (sh, 0),            # right-center
                (sh * c, sw * c),   # top-right corner
                (0, sw),            # top-center
                (-sh * c, sw * c),  # top-left corner
                (-sh, 0),           # left-center
                (-sh * c, -sw * c), # bottom-left corner
            ]
            for dz, dy in points:
                ring.append(bm.verts.new((sx, dy, sz + dz)))
        rings.append(ring)
    bm.verts.ensure_lookup_table()
    nv = len(rings[0])
    for i in range(len(rings) - 1):
        a, b = rings[i], rings[i + 1]
        for j in range(nv):
            jn = (j + 1) % nv
            bm.faces.new([a[j], a[jn], b[jn], b[j]])
    bm.faces.new(rings[0])
    bm.faces.new(list(reversed(rings[-1])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    for p in obj.data.polygons:
        p.use_smooth = smooth
    all_objects.append(obj)
    return obj

# ============================================================
# Build AK-47 Components
# Origin at pistol grip: (0, 0, 0)
# +X = barrel, +Z = up, +Y = left side
# ============================================================

# ---- RECEIVER (stamped steel body) ----
add_box("Receiver",       0.07, 0, 0.035,   0.24, 0.036, 0.048, M)
add_box("ReceiverBottom", 0.07, 0, 0.007,   0.24, 0.034, 0.008, M)

# ---- DUST COVER ----
add_box("DustCover",       0.06, 0, 0.064,     0.18, 0.028, 0.010, M)
add_box("DustCoverRidgeL", 0.06, 0.013, 0.064, 0.16, 0.003, 0.012, M)
add_box("DustCoverRidgeR", 0.06,-0.013, 0.064, 0.16, 0.003, 0.012, M)

# ---- TRUNNIONS ----
add_box("RearTrunnion",  -0.055, 0, 0.038,  0.015, 0.040, 0.055, M)
add_box("FrontTrunnion",  0.195, 0, 0.038,  0.015, 0.040, 0.050, M)

# ---- BARREL ----
add_cyl_x("Barrel",     0.20, 0.47, 0, 0.035, 0.006, M, 12)
add_cyl_x("BarrelBase", 0.19, 0.24, 0, 0.035, 0.009, M, 12)

# ---- GAS SYSTEM ----
add_cyl_x("GasTube",  0.21, 0.42, 0, 0.058, 0.005, M, 10)
add_box("GasBlock",    0.21, 0, 0.046,  0.016, 0.028, 0.034, M)

# ---- HANDGUARDS (wood) ----
add_cyl_x("LowerHandguard", 0.23, 0.39, 0, 0.026, 0.019, W, 14)
add_cyl_x("UpperHandguard", 0.23, 0.39, 0, 0.063, 0.014, W, 14)
# Metal ferrules at handguard ends
add_box("FerruleFront", 0.393, 0, 0.045,  0.008, 0.036, 0.048, M)
add_box("FerruleRear",  0.225, 0, 0.045,  0.008, 0.036, 0.048, M)

# ---- FRONT SIGHT ----
add_box("FSBlock",   0.425, 0, 0.047,       0.014, 0.022, 0.038, M)
add_cyl_z("FSPost",  0.067, 0.10, 0.425, 0, 0.0015, M, 6)
add_box("FSEarL",    0.425, 0.007, 0.092,   0.003, 0.003, 0.022, M)
add_box("FSEarR",    0.425,-0.007, 0.092,   0.003, 0.003, 0.022, M)
add_box("FSBridge",  0.425, 0, 0.104,       0.003, 0.017, 0.003, M)

# ---- REAR SIGHT ----
add_box("RSBlock", 0.04, 0, 0.073,  0.018, 0.026, 0.008, M)
add_box("RSLeaf",  0.04, 0, 0.081,  0.014, 0.022, 0.008, M)

# ---- MUZZLE BRAKE ----
add_cyl_x("MuzzleBrake", 0.46, 0.50, 0, 0.035, 0.009, M, 12)

# ---- CLEANING ROD (below barrel) ----
add_cyl_x("CleaningRod", 0.22, 0.43, 0, 0.016, 0.002, M, 8)

# ---- MAGAZINE (curved banana mag - proper arc) ----
def build_magazine(bm):
    hw = 0.018   # half-width Y  (36mm total, was 28mm)
    hd = 0.014   # half-depth X  (28mm total, was 22mm)
    R = 0.40     # curve radius (tighter = more banana)
    mag_len = 0.225  # total magazine length
    n = 11       # cross-sections for smooth curve

    sections = []
    for i in range(n):
        t = i / (n - 1)
        theta = t * (mag_len / R)
        # Arc: top is vertical, curves backward as it goes down
        cx = 0.09 - R * (1 - math.cos(theta))
        cz = 0.005 - R * math.sin(theta)
        ang = -theta  # tangent angle
        sections.append((cx, cz, ang))

    rings = []
    for cx, cz, ang in sections:
        ca, sa = math.cos(ang), math.sin(ang)
        ring = []
        # 6-sided cross-section for rounder magazine shape
        points_2d = [
            (-hd,      -hw * 0.7),
            (-hd * 0.5, -hw),
            ( hd * 0.5, -hw),
            ( hd,       -hw * 0.7),
            ( hd,        hw * 0.7),
            ( hd * 0.5,  hw),
            (-hd * 0.5,  hw),
            (-hd,        hw * 0.7),
        ]
        for dx, dy in points_2d:
            x = cx + dx * ca
            z = cz - dx * sa
            ring.append(bm.verts.new((x, dy, z)))
        rings.append(ring)
    bm.verts.ensure_lookup_table()
    nv = len(rings[0])
    for i in range(len(rings) - 1):
        t, b = rings[i], rings[i + 1]
        for j in range(nv):
            jn = (j + 1) % nv
            bm.faces.new([t[j], t[jn], b[jn], b[j]])
    bm.faces.new(rings[0])
    bm.faces.new(list(reversed(rings[-1])))

bm_mag = bmesh.new()
build_magazine(bm_mag)
bmesh.ops.recalc_face_normals(bm_mag, faces=bm_mag.faces[:])
mag_mesh = bpy.data.meshes.new("Magazine")
bm_mag.to_mesh(mag_mesh)
bm_mag.free()
mag_obj = bpy.data.objects.new("Magazine", mag_mesh)
bpy.context.collection.objects.link(mag_obj)
mag_obj.data.materials.append(M)
for p in mag_obj.data.polygons:
    p.use_smooth = True
all_objects.append(mag_obj)

# Base plate at arc bottom
_theta_end = 0.225 / 0.40
_bp_x = 0.09 - 0.40 * (1 - math.cos(_theta_end))
_bp_z = 0.005 - 0.40 * math.sin(_theta_end) - 0.008
add_box("MagBasePlate", _bp_x, 0, _bp_z, 0.030, 0.040, 0.010, M)

# ---- STOCK (wooden, thick solid shape) ----
# 8-vert cross-sections for proper rectangular look, flat shading for wood
add_lofted("Stock", [
    #   x       z_center  half_h  half_w
    (-0.055,  0.035,    0.025,  0.019),   # Receiver junction
    (-0.08,   0.030,    0.022,  0.016),   # Wrist (narrower)
    (-0.11,   0.022,    0.030,  0.022),   # Widening
    (-0.15,   0.010,    0.035,  0.025),   # Main body
    (-0.20,  -0.002,    0.038,  0.026),   # Full thickness
    (-0.25,  -0.012,    0.038,  0.026),   # Full thickness
    (-0.30,  -0.020,    0.036,  0.025),   # Tapering to butt
    (-0.35,  -0.026,    0.032,  0.023),   # Near butt
    (-0.39,  -0.028,    0.028,  0.022),   # Butt end
], W, smooth=False, nverts=8)
add_box("ButtPlate", -0.395, 0, -0.028, 0.008, 0.044, 0.056, M)

# ---- PISTOL GRIP (wooden, thicker) ----
add_lofted("PistolGrip", [
    ( 0.005,  0.008, 0.014, 0.016),  # Top at receiver
    ( 0.000, -0.010, 0.016, 0.018),
    (-0.005, -0.030, 0.018, 0.019),
    (-0.010, -0.050, 0.019, 0.019),  # Widest
    (-0.013, -0.070, 0.018, 0.018),
    (-0.015, -0.090, 0.016, 0.016),
    (-0.013, -0.105, 0.013, 0.014),  # Bottom
], W, smooth=False, nverts=8)
add_box("GripCap", -0.013, 0, -0.112, 0.028, 0.030, 0.006, M)

# ---- TRIGGER GUARD ----
add_box("TGBottom", 0.02, 0, -0.032,  0.060, 0.005, 0.004, M)
add_box("TGFront",  0.048, 0, -0.016, 0.004, 0.005, 0.036, M)
add_box("TGRear",  -0.008, 0, -0.010, 0.004, 0.005, 0.028, M)

# ---- TRIGGER ----
add_box("Trigger", 0.02, 0, -0.010, 0.004, 0.004, 0.018, M)

# ---- SELECTOR LEVER (right side) ----
add_box("Selector", 0.03, -0.020, 0.048, 0.032, 0.003, 0.010, M)

# ---- CHARGING HANDLE (right side) ----
add_box("ChargHandle", 0.10, -0.020, 0.065, 0.012, 0.008, 0.006, M)

# ============================================================
# Join All Into One Object
# ============================================================
bpy.ops.object.select_all(action='DESELECT')
for obj in all_objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = all_objects[0]
bpy.ops.object.join()

ak = bpy.context.active_object
ak.name = "AK47"

# Set origin to pistol grip (cursor at 0,0,0)
bpy.context.scene.cursor.location = (0, 0, 0)
bpy.ops.object.origin_set(type='ORIGIN_CURSOR')

# ============================================================
# Export
# ============================================================
bpy.ops.export_scene.gltf(
    filepath=EXPORT_PATH,
    export_format='GLB',
    use_selection=True,
    export_yup=True,
    export_apply=True,
)

# Save .blend file too
bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)

print(f"AK-47 exported to {EXPORT_PATH}")
print(f"Blend saved to {BLEND_PATH}")
print(f"Verts: {len(ak.data.vertices)}, Faces: {len(ak.data.polygons)}")
