"""Import mannequin_neutral.glb back into clean Blender scene and measure it."""
import bpy
from mathutils import Vector

# Clear scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# Import the GLB
glb_path = 'c:/Users/jacob/fps-staking-game/visual/mannequin_neutral.glb'
print(f"\nImporting: {glb_path}")
bpy.ops.import_scene.gltf(filepath=glb_path)

# Measure all imported objects
print(f"\n=== IMPORTED GLB OBJECTS ===\n")
min_z = float('inf')
max_z = float('-inf')

for obj in bpy.data.objects:
    if obj.type == 'MESH':
        # Get world-space bounding box
        bbox = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
        obj_min_z = min(v.z for v in bbox)
        obj_max_z = max(v.z for v in bbox)
        obj_min_y = min(v.y for v in bbox)
        obj_max_y = max(v.y for v in bbox)
        min_z = min(min_z, obj_min_z)
        max_z = max(max_z, obj_max_z)

        print(f"  {obj.name:25s}  scale=({obj.scale.x:.3f},{obj.scale.y:.3f},{obj.scale.z:.3f})  Z range: {obj_min_z:.3f} to {obj_max_z:.3f}  (height: {obj_max_z-obj_min_z:.3f})")
    elif obj.type == 'ARMATURE':
        print(f"  {obj.name:25s}  ARMATURE  scale=({obj.scale.x:.3f},{obj.scale.y:.3f},{obj.scale.z:.3f})  loc=({obj.location.x:.3f},{obj.location.y:.3f},{obj.location.z:.3f})")

print(f"\n=== TOTAL MODEL HEIGHT (Z range) ===")
print(f"  Min Z: {min_z:.3f}")
print(f"  Max Z: {max_z:.3f}")
print(f"  TOTAL HEIGHT: {max_z - min_z:.3f} meters")

# Also check via import -- GLB Y-up gets converted to Blender Z-up on import
# So if the mannequin was 1.8m in Y (GLB), it should be 1.8m in Z (Blender) after import
