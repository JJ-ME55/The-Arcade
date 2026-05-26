"""
Build first-person arms as HINGED STATIC PIECES so the upper arm and forearm can
be rotated independently in-engine (no skeleton needed).

Per arm: an UPPER piece (shoulder+upper-arm) pivoting at the shoulder, and a LOWER
piece (forearm+hand+fingers) pivoting at the elbow, parented lower->upper. A 'HandR'
empty rides the lower-right piece for gun attachment.

Pipeline: import soldier.glb -> pose Rifle_Idle -> capture joint positions ->
isolate arms -> bake pose to static mesh -> bake to metres + recenter on right hand
-> split into 4 pieces -> set piece origins at the joints -> parent -> export.

Run: blender --background --python visual/blender/extract_fp_arms.py
"""
import bpy, os
from mathutils import Vector

OUT = "visual/fp_arms.glb"

def log(m): print("[fparms] " + m)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.abspath("visual/soldier.glb"))
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
mesh = max((o for o in bpy.data.objects if o.type == "MESH"), key=lambda m: len(m.data.vertices))

# Pose to Rifle_Idle
act = bpy.data.actions.get("Rifle_Idle")
if act:
    if not arm.animation_data:
        arm.animation_data_create()
    arm.animation_data.action = act
    bpy.context.scene.frame_set(int(act.frame_range[0]) + 10)
    bpy.context.view_layer.update()

def jw(name):
    pb = arm.pose.bones.get(name)
    return (arm.matrix_world @ pb.matrix).translation.copy() if pb else Vector((0, 0, 0))

# Joint world positions (posed), used for piece pivots.
joints = {
    "shoulder_R": jw("UpperArm.R"), "shoulder_L": jw("UpperArm.L"),
    "elbow_R": jw("ForeArm.R"),     "elbow_L": jw("ForeArm.L"),
    "wrist_R": jw("Hand.R"),        "wrist_L": jw("Hand.L"),
}
hand_world = jw("Hand.R")

# Drop extra meshes (visor etc.)
for o in [o for o in bpy.data.objects if o.type == "MESH" and o is not mesh]:
    bpy.data.objects.remove(o, do_unlink=True)

# ---- vertex-group sets per piece -------------------------------------------
def groups_for(side, part):
    handpfx = "RightHand" if side == "R" else "LeftHand"
    names = []
    for vg in mesh.vertex_groups:
        n = vg.name
        if part == "upper" and (n == "Shoulder." + side or n == "UpperArm." + side):
            names.append(n)
        if part == "fore" and (n == "ForeArm." + side):
            names.append(n)
        if part == "hand" and (n == "Hand." + side or n.startswith(handpfx)):
            names.append(n)
    return names

# Isolate ALL arm verts first (union of every piece), delete the rest.
all_groups = []
for s in ("R", "L"):
    all_groups += groups_for(s, "upper") + groups_for(s, "fore") + groups_for(s, "hand")
bpy.ops.object.select_all(action="DESELECT")
mesh.select_set(True)
bpy.context.view_layer.objects.active = mesh
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="DESELECT")
bpy.ops.object.mode_set(mode="OBJECT")
for n in all_groups:
    mesh.vertex_groups.active_index = mesh.vertex_groups[n].index
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.object.vertex_group_select(); bpy.ops.object.mode_set(mode="OBJECT")
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="INVERT")
bpy.ops.mesh.delete(type="VERT")
bpy.ops.object.mode_set(mode="OBJECT")

# Bake pose -> static mesh.
amod = next((m for m in mesh.modifiers if m.type == "ARMATURE"), None)
if amod:
    bpy.ops.object.modifier_apply(modifier=amod.name)

# Bake to metres (0.01 lives on parent) + recenter on the right hand.
bpy.ops.object.select_all(action="DESELECT"); mesh.select_set(True); bpy.context.view_layer.objects.active = mesh
bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for o in [o for o in bpy.data.objects if o is not mesh]:
    bpy.data.objects.remove(o, do_unlink=True)
