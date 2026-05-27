"""Find all Tower objects."""
import bpy

print("\n=== ALL TOWER OBJECTS ===")
for obj in sorted(bpy.data.objects, key=lambda o: o.name):
    if obj.type != 'MESH':
        continue
    if obj.name.startswith('Tower_'):
        mesh = obj.data
        xs, ys, zs = [], [], []
        for v in mesh.vertices:
            world = obj.matrix_world @ v.co
            xs.append(world.x)
            ys.append(world.y)
            zs.append(world.z)
        if zs:
            print(f"  {obj.name}: X=[{min(xs):.2f}, {max(xs):.2f}] Y=[{min(ys):.2f}, {max(ys):.2f}] Z=[{min(zs):.2f}, {max(zs):.2f}]")

print("\n=== EAST WALKWAY RAIL OBJECTS ===")
for obj in sorted(bpy.data.objects, key=lambda o: o.name):
    if obj.type != 'MESH':
        continue
    if obj.name.startswith('rail_E_'):
        mesh = obj.data
        xs, ys, zs = [], [], []
        for v in mesh.vertices:
            world = obj.matrix_world @ v.co
            xs.append(world.x)
            ys.append(world.y)
            zs.append(world.z)
        if zs:
            print(f"  {obj.name}: X=[{min(xs):.2f}, {max(xs):.2f}] Y=[{min(ys):.2f}, {max(ys):.2f}] Z=[{min(zs):.2f}, {max(zs):.2f}]")

# Check if the NE building ramp has any railings near it
print("\n=== OBJECTS NEAR NE RAMP (X:16-20, Y:4-9) ===")
for obj in sorted(bpy.data.objects, key=lambda o: o.name):
    if obj.type != 'MESH':
        continue
    mesh = obj.data
    xs, ys, zs = [], [], []
    for v in mesh.vertices:
        world = obj.matrix_world @ v.co
        xs.append(world.x)
        ys.append(world.y)
        zs.append(world.z)
    if not zs:
        continue
    cx = (min(xs) + max(xs)) / 2
    cy = (min(ys) + max(ys)) / 2
    if 14 < cx < 22 and 2 < cy < 11 and 'rail' in obj.name.lower():
        print(f"  {obj.name}: X=[{min(xs):.2f}, {max(xs):.2f}] Y=[{min(ys):.2f}, {max(ys):.2f}] Z=[{min(zs):.2f}, {max(zs):.2f}]")
