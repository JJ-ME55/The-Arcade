"""
Export Blender arena map to GLB with GLTF-compatible materials.

This script:
1. Replaces procedural shader materials with flat-color Principled BSDF
2. Adds spawn point empty objects with custom properties
3. Exports to arena_map.glb with GLTF settings
"""

import bpy
import os

# Material color mappings (sRGB values converted to linear for Blender)
MATERIAL_COLORS = {
    "W": (0.667, 0.667, 0.667, 1.0),        # Light grey #AAAAAA
    "O": (0.745, 0.290, 0.035, 1.0),        # Dark orange #C44A00
    "Metal": (0.4, 0.4, 0.45, 1.0),         # Steel grey (metallic)
    "DarkGrey": (0.333, 0.333, 0.333, 1.0), # Dark grey #555555
    "Dark": (0.333, 0.333, 0.333, 1.0),     # Dark grey #555555 (alternate match)
}
# Materials that should have metallic properties
METALLIC_MATERIALS = {"Metal"}
INVISIBLE_MATERIALS = {"Collision"}  # Exported but hidden in renderer
DEFAULT_COLOR = (0.533, 0.533, 0.533, 1.0)  # Medium grey #888888

def get_material_color(mat_name):
    """Determine flat color for a material based on its name."""
    for key, color in MATERIAL_COLORS.items():
        if key in mat_name:
            return color, key
    return DEFAULT_COLOR, "default"

def replace_material_with_flat(mat):
    """Replace material's node tree with simple Principled BSDF."""
    # Clear existing nodes (use_nodes is True by default in modern Blender)
    if not mat.use_nodes:
        mat.use_nodes = True
    mat.node_tree.nodes.clear()

    # Create Principled BSDF node
    bsdf = mat.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.location = (0, 0)

    # Get flat color for this material
    color, color_key = get_material_color(mat.name)
    is_invisible = mat.name in INVISIBLE_MATERIALS
    if is_invisible:
        bsdf.inputs['Base Color'].default_value = (0.0, 0.0, 0.0, 1.0)
        bsdf.inputs['Alpha'].default_value = 0.0
        bsdf.inputs['Roughness'].default_value = 0.9
        bsdf.inputs['Metallic'].default_value = 0.0
        color_key = "invisible"
    else:
        bsdf.inputs['Base Color'].default_value = color
        is_metal = mat.name in METALLIC_MATERIALS
        bsdf.inputs['Roughness'].default_value = 0.4 if is_metal else 0.9
        bsdf.inputs['Metallic'].default_value = 0.8 if is_metal else 0.0

    # Create Material Output node
    output = mat.node_tree.nodes.new('ShaderNodeOutputMaterial')
    output.location = (300, 0)

    # Link BSDF to output
    mat.node_tree.links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])

    print(f"  Material '{mat.name}' -> {color_key} color {color[:3]}")
    return color_key

def create_spawn_empty(name, location, team):
    """Create an empty object at spawn location with custom property."""
    empty = bpy.data.objects.new(name, None)
    empty.location = location
    empty.empty_display_type = 'ARROWS'
    empty.empty_display_size = 2.0

    # Add custom property for team identifier
    empty["spawnTeam"] = team

    # Link to scene
    bpy.context.scene.collection.objects.link(empty)

    print(f"  Created spawn empty '{name}' at {location} with spawnTeam={team}")
    return empty

def main():
    print("\n" + "="*60)
    print("BLENDER ARENA MAP GLB EXPORT")
    print("="*60 + "\n")

    # Step 1: Replace materials with flat colors
    print("Step 1: Replacing materials with GLTF-compatible flat colors")
    print("-" * 60)

    material_count = 0
    color_stats = {}

    for mat in bpy.data.materials:
        color_key = replace_material_with_flat(mat)
        material_count += 1
        color_stats[color_key] = color_stats.get(color_key, 0) + 1

    print(f"\nReplaced {material_count} materials:")
    for color_key, count in color_stats.items():
        print(f"  {color_key}: {count} materials")

    # Step 2: Create spawn point empties
    print("\n" + "-" * 60)
    print("Step 2: Creating spawn point empties")
    print("-" * 60)

    # Red spawn at south end (Y:-23 in Blender)
    create_spawn_empty("spawn_red", (0, -23, 0), "red")

    # Blue spawn at north end (Y:28 in Blender)
    create_spawn_empty("spawn_blue", (0, 28, 0), "blue")

    # Step 3: Export to GLB
    print("\n" + "-" * 60)
    print("Step 3: Exporting to GLB")
    print("-" * 60)

    # Get blend file directory
    blend_dir = os.path.dirname(bpy.data.filepath)
    output_path = os.path.join(blend_dir, "arena_map.glb")

    # Export with GLTF settings (Blender 5.0 compatible)
    # Using minimal parameters to ensure compatibility
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',                    # Binary format
        use_selection=False,                    # Export all objects
        export_apply=True,                      # Apply modifiers
        export_yup=True,                        # +Y up (GLTF standard)
        export_extras=True,                     # Include custom properties
        export_animations=False,                # No animations
        export_cameras=False,                   # No cameras
        export_lights=False,                    # No lights
    )

    # Verify export
    if os.path.exists(output_path):
        file_size = os.path.getsize(output_path)
        file_size_kb = file_size / 1024
        print(f"\nExport successful!")
        print(f"  Output: {output_path}")
        print(f"  Size: {file_size_kb:.2f} KB ({file_size:,} bytes)")

        # Check size is reasonable
        if file_size < 50 * 1024:
            print("  WARNING: File size is very small (< 50KB), may be incomplete")
        elif file_size > 5 * 1024 * 1024:
            print("  WARNING: File size is very large (> 5MB), may include unexpected data")
        else:
            print("  File size looks reasonable for block geometry with flat materials")
    else:
        print(f"\nERROR: Export failed, file not found at {output_path}")
        return 1

    print("\n" + "="*60)
    print("EXPORT COMPLETE")
    print("="*60 + "\n")

    return 0

if __name__ == "__main__":
    exit(main())