mesh.location = (-hand_world.x, -hand_world.y, -hand_world.z)
bpy.ops.object.transform_apply(location=True)
# Joint positions in this final (recentered, metre) space:
jf = {k: (v - hand_world) for k, v in joints.items()}

# ---- split into 4 pieces by vertex group -----------------------------------
def separate_piece(src, group_names, new_name):
    bpy.ops.object.select_all(action="DESELECT")
    src.select_set(True); bpy.context.view_layer.objects.active = src
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="DESELECT"); bpy.ops.object.mode_set(mode="OBJECT")
    for n in group_names:
        if n in src.vertex_groups:
            src.vertex_groups.active_index = src.vertex_groups[n].index
            bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.object.vertex_group_select(); bpy.ops.object.mode_set(mode="OBJECT")
    before = set(bpy.data.objects)
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.separate(type="SELECTED"); bpy.ops.object.mode_set(mode="OBJECT")
    newo = next((o for o in bpy.data.objects if o not in before), None)
    if newo:
        newo.name = new_name
    return newo

hand_R = separate_piece(mesh, groups_for("R", "hand"), "FP_hand_R")
hand_L = separate_piece(mesh, groups_for("L", "hand"), "FP_hand_L")
fore_R = separate_piece(mesh, groups_for("R", "fore"), "FP_fore_R")
fore_L = separate_piece(mesh, groups_for("L", "fore"), "FP_fore_L")
upper_R = separate_piece(mesh, groups_for("R", "upper"), "FP_upper_R")
mesh.name = "FP_upper_L"  # remainder
upper_L = mesh
log("pieces: upR=%s foR=%s haR=%s upL=%s foL=%s haL=%s" % (
    upper_R and upper_R.name, fore_R and fore_R.name, hand_R and hand_R.name,
    upper_L and upper_L.name, fore_L and fore_L.name, hand_L and hand_L.name))

# ---- set each piece origin to its joint (pivot) ----------------------------
def set_origin(obj, point):
    if not obj:
        return
    bpy.context.scene.cursor.location = point
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True); bpy.context.view_layer.objects.active = obj
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")

set_origin(upper_R, jf["shoulder_R"]); set_origin(upper_L, jf["shoulder_L"])
set_origin(fore_R, jf["elbow_R"]);     set_origin(fore_L, jf["elbow_L"])
set_origin(hand_R, jf["wrist_R"]);     set_origin(hand_L, jf["wrist_L"])

# ---- parent hand -> fore -> upper (hinges at wrist, elbow, shoulder) --------
def parent_to(child, parent):
    if not child or not parent:
        return
    bpy.ops.object.select_all(action="DESELECT")
    child.select_set(True); parent.select_set(True)
    bpy.context.view_layer.objects.active = parent
    bpy.ops.object.parent_set(type="OBJECT", keep_transform=True)

parent_to(fore_R, upper_R); parent_to(fore_L, upper_L)
parent_to(hand_R, fore_R); parent_to(hand_L, fore_L)

# HandR empty (gun mount) at the wrist, parented to the right HAND piece.
empty = bpy.data.objects.new("HandR", None)
empty.empty_display_size = 0.05
bpy.context.scene.collection.objects.link(empty)
empty.location = (0, 0, 0)
if hand_R:
    bpy.ops.object.select_all(action="DESELECT")
    empty.select_set(True); hand_R.select_set(True); bpy.context.view_layer.objects.active = hand_R
    bpy.ops.object.parent_set(type="OBJECT", keep_transform=True)

bpy.ops.object.select_all(action="SELECT")
abs_out = os.path.abspath(OUT)
bpy.ops.export_scene.gltf(filepath=abs_out, export_format="GLB", use_selection=True, export_yup=True)
log("exported %s (%d bytes)" % (abs_out, os.path.getsize(abs_out)))
log("DONE")
