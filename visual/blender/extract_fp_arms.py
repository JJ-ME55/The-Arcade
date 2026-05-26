"""
Build realistic first-person arms by extracting the soldier's arms (in the
Rifle_Idle hold pose) and baking them to a static mesh.

Pipeline:
  1. Import soldier.glb (renamed bones + Rifle_Idle clip).
  2. Pose the armature to Rifle_Idle.
  3. Isolate the arm vertices (shoulder->hand + fingers, both sides); delete the rest.
  4. Apply the armature modifier to bake the pose into a static mesh.
  5. Add a 'HandR' empty at the posed right-hand position (gun attaches here).
  6. Export visual/fp_arms.glb.

Run: blender --background --python visual/blender/extract_fp_arms.py
"""
import bpy, os, re
from mathutils import Vector

OUT = "visual/fp_arms.glb"
ARM_RE = re.compile(r"Shoulder|Arm|Hand|Thumb|Index|Middle|Ring|Pinky", re.I)

def log(m): print("[fparms] " + m)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.abspath("visual/soldier.glb"))

arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
mesh = max((o for o in bpy.data.objects if o.type == "MESH"), key=lambda m: len(m.data.vertices))
log("armature=%s mesh=%s verts=%d" % (arm.name, mesh.name, len(mesh.data.vertices)))

# Pose to Rifle_Idle
act = bpy.data.actions.get("Rifle_Idle")
if act:
    if not arm.animation_data:
        arm.animation_data_create()
    arm.animation_data.action = act
    bpy.context.scene.frame_set(int(act.frame_range[0]) + 10)
    bpy.context.view_layer.update()
    log("posed to Rifle_Idle @ frame %d" % (int(act.frame_range[0]) + 10))

# Capture the posed right-hand world position BEFORE we bake/delete.
hand_pb = arm.pose.bones.get("Hand.R") or arm.pose.bones.get("HandR")
hand_world = (arm.matrix_world @ hand_pb.matrix).translation.copy() if hand_pb else Vector((0, 0, 0))

# Remove the other (non-skinned/extra) meshes; keep only the main body mesh.
for o in [o for o in bpy.data.objects if o.type == "MESH" and o is not mesh]:
    bpy.data.objects.remove(o, do_unlink=True)

# Select arm vertices by vertex group, invert, delete the rest.
keep_groups = [vg.name for vg in mesh.vertex_groups if ARM_RE.search(vg.name)]
log("keep groups (%d): %s" % (len(keep_groups), keep_groups))
bpy.ops.object.select_all(action="DESELECT")
mesh.select_set(True)
bpy.context.view_layer.objects.active = mesh
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="DESELECT")
bpy.ops.object.mode_set(mode="OBJECT")
for n in keep_groups:
    mesh.vertex_groups.active_index = mesh.vertex_groups[n].index
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.object.vertex_group_select()
    bpy.ops.object.mode_set(mode="OBJECT")
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="INVERT")
bpy.ops.mesh.delete(type="VERT")
bpy.ops.object.mode_set(mode="OBJECT")
log("arm mesh verts after isolate = %d" % len(mesh.data.vertices))

# Bake the pose into the mesh (apply the Armature modifier) -> static posed arms.
amod = next((m for m in mesh.modifiers if m.type == "ARMATURE"), None)
if amod:
    bpy.ops.object.modifier_apply(modifier=amod.name)
    log("applied armature modifier (pose baked)")

# Drop the armature and any leftover leaf-bone/empty nodes — keep only the mesh.
for o in [o for o in bpy.data.objects if o is not mesh]:
    bpy.data.objects.remove(o, do_unlink=True)

# Bake the mesh to world-metre coordinates (it was cm under the 0.01 node scale).
bpy.ops.object.select_all(action="DESELECT")
mesh.select_set(True)
bpy.context.view_layer.objects.active = mesh
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# Recenter so the (posed) right hand sits at the origin — the FP system then
# positions the hand via the weapon group, and the gun attaches at HandR=origin.
mesh.location = (-hand_world.x, -hand_world.y, -hand_world.z)
bpy.ops.object.transform_apply(location=True)

# HandR empty at origin for gun attachment.
empty = bpy.data.objects.new("HandR", None)
empty.empty_display_size = 0.05
bpy.context.scene.collection.objects.link(empty)
empty.location = (0, 0, 0)
log("recentered on hand (was at %s)" % (tuple(round(c, 3) for c in hand_world),))

# Export
bpy.ops.object.select_all(action="SELECT")
abs_out = os.path.abspath(OUT)
bpy.ops.export_scene.gltf(filepath=abs_out, export_format="GLB", use_selection=True, export_yup=True)
log("exported %s (%d bytes)" % (abs_out, os.path.getsize(abs_out)))
log("DONE")
