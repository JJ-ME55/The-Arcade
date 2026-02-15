"""
Create a rigged humanoid mannequin in Blender from geometric primitives.
This script creates a 22-bone armature with a standard humanoid hierarchy,
builds body parts from cylinders and spheres, and assigns vertex groups for skinning.

Total height: 1.8m (matching player capsule collision shape)
Proportions: ~7.5 head-heights (head = 0.24m)

Usage:
  blender --background --python create_mannequin.py
"""

import bpy
from mathutils import Vector


def clear_scene():
    """Delete all existing objects in the scene."""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    print("Scene cleared")


def create_armature():
    """Create a 22-bone humanoid armature with standard hierarchy."""
    # Create armature data and object
    arm_data = bpy.data.armatures.new('MannequinArmature')
    arm_obj = bpy.data.objects.new('Armature', arm_data)
    bpy.context.scene.collection.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj
    arm_obj.select_set(True)

    # Switch to edit mode to create bones
    bpy.ops.object.mode_set(mode='EDIT')
    bones = arm_data.edit_bones

    # Mannequin: 1.8m tall, ~7.5 heads (head = 0.24m)
    # Blender Z-up: height along Z axis
    # Positions from research doc
    bone_defs = {
        # name: (head_pos, tail_pos, parent_name, connected)
        'Root':       ((0, 0, 0.95),   (0, 0, 1.05),   None,         False),
        'Spine':      ((0, 0, 1.05),   (0, 0, 1.20),   'Root',       True),
        'Chest':      ((0, 0, 1.20),   (0, 0, 1.40),   'Spine',      True),
        'Neck':       ((0, 0, 1.40),   (0, 0, 1.50),   'Chest',      True),
        'Head':       ((0, 0, 1.50),   (0, 0, 1.74),   'Neck',       True),
        # Left arm
        'Shoulder.L': ((0.08, 0, 1.38), (0.18, 0, 1.38), 'Chest',     False),
        'UpperArm.L': ((0.18, 0, 1.38), (0.18, 0, 1.10), 'Shoulder.L', True),
        'ForeArm.L':  ((0.18, 0, 1.10), (0.18, 0, 0.84), 'UpperArm.L', True),
        'Hand.L':     ((0.18, 0, 0.84), (0.18, 0, 0.74), 'ForeArm.L',  True),
        # Right arm
        'Shoulder.R': ((-0.08, 0, 1.38), (-0.18, 0, 1.38), 'Chest',     False),
        'UpperArm.R': ((-0.18, 0, 1.38), (-0.18, 0, 1.10), 'Shoulder.R', True),
        'ForeArm.R':  ((-0.18, 0, 1.10), (-0.18, 0, 0.84), 'UpperArm.R', True),
        'Hand.R':     ((-0.18, 0, 0.84), (-0.18, 0, 0.74), 'ForeArm.R',  True),
        # Left leg
        'Thigh.L':    ((0.09, 0, 0.95),  (0.09, 0, 0.50),  'Root',      False),
        'Shin.L':     ((0.09, 0, 0.50),  (0.09, 0, 0.08),  'Thigh.L',   True),
        'Foot.L':     ((0.09, 0, 0.08),  (0.09, 0.12, 0.0), 'Shin.L',   True),
        # Right leg
        'Thigh.R':    ((-0.09, 0, 0.95), (-0.09, 0, 0.50), 'Root',      False),
        'Shin.R':     ((-0.09, 0, 0.50), (-0.09, 0, 0.08), 'Thigh.R',   True),
        'Foot.R':     ((-0.09, 0, 0.08), (-0.09, 0.12, 0.0), 'Shin.R',  True),
    }

    for name, (head, tail, parent_name, connected) in bone_defs.items():
        bone = bones.new(name)
        bone.head = Vector(head)
        bone.tail = Vector(tail)
        if parent_name:
            bone.parent = bones[parent_name]
            bone.use_connect = connected

    bpy.ops.object.mode_set(mode='OBJECT')
    print(f"Created armature with {len(bone_defs)} bones")
    return arm_obj


