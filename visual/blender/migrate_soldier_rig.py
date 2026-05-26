"""
Migrate a Mixamo-rigged soldier to the project's custom 19-bone naming so the
existing procedural animation system in src/player-model.js drives it unchanged.

Phase 4.1, plan 01 (Option A: rename + bake neutral rest pose).

Pipeline:
  1. Import source (GLB stand-in soldier_proto.glb, or licensed Mixamo FBX).
  2. Apply scale; verify ~1.8m tall (FBX is cm-scale; GLB usually already correct).
  3. Strip 'mixamorig:' prefix, apply RENAME_MAP to the 18 deform bones + Root.
  4. Spine2 -> Chest2 (rename-ignored: a name player-model.js never references).
  5. Pose arms down to a neutral hang, then Apply Pose as Rest Pose (zeros rotations).
  6. Export visual/soldier.glb (skins, Y-up, no animations).
  7. Render a workbench preview PNG for visual verification.

Run headless:
  blender --background --python visual/blender/migrate_soldier_rig.py -- \
      <input_path> <output_glb> <preview_png> <arm_deg>
"""
import bpy
import sys
import os
from mathutils import Euler
from math import radians

# ---- args after '--' --------------------------------------------------------
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
SRC      = argv[0] if len(argv) > 0 else "visual/soldier_proto.glb"
OUT_GLB  = argv[1] if len(argv) > 1 else "visual/soldier.glb"
PREVIEW  = argv[2] if len(argv) > 2 else "visual/soldier_preview.png"
ARM_DEG  = float(argv[3]) if len(argv) > 3 else 70.0  # degrees to swing arms down from T-pose

RENAME_MAP = {
    "Hips": "Root",
    "Spine": "Spine",
    "Spine1": "Chest",
    "Spine2": "Chest2",          # rename-ignored (no reweight)
    "Neck": "Neck",
    "Head": "Head",
    "LeftShoulder": "Shoulder.L",  "RightShoulder": "Shoulder.R",
    "LeftArm": "UpperArm.L",       "RightArm": "UpperArm.R",
    "LeftForeArm": "ForeArm.L",    "RightForeArm": "ForeArm.R",
    "LeftHand": "Hand.L",          "RightHand": "Hand.R",
    "LeftUpLeg": "Thigh.L",        "RightUpLeg": "Thigh.R",
    "LeftLeg": "Shin.L",           "RightLeg": "Shin.R",
    "LeftFoot": "Foot.L",          "RightFoot": "Foot.R",
}

def log(m): print("[migrate] " + m)

# ---- clean scene ------------------------------------------------------------
bpy.ops.wm.read_factory_settings(use_empty=True)

abs_src = os.path.abspath(SRC)
log("importing %s" % abs_src)
ext = os.path.splitext(abs_src)[1].lower()
if ext == ".glb" or ext == ".gltf":
    bpy.ops.import_scene.gltf(filepath=abs_src)
elif ext == ".fbx":
    bpy.ops.import_scene.fbx(filepath=abs_src, automatic_bone_orientation=True)
else:
    raise RuntimeError("Unsupported source extension: " + ext)

# ---- locate armature + meshes ----------------------------------------------
armature = next((o for o in bpy.data.objects if o.type == "ARMATURE"), None)
if armature is None:
    raise RuntimeError("No armature found in import")
all_meshes = [o for o in bpy.data.objects if o.type == "MESH"]
# keep only meshes skinned to our armature; drop junk (e.g. proto's Icosphere)
meshes = []
for m in all_meshes:
    skinned = any(mod.type == "ARMATURE" and mod.object == armature for mod in m.modifiers)
    if skinned:
        meshes.append(m)
    else:
        log("dropping non-skinned mesh: %s" % m.name)
        bpy.data.objects.remove(m, do_unlink=True)
log("armature=%s  skinned meshes=%s" % (armature.name, [m.name for m in meshes]))

# ---- apply rotation + scale so the exported root is identity (the GLB import
# adds a -90deg X to the armature; leaving it makes the model lie flat in three.js).
# NOTE: it was the rest-pose *pose bake* (armature_apply) that exploded the skin,
# not transform_apply — that step stays disabled below. ----
bpy.ops.object.select_all(action="DESELECT")
for o in bpy.data.objects:
    o.select_set(True)
bpy.context.view_layer.objects.active = armature
# Rotation ONLY. Do NOT apply scale: baking scale rescales the skeleton but not
# the baked clip translation keyframes (authored in cm), which flings the model
# off-screen. Leaving the native armature scale keeps mesh + bones + clip motion
# consistent (renders ~1.7m like the source).
bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)

