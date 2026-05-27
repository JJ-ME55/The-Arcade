"""Find watchtower and ramp objects."""
import bpy

print("\n=== OBJECTS NEAR SW WATCHTOWER (X~-14, Y~-27) ===")
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
    if -18 < cx < -10 and -30 < cy < -23:
        print(f"  {obj.name}: X=[{min(xs):.2f}, {max(xs):.2f}] Y=[{min(ys):.2f}, {max(ys):.2f}] Z=[{min(zs):.2f}, {max(zs):.2f}]")

print("\n=== OBJECTS NEAR NW WATCHTOWER (X~-14, Y~11) ===")
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
    if -18 < cx < -10 and 8 < cy < 15:
        print(f"  {obj.name}: X=[{min(xs):.2f}, {max(xs):.2f}] Y=[{min(ys):.2f}, {max(ys):.2f}] Z=[{min(zs):.2f}, {max(zs):.2f}]")

print("\n=== RAMP OBJECTS ===")
for obj in sorted(bpy.data.objects, key=lambda o: o.name):
    if obj.type != 'MESH':
        continue
    if 'ramp' in obj.name.lower():
        mesh = obj.data
        xs, ys, zs = [], [], []
        for v in mesh.vertices:
            world = obj.matrix_world @ v.co
            xs.append(world.x)
            ys.append(world.y)
            zs.append(world.z)
        if zs:
            print(f"  {obj.name}: X=[{min(xs):.2f}, {max(xs):.2f}] Y=[{min(ys):.2f}, {max(ys):.2f}] Z=[{min(zs):.2f}, {max(zs):.2f}]")

print("\n=== ALL OBJECTS WITH 'NE' PREFIX ===")
for obj in sorted(bpy.data.objects, key=lambda o: o.name):
    if obj.type != 'MESH':
        continue
    if obj.name.startswith('NE_'):
        mesh = obj.data
        xs, ys, zs = [], [], []
        for v in mesh.vertices:
            world = obj.matrix_world @ v.co
            xs.append(world.x)
            ys.append(world.y)
            zs.append(world.z)
        if zs:
            print(f"  {obj.name}: X=[{min(xs):.2f}, {max(xs):.2f}] Y=[{min(ys):.2f}, {max(ys):.2f}] Z=[{min(zs):.2f}, {max(zs):.2f}]")