def create_mesh_part(name, primitive_type, size, location, bone_name):
    """
    Create a mesh primitive, assign vertex group, and prepare for skinning.

    Args:
        name: Object name
        primitive_type: 'SPHERE', 'CYLINDER', or 'CUBE'
        size: Dict with radius/depth/scale parameters
        location: (x, y, z) position
        bone_name: Name of controlling bone for vertex group
    """
    # Deselect all
    bpy.ops.object.select_all(action='DESELECT')

    # Create primitive
    if primitive_type == 'SPHERE':
        bpy.ops.mesh.primitive_uv_sphere_add(
            radius=size['radius'],
            location=location,
            segments=16,
            ring_count=8
        )
    elif primitive_type == 'CYLINDER':
        bpy.ops.mesh.primitive_cylinder_add(
            radius=size['radius'],
            depth=size['depth'],
            location=location,
            vertices=16
        )
    elif primitive_type == 'CUBE':
        bpy.ops.mesh.primitive_cube_add(
            size=1.0,
            location=location
        )
        # Apply scale
        obj = bpy.context.object
        obj.scale = size['scale']
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

    obj = bpy.context.object
    obj.name = name

    # Create vertex group matching bone name
    vg = obj.vertex_groups.new(name=bone_name)
    # Add ALL vertices with weight 1.0
    vg.add(list(range(len(obj.data.vertices))), 1.0, 'REPLACE')

    return obj


def create_body_parts():
    """Create all mannequin body parts as geometric primitives."""
    parts = []

    # Head - UV sphere at Z=1.62 (center), radius 0.12
    parts.append(create_mesh_part(
        'Head_Mesh', 'SPHERE',
        {'radius': 0.12},
        (0, 0, 1.62),
        'Head'
    ))

    # Neck - Cylinder at Z=1.45 (center)
    parts.append(create_mesh_part(
        'Neck_Mesh', 'CYLINDER',
        {'radius': 0.04, 'depth': 0.10},
        (0, 0, 1.45),
        'Neck'
    ))

    # Chest/Torso - Cylinder at Z=1.30 (center of spine to chest)
    parts.append(create_mesh_part(
        'Chest_Mesh', 'CYLINDER',
        {'radius': 0.14, 'depth': 0.35},
        (0, 0, 1.30),
        'Chest'
    ))

    # Hips/Pelvis - Cylinder at Z=0.97 (center)
    parts.append(create_mesh_part(
        'Hips_Mesh', 'CYLINDER',
        {'radius': 0.13, 'depth': 0.15},
        (0, 0, 0.97),
        'Root'
    ))

    # Shoulders - Small spheres
    parts.append(create_mesh_part(
        'Shoulder_L_Mesh', 'SPHERE',
        {'radius': 0.06},
        (0.13, 0, 1.38),
        'Shoulder.L'
    ))
    parts.append(create_mesh_part(
        'Shoulder_R_Mesh', 'SPHERE',
        {'radius': 0.06},
        (-0.13, 0, 1.38),
        'Shoulder.R'
    ))

    # Upper Arms - Cylinders, depth=0.28m
    parts.append(create_mesh_part(
        'UpperArm_L_Mesh', 'CYLINDER',
        {'radius': 0.05, 'depth': 0.28},
        (0.18, 0, 1.24),  # Center between shoulder (1.38) and elbow (1.10)
        'UpperArm.L'
    ))
    parts.append(create_mesh_part(
        'UpperArm_R_Mesh', 'CYLINDER',
        {'radius': 0.05, 'depth': 0.28},
        (-0.18, 0, 1.24),
        'UpperArm.R'
    ))

    # Forearms - Cylinders, depth=0.26m
    parts.append(create_mesh_part(
        'ForeArm_L_Mesh', 'CYLINDER',
        {'radius': 0.04, 'depth': 0.26},
        (0.18, 0, 0.97),  # Center between elbow (1.10) and wrist (0.84)
        'ForeArm.L'
    ))
    parts.append(create_mesh_part(
        'ForeArm_R_Mesh', 'CYLINDER',
        {'radius': 0.04, 'depth': 0.26},
        (-0.18, 0, 0.97),
        'ForeArm.R'
    ))

    # Hands - Small spheres
    parts.append(create_mesh_part(
        'Hand_L_Mesh', 'SPHERE',
        {'radius': 0.06},
        (0.18, 0, 0.79),
        'Hand.L'
    ))
    parts.append(create_mesh_part(
        'Hand_R_Mesh', 'SPHERE',
        {'radius': 0.06},
        (-0.18, 0, 0.79),
        'Hand.R'
    ))

    # Thighs - Cylinders, depth=0.45m
    parts.append(create_mesh_part(
        'Thigh_L_Mesh', 'CYLINDER',
        {'radius': 0.06, 'depth': 0.45},
        (0.09, 0, 0.725),  # Center between hip (0.95) and knee (0.50)
        'Thigh.L'
    ))
    parts.append(create_mesh_part(
        'Thigh_R_Mesh', 'CYLINDER',
        {'radius': 0.06, 'depth': 0.45},
        (-0.09, 0, 0.725),
        'Thigh.R'
    ))

    # Shins - Cylinders, depth=0.42m
    parts.append(create_mesh_part(
        'Shin_L_Mesh', 'CYLINDER',
        {'radius': 0.05, 'depth': 0.42},
        (0.09, 0, 0.29),  # Center between knee (0.50) and ankle (0.08)
        'Shin.L'
    ))
    parts.append(create_mesh_part(
        'Shin_R_Mesh', 'CYLINDER',
        {'radius': 0.05, 'depth': 0.42},
        (-0.09, 0, 0.29),
        'Shin.R'
    ))

    # Feet - Scaled cubes (0.08 x 0.12 x 0.04)
    parts.append(create_mesh_part(
        'Foot_L_Mesh', 'CUBE',
        {'scale': (0.08, 0.12, 0.04)},
        (0.09, 0.04, 0.04),  # Slightly forward from ankle, at ground
        'Foot.L'
    ))
    parts.append(create_mesh_part(
        'Foot_R_Mesh', 'CUBE',
        {'scale': (0.08, 0.12, 0.04)},
        (-0.09, 0.04, 0.04),
        'Foot.R'
    ))

    print(f"Created {len(parts)} body part meshes")
    return parts


