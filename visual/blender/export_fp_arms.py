"""
Export first-person arms with armature to GLB.
Preserves skinning data for procedural animation.
"""
import bpy
import os

# Construct absolute path to visual directory
script_dir = os.path.dirname(os.path.abspath(__file__))
visual_dir = os.path.dirname(script_dir)
filepath = os.path.join(visual_dir, 'fp_arms.glb')

print(f"Script dir: {script_dir}")
print(f"Visual dir: {visual_dir}")
print(f"Exporting FP arms to: {filepath}")

bpy.ops.export_scene.gltf(
    filepath=filepath,
    export_format='GLB',
    export_skins=True,        # CRITICAL: preserves arm armature/skinning
    export_yup=True,
    export_apply=True,
    export_extras=True,       # Blender 5.0 parameter name
    export_animations=False,
    export_cameras=False,
    export_lights=False,
    use_selection=False,      # Export all (armature + meshes)
)

print(f"✓ Exported FP arms with armature to: {filepath}")
