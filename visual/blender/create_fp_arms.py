"""
Create first-person arms model with simplified armature for FPS view.
Only arms from shoulders to hands, positioned for weapon-holding.
"""
import bpy
import os
from mathutils import Vector, Euler
import math

# Clear existing scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# Create material
mat_arms = bpy.data.materials.new(name="ArmsMaterial")
mat_arms.use_nodes = True
bsdf = mat_arms.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Base Color'].default_value = (0.6, 0.6, 0.6, 1.0)
bsdf.inputs['Roughness'].default_value = 0.8

print("Creating FP Arms armature...")

# Create armature
bpy.ops.object.armature_add(location=(0, 0, 0))
armature = bpy.context.active_object
armature.name = "FP_Armature"
armature.show_in_front = True

# Switch to edit mode
bpy.ops.object.mode_set(mode='EDIT')
edit_bones = armature.data.edit_bones

# Remove default bone
edit_bones.remove(edit_bones[0])

# Create root bone
root = edit_bones.new('FP_Root')
root.head = Vector((0, 0, 0))
root.tail = Vector((0, 0, 0.1))

# Right arm chain (from player's perspective, right is their right)
# Shoulder
shoulder_r = edit_bones.new('Shoulder.R')
shoulder_r.head = Vector((0.15, -0.05, -0.1))
shoulder_r.tail = Vector((0.2, -0.05, -0.15))
shoulder_r.parent = root

# Upper arm
upper_r = edit_bones.new('UpperArm.R')
upper_r.head = shoulder_r.tail
upper_r.tail = Vector((0.3, 0.1, -0.25))
upper_r.parent = shoulder_r

# Forearm
forearm_r = edit_bones.new('ForeArm.R')
forearm_r.head = upper_r.tail
forearm_r.tail = Vector((0.25, 0.25, -0.3))
forearm_r.parent = upper_r

# Hand
hand_r = edit_bones.new('Hand.R')
hand_r.head = forearm_r.tail
hand_r.tail = Vector((0.25, 0.3, -0.3))
hand_r.parent = forearm_r

# Left arm chain
# Shoulder
shoulder_l = edit_bones.new('Shoulder.L')
shoulder_l.head = Vector((-0.15, -0.05, -0.1))
shoulder_l.tail = Vector((-0.2, -0.05, -0.15))
shoulder_l.parent = root

# Upper arm
upper_l = edit_bones.new('UpperArm.L')
upper_l.head = shoulder_l.tail
upper_l.tail = Vector((-0.3, 0.1, -0.25))
upper_l.parent = shoulder_l

# Forearm
forearm_l = edit_bones.new('ForeArm.L')
forearm_l.head = upper_l.tail
forearm_l.tail = Vector((-0.25, 0.25, -0.3))
forearm_l.parent = upper_l

# Hand
hand_l = edit_bones.new('Hand.L')
hand_l.head = forearm_l.tail
hand_l.tail = Vector((-0.25, 0.3, -0.3))
hand_l.parent = forearm_l

# Return to object mode
bpy.ops.object.mode_set(mode='OBJECT')

print(f"✓ Created armature with {len(armature.data.bones)} bones")

# Helper function to create skinned mesh part
def create_arm_part(name, bone_name, start_pos, end_pos, radius, material):
    """Create a cylindrical mesh part skinned to a bone."""
    depth = (end_pos - start_pos).length
    center = (start_pos + end_pos) / 2

    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, location=center)
    obj = bpy.context.active_object
    obj.name = name

    # Rotate to align with bone direction
    direction = (end_pos - start_pos).normalized()
    z_axis = Vector((0, 0, 1))
    rotation_quat = z_axis.rotation_difference(direction)
    obj.rotation_mode = 'QUATERNION'
    obj.rotation_quaternion = rotation_quat
    bpy.ops.object.transform_apply(rotation=True)

    # Create vertex group
    vg = obj.vertex_groups.new(name=bone_name)
    vg.add(range(len(obj.data.vertices)), 1.0, 'REPLACE')

    # Add armature modifier
    mod = obj.modifiers.new(name="Armature", type='ARMATURE')
    mod.object = armature

    # Apply material
    obj.data.materials.append(material)

    return obj