from mathutils import Vector

def world_height():
    corners = [m.matrix_world @ Vector(c) for m in meshes for c in m.bound_box]
    minz = min(v.z for v in corners)
    maxz = max(v.z for v in corners)
    return maxz - minz

# height for reference only — do NOT normalize via scale-apply (breaks clip
# translation magnitudes). Native source scale renders ~1.7m, which is fine.
h = world_height()
log("native height = %.3f (kept; not scale-normalized to preserve clip motion)" % h)

# capture framing target NOW (bound_box is valid here; it goes stale after armature_apply)
_corners = [m.matrix_world @ Vector(c) for m in meshes for c in m.bound_box]
FRAME_MIN = Vector((min(v.x for v in _corners), min(v.y for v in _corners), min(v.z for v in _corners)))
FRAME_MAX = Vector((max(v.x for v in _corners), max(v.y for v in _corners), max(v.z for v in _corners)))
FRAME_CENTER = (FRAME_MIN + FRAME_MAX) * 0.5
_d = FRAME_MAX - FRAME_MIN
FRAME_DIST = max(_d.x, _d.z) * 1.4 + 1.2
log("frame center=%s dims=%s dist=%.2f" % (tuple(round(c,2) for c in FRAME_CENTER), tuple(round(c,2) for c in _d), FRAME_DIST))

# ---- rename bones -----------------------------------------------------------
bpy.ops.object.mode_set(mode="OBJECT")
bpy.context.view_layer.objects.active = armature
bpy.ops.object.mode_set(mode="EDIT")
eb = armature.data.edit_bones
# strip prefix first
for b in eb:
    if b.name.startswith("mixamorig:"):
        b.name = b.name[len("mixamorig:"):]
# apply explicit map
for src_name, dst_name in RENAME_MAP.items():
    if src_name in eb:
        eb[src_name].name = dst_name
bpy.ops.object.mode_set(mode="OBJECT")

names = [b.name for b in armature.data.bones]
log("bones after rename (%d): %s" % (len(names), names))

# ---- (optional) arms-down rest bake — DISABLED ------------------------------
# Applying a posed rest to this skinned Mixamo rig in headless Blender corrupts the
# bind (exploded mesh). The neutral arms-down stance + per-bone axis correction are
# handled procedurally in src/player-model.js (plan 03), iterated against the live
# game renderer. ARM_DEG is retained for a possible future GUI-Blender pass.
log("skipping rest-pose bake (handled in player-model.js); ARM_DEG=%.1f ignored" % ARM_DEG)

# ---- export -----------------------------------------------------------------
abs_out = os.path.abspath(OUT_GLB)
bpy.ops.object.select_all(action="SELECT")
n_actions = len(bpy.data.actions)
log("actions present for export: %d -> %s" % (n_actions, [a.name for a in bpy.data.actions]))
bpy.ops.export_scene.gltf(
    filepath=abs_out,
    export_format="GLB",
    export_skins=True,
    export_yup=True,
    export_animations=True,
    export_animation_mode="ACTIONS",
    export_nla_strips=True,
    use_selection=False,
)
log("exported %s (%d bytes)" % (abs_out, os.path.getsize(abs_out)))

# ---- workbench preview render ----------------------------------------------
scene = bpy.context.scene
scene.render.engine = "BLENDER_WORKBENCH"
scene.render.resolution_x = 480
scene.render.resolution_y = 640
scene.render.film_transparent = False

# light
light_data = bpy.data.lights.new("sun", type="SUN")
light_data.energy = 3.0
light_obj = bpy.data.objects.new("sun", light_data)
scene.collection.objects.link(light_obj)
light_obj.rotation_euler = Euler((radians(50), 0, radians(30)), "XYZ")

# use the framing target captured before armature_apply (bound_box is stale now)
center = FRAME_CENTER
dist = FRAME_DIST

cam_data = bpy.data.cameras.new("cam")
cam_obj = bpy.data.objects.new("cam", cam_data)
scene.collection.objects.link(cam_obj)
cam_obj.location = (center.x, center.y - dist, center.z)
cam_obj.rotation_euler = Euler((radians(90), 0, 0), "XYZ")
scene.camera = cam_obj

scene.render.filepath = os.path.abspath(PREVIEW)
bpy.ops.render.render(write_still=True)
log("preview -> %s" % os.path.abspath(PREVIEW))
log("DONE")
