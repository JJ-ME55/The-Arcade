"""
Create three geometric weapon models (rifle, pistol, knife) in Blender.
All weapons are static meshes (no armature) made from geometric primitives.
"""
import bpy
import os
from mathutils import Vector

# Clear existing scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# Helper function to create material
def create_material(name, color, roughness=0.7, metallic=0.3):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    return mat

# Create materials
mat_gunmetal = create_material("Gunmetal", (0.2, 0.2, 0.2), 0.7, 0.3)
mat_grip = create_material("Grip", (0.25, 0.25, 0.25), 0.8, 0.1)
mat_blade = create_material("Blade", (0.67, 0.67, 0.67), 0.3, 0.8)
mat_handle = create_material("Handle", (0.33, 0.27, 0.20), 0.9, 0.0)

print("Creating Rifle...")
# Rifle body (main receiver/body)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
rifle_body = bpy.context.active_object
rifle_body.scale = (0.4, 0.025, 0.06)
rifle_body.location = (0, 0, 0)
bpy.ops.object.transform_apply(scale=True)

# Barrel (extending forward)
bpy.ops.mesh.primitive_cylinder_add(radius=0.012, depth=0.3, location=(0.35, 0, 0), rotation=(0, 1.5708, 0))
rifle_barrel = bpy.context.active_object

# Stock (at rear)
bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.275, 0, -0.02))
rifle_stock = bpy.context.active_object
rifle_stock.scale = (0.075, 0.02, 0.04)
bpy.ops.object.transform_apply(scale=True)

# Magazine (below body)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, -0.07))
rifle_mag = bpy.context.active_object
rifle_mag.scale = (0.015, 0.03, 0.04)
bpy.ops.object.transform_apply(scale=True)

# Scope rail (on top)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.05, 0, 0.0675))
rifle_rail = bpy.context.active_object
rifle_rail.scale = (0.1, 0.01, 0.0075)
bpy.ops.object.transform_apply(scale=True)

# Select all rifle parts and join
bpy.ops.object.select_all(action='DESELECT')
for obj in [rifle_body, rifle_barrel, rifle_stock, rifle_mag, rifle_rail]:
    obj.select_set(True)
bpy.context.view_layer.objects.active = rifle_body
bpy.ops.object.join()
rifle = bpy.context.active_object
rifle.name = "Rifle"

# Set origin to grip position (where hand holds)
bpy.ops.object.origin_set(type='ORIGIN_CURSOR', center='MEDIAN')
rifle.location = (0, 0, 0)

# Apply material
if rifle.data.materials:
    rifle.data.materials[0] = mat_gunmetal
else:
    rifle.data.materials.append(mat_gunmetal)

print("Creating Pistol...")
# Pistol slide (top part)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
pistol_slide = bpy.context.active_object
pistol_slide.scale = (0.09, 0.0175, 0.02)
bpy.ops.object.transform_apply(scale=True)

# Grip (angled below slide rear)
bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.03, 0, -0.04))
pistol_grip = bpy.context.active_object
pistol_grip.scale = (0.015, 0.04, 0.02)
pistol_grip.rotation_euler = (0, -0.2, 0)
bpy.ops.object.transform_apply(scale=True, rotation=True)

# Barrel (short cylinder at front)
bpy.ops.mesh.primitive_cylinder_add(radius=0.008, depth=0.05, location=(0.115, 0, 0), rotation=(0, 1.5708, 0))
pistol_barrel = bpy.context.active_object

# Join pistol parts
bpy.ops.object.select_all(action='DESELECT')
for obj in [pistol_slide, pistol_grip, pistol_barrel]:
    obj.select_set(True)
bpy.context.view_layer.objects.active = pistol_slide
bpy.ops.object.join()
pistol = bpy.context.active_object
pistol.name = "Pistol"

# Set origin to grip
bpy.ops.object.origin_set(type='ORIGIN_CURSOR', center='MEDIAN')
pistol.location = (0, 0, 0)

# Apply material
if pistol.data.materials:
    pistol.data.materials[0] = mat_gunmetal
else:
    pistol.data.materials.append(mat_gunmetal)

print("Creating Knife...")
# Blade (flattened tapered box)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.075, 0, 0))
knife_blade = bpy.context.active_object
knife_blade.scale = (0.075, 0.0015, 0.015)
bpy.ops.object.transform_apply(scale=True)

# Taper the blade to a point (scale down front vertices)
mesh = knife_blade.data
for v in mesh.vertices:
    if v.co.x > 0.07:  # Front tip vertices
        v.co.y *= 0.1
        v.co.z *= 0.3

# Handle (cylinder)
bpy.ops.mesh.primitive_cylinder_add(radius=0.015, depth=0.12, location=(-0.06, 0, 0), rotation=(0, 1.5708, 0))
knife_handle = bpy.context.active_object

# Guard (thin box between blade and handle)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
knife_guard = bpy.context.active_object
knife_guard.scale = (0.005, 0.025, 0.025)
bpy.ops.object.transform_apply(scale=True)

# Join knife parts (but apply different materials first)
knife_blade.data.materials.append(mat_blade)
knife_handle.data.materials.append(mat_handle)
knife_guard.data.materials.append(mat_gunmetal)

bpy.ops.object.select_all(action='DESELECT')
for obj in [knife_blade, knife_handle, knife_guard]:
    obj.select_set(True)
bpy.context.view_layer.objects.active = knife_handle
bpy.ops.object.join()
knife = bpy.context.active_object
knife.name = "Knife"

# Set origin to grip
bpy.ops.object.origin_set(type='ORIGIN_CURSOR', center='MEDIAN')
knife.location = (0, 0, 0)

print("Saving weapons.blend...")
# Save file
blend_path = os.path.join(os.path.dirname(__file__), "weapons.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend_path)

print(f"✓ Created 3 weapon objects: Rifle, Pistol, Knife")
print(f"✓ Saved to: {blend_path}")
