"""
Cleanup stale rail copies and export GLB.
Run with: blender --background arena_map.blend --python cleanup_and_export.py
"""

import bpy
import os

print("\n" + "="*60)
print("CLEANUP AND RE-EXPORT")
print("="*60)

# Step 1: Delete stale rail _top copies (from broken railing conversion)
# These exact names are the leftover copies - be very careful not to delete real objects
stale_copies = [
    'Walk_corner_rail_S_top',
    'Walk_E_rail_in_top',
    'Walk_S_rail_in_top',
    'Walk_S_rail_out_top',
    'Walk_W_rail_in_top',
    'Walk_W_rail_out_top',
    'Walk_corner_rail_W_top',
    'Walk_NW_slope_rail_in_top',
    'Walk_NW_slope_rail_out_top',
]

deleted = 0
for name in stale_copies:
    obj = bpy.data.objects.get(name)
    if obj:
        bpy.data.objects.remove(obj, do_unlink=True)
        print(f"  Deleted stale copy: {name}")
        deleted += 1
    else:
        pass  # Already gone

print(f"Deleted {deleted} stale copies")

# Step 2: Verify scene state
mesh_count = sum(1 for obj in bpy.data.objects if obj.type == 'MESH')
empty_count = sum(1 for obj in bpy.data.objects if obj.type == 'EMPTY')
print(f"\nScene: {mesh_count} meshes, {empty_count} empties")

# Verify key objects exist
key_objects = ['NWall', 'SWall', 'WWall', 'EWall_top', 'Floor_main',
               'SE_ramp', 'NE_ramp', 'Walk_S_rail_in', 'Walk_W_rail_in',
               'ETrim_top', 'Rect_top_1', 'StepE_top']
missing = [name for name in key_objects if not bpy.data.objects.get(name)]
if missing:
    print(f"WARNING: Missing key objects: {missing}")
else:
    print("All key objects present")

# Step 3: Run the export script
print("\n" + "-"*60)
print("Running export_glb.py...")
print("-"*60)

# Import and run the export script
blend_dir = os.path.dirname(bpy.data.filepath)
export_script = os.path.join(blend_dir, "export_glb.py")

if os.path.exists(export_script):
    exec(open(export_script).read())
else:
    print(f"ERROR: export_glb.py not found at {export_script}")

print("\n" + "="*60)
print("CLEANUP AND EXPORT COMPLETE")
print("="*60)
