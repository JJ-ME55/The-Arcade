"""
Export each weapon from weapons.blend as a separate GLB file.
Weapons are static meshes (no armature).
"""
import bpy
import os

weapon_names = ['Rifle', 'Pistol', 'Knife']

# Construct absolute path to visual directory
script_dir = os.path.dirname(os.path.abspath(__file__))
visual_dir = os.path.dirname(script_dir)

print(f"Script dir: {script_dir}")
print(f"Visual dir: {visual_dir}")

for name in weapon_names:
    # CRITICAL: deselect ALL objects before selecting the next weapon
    bpy.ops.object.select_all(action='DESELECT')

    # Select only this weapon's object
    obj = bpy.data.objects.get(name)
    if obj is None:
        print(f"WARNING: Object '{name}' not found, skipping")
        continue
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

    # Construct filepath for this weapon
    filepath = os.path.join(visual_dir, f'{name.lower()}.glb')

    print(f"Exporting {name}...")
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        export_skins=False,      # Static mesh, no skeleton
        export_yup=True,
        export_apply=True,
        export_animations=False,
        export_cameras=False,
        export_lights=False,
        use_selection=True,      # Only export selected object
    )
    print(f"✓ Exported: {name} -> {filepath}")

print("✓ All weapons exported successfully")