# Helper for spherical joints
def create_joint(name, bone_name, position, radius, material):
    """Create a spherical joint skinned to a bone."""
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, location=position)
    obj = bpy.context.active_object
    obj.name = name

    vg = obj.vertex_groups.new(name=bone_name)
    vg.add(range(len(obj.data.vertices)), 1.0, 'REPLACE')

    mod = obj.modifiers.new(name="Armature", type='ARMATURE')
    mod.object = armature

    obj.data.materials.append(material)
    return obj

# Helper for hand cubes
def create_hand(name, bone_name, position, size, material):
    """Create a cuboid hand skinned to a bone."""
    bpy.ops.mesh.primitive_cube_add(size=size, location=position)
    obj = bpy.context.active_object
    obj.name = name

    vg = obj.vertex_groups.new(name=bone_name)
    vg.add(range(len(obj.data.vertices)), 1.0, 'REPLACE')

    mod = obj.modifiers.new(name="Armature", type='ARMATURE')
    mod.object = armature

    obj.data.materials.append(material)
    return obj

print("Creating mesh parts for right arm...")
# Right arm meshes
r_upper = create_arm_part("UpperArm_R_Mesh", "UpperArm.R",
                          Vector((0.2, -0.05, -0.15)),
                          Vector((0.3, 0.1, -0.25)),
                          0.045, mat_arms)

r_elbow = create_joint("Elbow_R_Joint", "ForeArm.R",
                       Vector((0.3, 0.1, -0.25)),
                       0.03, mat_arms)

r_forearm = create_arm_part("ForeArm_R_Mesh", "ForeArm.R",
                            Vector((0.3, 0.1, -0.25)),
                            Vector((0.25, 0.25, -0.3)),
                            0.038, mat_arms)

r_wrist = create_joint("Wrist_R_Joint", "Hand.R",
                       Vector((0.25, 0.25, -0.3)),
                       0.03, mat_arms)

r_hand = create_hand("Hand_R_Mesh", "Hand.R",
                     Vector((0.25, 0.275, -0.3)),
                     0.05, mat_arms)

print("Creating mesh parts for left arm...")
# Left arm meshes
l_upper = create_arm_part("UpperArm_L_Mesh", "UpperArm.L",
                          Vector((-0.2, -0.05, -0.15)),
                          Vector((-0.3, 0.1, -0.25)),
                          0.045, mat_arms)

l_elbow = create_joint("Elbow_L_Joint", "ForeArm.L",
                       Vector((-0.3, 0.1, -0.25)),
                       0.03, mat_arms)

l_forearm = create_arm_part("ForeArm_L_Mesh", "ForeArm.L",
                            Vector((-0.3, 0.1, -0.25)),
                            Vector((-0.25, 0.25, -0.3)),
                            0.038, mat_arms)

l_wrist = create_joint("Wrist_L_Joint", "Hand.L",
                       Vector((-0.25, 0.25, -0.3)),
                       0.03, mat_arms)

l_hand = create_hand("Hand_L_Mesh", "Hand.L",
                     Vector((-0.25, 0.275, -0.3)),
                     0.05, mat_arms)

print("Saving fp_arms.blend...")
# Save file
blend_path = os.path.join(os.path.dirname(__file__), "fp_arms.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend_path)

# Count vertex groups
total_vgroups = sum(len(obj.vertex_groups) for obj in bpy.data.objects if obj.type == 'MESH')

print(f"✓ Created FP arms armature with 10 bones")
print(f"✓ Created 10 mesh parts with {total_vgroups} vertex groups assigned")
print(f"✓ Saved to: {blend_path}")
