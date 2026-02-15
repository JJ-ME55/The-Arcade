"""
Export mannequin to GLB format with skinning data.

This script exports the rigged mannequin from Blender to GLB (binary glTF) format
with all skinning/armature data intact for use in Three.js.

Usage:
  blender --background mannequin.blend --python export_mannequin.py
"""

import bpy
import os

def export_mannequin():
    """Export all objects in the scene to GLB with skinning data."""
    # Select all objects in scene
    bpy.ops.object.select_all(action='SELECT')

    # Output path (relative to project root)
    output_path = 'c:/Users/jacob/fps-staking-game/visual/mannequin_neutral.glb'

    print(f"Exporting to: {output_path}")

    # Export to GLB
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',
        export_skins=True,           # CRITICAL: preserves armature/skinning
        export_yup=True,             # Convert Blender Z-up to glTF Y-up
        export_apply=True,           # Apply modifiers (except armature, handled by exporter)
        export_extras=True,          # Custom properties
        export_animations=False,     # No baked animations -- all procedural
        export_cameras=False,
        export_lights=False,
        use_selection=False,         # Export all objects
    )

    print(f"Export complete: {output_path}")

    # Verify file was created
    if os.path.exists(output_path):
        file_size = os.path.getsize(output_path)
        print(f"File size: {file_size} bytes ({file_size / 1024:.2f} KB)")
    else:
        print("ERROR: Export file not found!")


if __name__ == "__main__":
    export_mannequin()
