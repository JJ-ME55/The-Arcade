"""Compare unit scale of arena map vs mannequin."""
import bpy

scene = bpy.context.scene
print(f"\n=== SCENE UNIT SETTINGS ===")
print(f"Unit system: {scene.unit_settings.system}")
print(f"Unit scale: {scene.unit_settings.scale_length}")
print(f"Length unit: {scene.unit_settings.length_unit}")

print(f"\n=== ALL OBJECTS ===")
for obj in bpy.data.objects:
    if obj.type in ('MESH', 'ARMATURE'):
        print(f"  {obj.name:30s}  scale=({obj.scale.x:.3f}, {obj.scale.y:.3f}, {obj.scale.z:.3f})  dims=({obj.dimensions.x:.3f}, {obj.dimensions.y:.3f}, {obj.dimensions.z:.3f})  loc=({obj.location.x:.2f}, {obj.location.y:.2f}, {obj.location.z:.2f})")