def create_material():
    """Create neutral grey material for all body parts."""
    mat = bpy.data.materials.new(name="Mannequin_Neutral")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes

    # Clear default nodes
    nodes.clear()

    # Create Principled BSDF
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.location = (0, 0)
    bsdf.inputs['Base Color'].default_value = (0.6, 0.6, 0.6, 1.0)
    bsdf.inputs['Roughness'].default_value = 0.9
    bsdf.inputs['Metallic'].default_value = 0.0

    # Create Material Output
    output = nodes.new('ShaderNodeOutputMaterial')
    output.location = (300, 0)

    # Link nodes
    mat.node_tree.links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])

    print("Created neutral grey material")
    return mat


def parent_and_skin_meshes(armature, mesh_parts, material):
    """Parent meshes to armature, add Armature modifier, assign material."""
    for mesh_obj in mesh_parts:
        # Assign material
        if len(mesh_obj.data.materials) == 0:
            mesh_obj.data.materials.append(material)
        else:
            mesh_obj.data.materials[0] = material

        # Apply rotation/scale transforms (keep location for rest pose)
        bpy.context.view_layer.objects.active = mesh_obj
        mesh_obj.select_set(True)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        mesh_obj.select_set(False)

        # Parent to armature
        mesh_obj.parent = armature

        # Add Armature modifier
        mod = mesh_obj.modifiers.new('Armature', 'ARMATURE')
        mod.object = armature
        mod.use_bone_envelopes = False
        mod.use_vertex_groups = True

    print(f"Parented and skinned {len(mesh_parts)} meshes to armature")


def main():
    """Main script execution."""
    print("\n=== Creating Mannequin ===")

    # Clear scene
    clear_scene()

    # Create armature
    armature = create_armature()

    # Create body parts
    mesh_parts = create_body_parts()

    # Create material
    material = create_material()

    # Parent meshes to armature and set up skinning
    parent_and_skin_meshes(armature, mesh_parts, material)

    # Save file
    blend_path = 'c:/Users/jacob/fps-staking-game/visual/blender/mannequin.blend'
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print(f"Saved to: {blend_path}")

    # Print summary
    print("\n=== SUMMARY ===")
    bone_count = len(armature.data.bones)
    mesh_count = len(mesh_parts)
    vgroup_count = sum(len(mesh.vertex_groups) for mesh in mesh_parts)

    print(f"SUMMARY: {bone_count} bones, {mesh_count} meshes, {vgroup_count} vertex groups")
    print("\nMesh objects created:")
    for mesh in mesh_parts:
        vg_names = [vg.name for vg in mesh.vertex_groups]
        print(f"  - {mesh.name} (vertex groups: {vg_names})")

    print("\nBones in armature:")
    for bone in armature.data.bones:
        print(f"  - {bone.name}")

    print("\nMannequin creation complete!")


if __name__ == "__main__":
    main()
