"""Inspect all objects in the arena map near the spawn point and list dimensions."""
import bpy
from mathutils import Vector

# Spawn is at Blender (0, -23, 0)
SPAWN = Vector((0, -23, 0))
SEARCH_RADIUS = 15  # units around spawn

print("\n=== ALL OBJECTS NEAR SPAWN (within 15 units) ===\n")
print(f"{'Name':40s} {'Location':30s} {'Dimensions (X,Y,Z)':30s} {'Type':10s}")
print("-" * 115)

near_objects = []
for obj in bpy.data.objects:
    if obj.type != 'MESH':
        continue
    loc = obj.location
    # Check if object center is near spawn OR if it's a large object that might overlap
    dist = (Vector((loc.x, loc.y, 0)) - Vector((SPAWN.x, SPAWN.y, 0))).length
    if dist < SEARCH_RADIUS:
        dims = obj.dimensions
        near_objects.append((obj.name, loc, dims, dist))

near_objects.sort(key=lambda x: x[3])

for name, loc, dims, dist in near_objects:
    loc_str = f"({loc.x:.2f}, {loc.y:.2f}, {loc.z:.2f})"
    dim_str = f"({dims.x:.2f}, {dims.y:.2f}, {dims.z:.2f})"
    print(f"{name:40s} {loc_str:30s} {dim_str:30s} dist={dist:.1f}")

print(f"\n=== Total objects near spawn: {len(near_objects)} ===")

# Also list ALL cube/box/crate objects regardless of location
print("\n=== ALL OBJECTS WITH 'cube' OR 'box' OR 'crate' IN NAME ===\n")
for obj in bpy.data.objects:
    if obj.type != 'MESH':
        continue
    low = obj.name.lower()
    if 'cube' in low or 'box' in low or 'crate' in low or 'block' in low:
        loc = obj.location
        dims = obj.dimensions
        loc_str = f"({loc.x:.2f}, {loc.y:.2f}, {loc.z:.2f})"
        dim_str = f"({dims.x:.2f}, {dims.y:.2f}, {dims.z:.2f})"
        print(f"{name:40s} {loc_str:30s} {dim_str:30s}")

# Also show objects that might be small cover objects (dimensions between 0.5 and 4 in all axes)
print("\n=== SMALL/MEDIUM OBJECTS (possible crates, 0.5-5m each dim) ===\n")
for obj in bpy.data.objects:
    if obj.type != 'MESH':
        continue
    d = obj.dimensions
    if 0.5 < d.x < 5 and 0.5 < d.y < 5 and 0.5 < d.z < 5:
        loc = obj.location
        loc_str = f"({loc.x:.2f}, {loc.y:.2f}, {loc.z:.2f})"
        dim_str = f"({d.x:.2f}, {d.y:.2f}, {d.z:.2f})"
        dist = (Vector((loc.x, loc.y, 0)) - Vector((SPAWN.x, SPAWN.y, 0))).length
        print(f"{obj.name:40s} {loc_str:30s} {dim_str:30s} dist={dist:.1f}")
