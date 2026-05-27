"""Inspect slope railings and watchtower pillars."""
import bpy

print("\n" + "="*60)
print("GEOMETRY INSPECTION")
print("="*60)

# Check slope railing positions
print("\n=== SLOPE RAILINGS ===")
for obj in sorted(bpy.data.objects, key=lambda o: o.name):
    if obj.type != 'MESH':
        continue
    if 'slope' in obj.name.lower():
        mesh = obj.data
        zs, ys = [], []
        for v in mesh.vertices:
            world = obj.matrix_world @ v.co
            zs.append(world.z)
            ys.append(world.y)
        if zs:
            print(f"  {obj.name}: Y=[{min(ys):.2f}, {max(ys):.2f}] Z=[{min(zs):.2f}, {max(zs):.2f}]")

# Check all walkway objects
print("\n=== WALKWAY FLOOR OBJECTS ===")
for obj in sorted(bpy.data.objects, key=lambda o: o.name):
    if obj.type != 'MESH':
        continue
    if obj.name.startswith('Walk_'):
        mesh = obj.data
        xs, ys, zs = [], [], []
        for v in mesh.vertices:
            world = obj.matrix_world @ v.co
            xs.append(world.x)
            ys.append(world.y)
            zs.append(world.z)
        if zs:
            print(f"  {obj.name}: X=[{min(xs):.2f}, {max(xs):.2f}] Y=[{min(ys):.2f}, {max(ys):.2f}] Z=[{min(zs):.2f}, {max(zs):.2f}]")

# Look for column/pillar objects
print("\n=== COLUMN/PILLAR OBJECTS ===")
for obj in sorted(bpy.data.objects, key=lambda o: o.name):
    if obj.type != 'MESH':
        continue
    name_lower = obj.name.lower()
    if 'col' in name_lower or 'pillar' in name_lower:
        if 'rail' in name_lower:
            continue
        mesh = obj.data
        xs, ys, zs = [], [], []
        for v in mesh.vertices:
            world = obj.matrix_world @ v.co
            xs.append(world.x)
            ys.append(world.y)
            zs.append(world.z)
        if zs:
            print(f"  {obj.name}: X=[{min(xs):.2f}, {max(xs):.2f}] Y=[{min(ys):.2f}, {max(ys):.2f}] Z=[{min(zs):.2f}, {max(zs):.2f}]")

# Count all objects for reference
mesh_count = sum(1 for o in bpy.data.objects if o.type == 'MESH')
print(f"\nTotal meshes: {mesh_count}")
