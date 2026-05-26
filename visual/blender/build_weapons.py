"""
Normalize Quaternius Ultimate Guns Pack GLBs into game-ready weapon models.
For each gun: import, join meshes, apply transforms, scale the longest dimension
to a target real-world length, recenter the origin to the geometry center, export.
Orientation is kept native; final aim/grip orientation is tuned in the engine.

Run: blender --background --python visual/blender/build_weapons.py
"""
import bpy, os
from mathutils import Vector

GUNS = [
    # (source glb, output glb, target longest-dim metres)
    ("visual/blender/anims/guns/Assault Rifle.glb", "visual/rifle.glb", 0.90),
    ("visual/blender/anims/guns/Pistol.glb",        "visual/pistol.glb", 0.22),
    ("visual/blender/anims/guns/Bayonet.glb",       "visual/knife.glb", 0.30),
]

def log(m): print("[weapons] " + m)

def world_bbox(objs):
    pts = []
    for o in objs:
        for c in o.bound_box:
            pts.append(o.matrix_world @ Vector(c))
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return mn, mx

for src, out, target in GUNS:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.abspath(src))
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    if not meshes:
        log("no meshes in %s" % src); continue
    # join all into one
    bpy.ops.object.select_all(action="DESELECT")
    for m in meshes: m.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    mn, mx = world_bbox([obj])
    dims = mx - mn
    longest = max(dims.x, dims.y, dims.z)
    f = target / longest if longest > 0 else 1.0
    log("%s native dims=%s -> scale x%.4f" % (os.path.basename(src),
        tuple(round(d, 3) for d in dims), f))
    obj.scale = (f, f, f)
    bpy.ops.object.transform_apply(scale=True)

    # recenter origin to geometry bounds center
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    obj.location = (0, 0, 0)

    mn2, mx2 = world_bbox([obj])
    log("  final dims=%s" % (tuple(round(d, 3) for d in (mx2 - mn2)),))

    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.abspath(out), export_format="GLB",
                              use_selection=True, export_yup=True)
    log("exported %s" % out)

log("DONE")
