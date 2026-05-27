"""
Create a tactical military soldier character in Blender.

Same 19-bone armature as the mannequin for hitbox/animation compatibility.
Total height: 1.8m matching player capsule.

Generates a low-poly soldier with:
- Combat helmet with goggles
- Plate carrier / tactical vest with magazine pouches
- Military uniform (olive drab)
- Elbow and knee pads
- Combat boots and gloves
- Belt with utility pouches

Character faces +Y in Blender (maps to -Z in Three.js after Y-up export).

Usage:
  blender --background --python create_tactical_soldier.py
"""

import bpy
from mathutils import Vector


def clear_scene():
    """Delete all existing objects and orphan data."""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block in bpy.data.meshes:
        if block.users == 0:
            bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        if block.users == 0:
            bpy.data.materials.remove(block)
    for block in bpy.data.armatures:
        if block.users == 0:
            bpy.data.armatures.remove(block)
    print("Scene cleared")


def create_armature():
    """Create 19-bone humanoid armature matching mannequin bone names."""
    arm_data = bpy.data.armatures.new('SoldierArmature')
    arm_obj = bpy.data.objects.new('Armature', arm_data)
    bpy.context.scene.collection.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj
    arm_obj.select_set(True)

    bpy.ops.object.mode_set(mode='EDIT')
    bones = arm_data.edit_bones

    bone_defs = {
        'Root':       ((0, 0, 0.95),    (0, 0, 1.05),    None,          False),
        'Spine':      ((0, 0, 1.05),    (0, 0, 1.20),    'Root',        True),
        'Chest':      ((0, 0, 1.20),    (0, 0, 1.40),    'Spine',       True),
        'Neck':       ((0, 0, 1.40),    (0, 0, 1.50),    'Chest',       True),
        'Head':       ((0, 0, 1.50),    (0, 0, 1.74),    'Neck',        True),
        'Shoulder.L': ((0.08, 0, 1.38), (0.18, 0, 1.38), 'Chest',       False),
        'UpperArm.L': ((0.18, 0, 1.38), (0.18, 0, 1.10), 'Shoulder.L',  True),
        'ForeArm.L':  ((0.18, 0, 1.10), (0.18, 0, 0.84), 'UpperArm.L',  True),
        'Hand.L':     ((0.18, 0, 0.84), (0.18, 0, 0.74), 'ForeArm.L',   True),
        'Shoulder.R': ((-0.08, 0, 1.38),(-0.18, 0, 1.38),'Chest',       False),
        'UpperArm.R': ((-0.18, 0, 1.38),(-0.18, 0, 1.10),'Shoulder.R',  True),
        'ForeArm.R':  ((-0.18, 0, 1.10),(-0.18, 0, 0.84),'UpperArm.R',  True),
        'Hand.R':     ((-0.18, 0, 0.84),(-0.18, 0, 0.74),'ForeArm.R',   True),
        'Thigh.L':    ((0.09, 0, 0.95), (0.09, 0, 0.50), 'Root',        False),
        'Shin.L':     ((0.09, 0, 0.50), (0.09, 0, 0.08), 'Thigh.L',     True),
        'Foot.L':     ((0.09, 0, 0.08), (0.09, 0.12, 0.0),'Shin.L',     True),
        'Thigh.R':    ((-0.09, 0, 0.95),(-0.09, 0, 0.50),'Root',        False),
        'Shin.R':     ((-0.09, 0, 0.50),(-0.09, 0, 0.08),'Thigh.R',     True),
        'Foot.R':     ((-0.09, 0, 0.08),(-0.09, 0.12, 0.0),'Shin.R',    True),
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


def make_material(name, base_color, roughness=0.8, metallic=0.0):
    """Create a Principled BSDF material."""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()

    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.location = (0, 0)
    bsdf.inputs['Base Color'].default_value = (*base_color, 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic

    output = nodes.new('ShaderNodeOutputMaterial')
    output.location = (300, 0)
    mat.node_tree.links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])

    return mat


def setup_materials():
    """Create all soldier materials."""
    return {
        'uniform':  make_material('M_Uniform',  (0.13, 0.17, 0.09)),           # olive drab
        'vest':     make_material('M_Vest',      (0.33, 0.27, 0.19)),           # coyote tan
        'helmet':   make_material('M_Helmet',    (0.11, 0.11, 0.10), 0.6),      # dark charcoal
        'boots':    make_material('M_Boots',     (0.07, 0.06, 0.05)),           # near-black
        'gloves':   make_material('M_Gloves',    (0.07, 0.07, 0.06)),           # dark tactical
        'pads':     make_material('M_Pads',      (0.09, 0.11, 0.07), 0.7),      # dark olive
        'goggles':  make_material('M_Goggles',   (0.18, 0.16, 0.10), 0.3, 0.3), # lens tint
        'pouches':  make_material('M_Pouches',   (0.29, 0.23, 0.15)),           # darker tan
        'skin':     make_material('M_Skin',      (0.55, 0.40, 0.30)),           # skin tone
    }


def make_part(name, prim_type, size_params, location, bone_name, material):
    """
    Create a mesh primitive at `location`, assign vertex group for `bone_name`.

    prim_type: 'SPHERE' | 'CYLINDER' | 'CUBE'
    size_params:
      SPHERE:   radius, (optional) scale
      CYLINDER: radius, depth, (optional) scale
      CUBE:     scale (x, y, z) — full dimensions of the resulting box
    """
    bpy.ops.object.select_all(action='DESELECT')

    if prim_type == 'SPHERE':
        bpy.ops.mesh.primitive_uv_sphere_add(
            radius=size_params['radius'],
            location=location,
            segments=16, ring_count=8,
        )
    elif prim_type == 'CYLINDER':
        bpy.ops.mesh.primitive_cylinder_add(
            radius=size_params['radius'],
            depth=size_params['depth'],
            location=location,
            vertices=16,
        )
    elif prim_type == 'CUBE':
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=location)

    obj = bpy.context.object
    obj.name = name

    # Apply optional non-uniform scale
    if 'scale' in size_params:
        obj.scale = size_params['scale']

    # Bake ALL transforms into mesh (location=True is critical for skinned export)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # Vertex group matching bone name
    vg = obj.vertex_groups.new(name=bone_name)
    vg.add(list(range(len(obj.data.vertices))), 1.0, 'REPLACE')

    # Material
    obj.data.materials.append(material)

    return obj


def build_soldier(mats):
    """Assemble all body parts of the tactical soldier."""
    P = []

    # ─── HEAD ────────────────────────────────────────────────────────
    # Helmet dome — wider & flatter than bare head
    P.append(make_part('Helmet', 'SPHERE',
        {'radius': 0.14, 'scale': (1.05, 1.0, 0.88)},
        (0, 0, 1.65), 'Head', mats['helmet']))

    # Helmet rim at base
    P.append(make_part('HelmetRim', 'CYLINDER',
        {'radius': 0.148, 'depth': 0.025},
        (0, 0, 1.575), 'Head', mats['helmet']))

    # Goggles band across front of helmet
    P.append(make_part('Goggles', 'CUBE',
        {'scale': (0.24, 0.04, 0.055)},
        (0, 0.10, 1.64), 'Head', mats['goggles']))

    # Lower face / jaw visible below helmet
    P.append(make_part('Face', 'CUBE',
        {'scale': (0.10, 0.09, 0.06)},
        (0, 0.02, 1.54), 'Head', mats['skin']))

    # NVG mount on top-front of helmet
    P.append(make_part('NVGMount', 'CUBE',
        {'scale': (0.04, 0.03, 0.02)},
        (0, 0.10, 1.72), 'Head', mats['pads']))

    # ─── NECK ────────────────────────────────────────────────────────
    P.append(make_part('Neck', 'CYLINDER',
        {'radius': 0.045, 'depth': 0.10},
        (0, 0, 1.45), 'Neck', mats['uniform']))

    # High collar / neck guard from vest
    P.append(make_part('Collar', 'CYLINDER',
        {'radius': 0.07, 'depth': 0.05},
        (0, 0, 1.42), 'Neck', mats['vest']))

    # ─── CHEST / TORSO ──────────────────────────────────────────────
    # Base torso
    P.append(make_part('Torso', 'CYLINDER',
        {'radius': 0.14, 'depth': 0.35},
        (0, 0, 1.30), 'Chest', mats['uniform']))

    # Plate carrier front — sits on front surface of torso
    P.append(make_part('VestFront', 'CUBE',
        {'scale': (0.24, 0.06, 0.30)},
        (0, 0.15, 1.30), 'Chest', mats['vest']))

    # Plate carrier back
    P.append(make_part('VestBack', 'CUBE',
        {'scale': (0.22, 0.05, 0.28)},
        (0, -0.14, 1.30), 'Chest', mats['vest']))

    # Vest side panels
    P.append(make_part('VestSideL', 'CUBE',
        {'scale': (0.04, 0.12, 0.24)},
        (0.14, 0, 1.30), 'Chest', mats['vest']))

    P.append(make_part('VestSideR', 'CUBE',
        {'scale': (0.04, 0.12, 0.24)},
        (-0.14, 0, 1.30), 'Chest', mats['vest']))

    # Shoulder strap left
    P.append(make_part('StrapL', 'CUBE',
        {'scale': (0.04, 0.18, 0.025)},
        (0.08, 0.01, 1.405), 'Chest', mats['vest']))

    # Shoulder strap right
    P.append(make_part('StrapR', 'CUBE',
        {'scale': (0.04, 0.18, 0.025)},
        (-0.08, 0.01, 1.405), 'Chest', mats['vest']))

    # Magazine pouches — triple stack on front of vest
    for i, xo in enumerate([-0.065, 0.0, 0.065]):
        P.append(make_part(f'MagPouch{i}', 'CUBE',
            {'scale': (0.05, 0.045, 0.09)},
            (xo, 0.20, 1.24), 'Chest', mats['pouches']))

    # Admin pouch on upper-left vest
    P.append(make_part('AdminPouch', 'CUBE',
        {'scale': (0.06, 0.03, 0.05)},
        (0.08, 0.19, 1.38), 'Chest', mats['pouches']))

    # Radio pouch on upper-right vest
    P.append(make_part('RadioPouch', 'CUBE',
        {'scale': (0.04, 0.03, 0.07)},
        (-0.10, 0.17, 1.36), 'Chest', mats['pouches']))

    # ─── SHOULDERS ───────────────────────────────────────────────────
    # Shoulder pads (armored, larger than bare)
    P.append(make_part('ShoulderPadL', 'SPHERE',
        {'radius': 0.07},
        (0.14, 0, 1.38), 'Shoulder.L', mats['vest']))

    P.append(make_part('ShoulderPadR', 'SPHERE',
        {'radius': 0.07},
        (-0.14, 0, 1.38), 'Shoulder.R', mats['vest']))

    # ─── UPPER ARMS ─────────────────────────────────────────────────
    P.append(make_part('UpperArmL', 'CYLINDER',
        {'radius': 0.055, 'depth': 0.28},
        (0.18, 0, 1.24), 'UpperArm.L', mats['uniform']))

    P.append(make_part('UpperArmR', 'CYLINDER',
        {'radius': 0.055, 'depth': 0.28},
        (-0.18, 0, 1.24), 'UpperArm.R', mats['uniform']))

    # ─── FOREARMS ────────────────────────────────────────────────────
    P.append(make_part('ForeArmL', 'CYLINDER',
        {'radius': 0.045, 'depth': 0.26},
        (0.18, 0, 0.97), 'ForeArm.L', mats['uniform']))

    P.append(make_part('ForeArmR', 'CYLINDER',
        {'radius': 0.045, 'depth': 0.26},
        (-0.18, 0, 0.97), 'ForeArm.R', mats['uniform']))

    # Elbow pads
    P.append(make_part('ElbowPadL', 'SPHERE',
        {'radius': 0.04},
        (0.18, 0.02, 1.10), 'ForeArm.L', mats['pads']))

    P.append(make_part('ElbowPadR', 'SPHERE',
        {'radius': 0.04},
        (-0.18, 0.02, 1.10), 'ForeArm.R', mats['pads']))

    # ─── HANDS (gloved) ─────────────────────────────────────────────
    P.append(make_part('HandL', 'SPHERE',
        {'radius': 0.055, 'scale': (1.0, 0.7, 1.2)},
        (0.18, 0, 0.79), 'Hand.L', mats['gloves']))

    P.append(make_part('HandR', 'SPHERE',
        {'radius': 0.055, 'scale': (1.0, 0.7, 1.2)},
        (-0.18, 0, 0.79), 'Hand.R', mats['gloves']))

    # ─── HIPS / BELT ─────────────────────────────────────────────────
    P.append(make_part('Hips', 'CYLINDER',
        {'radius': 0.135, 'depth': 0.15},
        (0, 0, 0.97), 'Root', mats['uniform']))

    # Utility belt
    P.append(make_part('Belt', 'CYLINDER',
        {'radius': 0.148, 'depth': 0.04},
        (0, 0, 0.94), 'Root', mats['pouches']))

    # Belt pouches (front sides)
    P.append(make_part('BeltPouchL', 'CUBE',
        {'scale': (0.06, 0.05, 0.07)},
        (0.14, 0.04, 0.94), 'Root', mats['pouches']))

    P.append(make_part('BeltPouchR', 'CUBE',
        {'scale': (0.06, 0.05, 0.07)},
        (-0.14, 0.04, 0.94), 'Root', mats['pouches']))

    # Dump pouch (back of belt)
    P.append(make_part('DumpPouch', 'CUBE',
        {'scale': (0.10, 0.06, 0.08)},
        (0, -0.14, 0.93), 'Root', mats['pouches']))

    # ─── THIGHS ──────────────────────────────────────────────────────
    # Cargo pants — slightly wider than mannequin
    P.append(make_part('ThighL', 'CYLINDER',
        {'radius': 0.065, 'depth': 0.45},
        (0.09, 0, 0.725), 'Thigh.L', mats['uniform']))

    P.append(make_part('ThighR', 'CYLINDER',
        {'radius': 0.065, 'depth': 0.45},
        (-0.09, 0, 0.725), 'Thigh.R', mats['uniform']))

    # Cargo pocket on left thigh
    P.append(make_part('CargoPocketL', 'CUBE',
        {'scale': (0.03, 0.06, 0.10)},
        (0.13, 0.0, 0.72), 'Thigh.L', mats['uniform']))

    # Drop-leg holster on right thigh
    P.append(make_part('ThighHolster', 'CUBE',
        {'scale': (0.04, 0.06, 0.12)},
        (-0.14, 0.02, 0.70), 'Thigh.R', mats['pouches']))

    # Holster strap
    P.append(make_part('HolsterStrap', 'CUBE',
        {'scale': (0.065, 0.02, 0.015)},
        (-0.11, 0.02, 0.76), 'Thigh.R', mats['pouches']))

    # ─── SHINS ───────────────────────────────────────────────────────
    P.append(make_part('ShinL', 'CYLINDER',
        {'radius': 0.055, 'depth': 0.42},
        (0.09, 0, 0.29), 'Shin.L', mats['uniform']))

    P.append(make_part('ShinR', 'CYLINDER',
        {'radius': 0.055, 'depth': 0.42},
        (-0.09, 0, 0.29), 'Shin.R', mats['uniform']))

    # Knee pads
    P.append(make_part('KneePadL', 'CUBE',
        {'scale': (0.08, 0.05, 0.10)},
        (0.09, 0.06, 0.50), 'Shin.L', mats['pads']))

    P.append(make_part('KneePadR', 'CUBE',
        {'scale': (0.08, 0.05, 0.10)},
        (-0.09, 0.06, 0.50), 'Shin.R', mats['pads']))

    # ─── FEET / BOOTS ────────────────────────────────────────────────
    # Combat boots — taller and bulkier than mannequin feet
    P.append(make_part('BootL', 'CUBE',
        {'scale': (0.09, 0.22, 0.10)},
        (0.09, 0.03, 0.05), 'Foot.L', mats['boots']))

    P.append(make_part('BootR', 'CUBE',
        {'scale': (0.09, 0.22, 0.10)},
        (-0.09, 0.03, 0.05), 'Foot.R', mats['boots']))

    # Boot collar (ankle area)
    P.append(make_part('BootCollarL', 'CYLINDER',
        {'radius': 0.055, 'depth': 0.05},
        (0.09, 0, 0.12), 'Foot.L', mats['boots']))

    P.append(make_part('BootCollarR', 'CYLINDER',
        {'radius': 0.055, 'depth': 0.05},
        (-0.09, 0, 0.12), 'Foot.R', mats['boots']))

    # Boot sole (slightly wider)
    P.append(make_part('SoleL', 'CUBE',
        {'scale': (0.095, 0.23, 0.02)},
        (0.09, 0.03, 0.01), 'Foot.L', mats['boots']))

    P.append(make_part('SoleR', 'CUBE',
        {'scale': (0.095, 0.23, 0.02)},
        (-0.09, 0.03, 0.01), 'Foot.R', mats['boots']))

    print(f"Created {len(P)} body part meshes")
    return P


def parent_and_skin(armature, parts):
    """Parent all mesh parts to armature with Armature modifier."""
    for obj in parts:
        # Parent to armature
        obj.parent = armature

        # Add Armature modifier
        mod = obj.modifiers.new('Armature', 'ARMATURE')
        mod.object = armature
        mod.use_bone_envelopes = False
        mod.use_vertex_groups = True

    print(f"Skinned {len(parts)} meshes to armature")


def main():
    print("\n=== Creating Tactical Soldier ===\n")

    clear_scene()
    armature = create_armature()
    mats = setup_materials()
    parts = build_soldier(mats)
    parent_and_skin(armature, parts)

    # Save .blend
    out = 'c:/Users/jacob/fps-staking-game/visual/blender/mannequin.blend'
    bpy.ops.wm.save_as_mainfile(filepath=out)
    print(f"\nSaved: {out}")

    # Summary
    print(f"\n=== SUMMARY ===")
    print(f"Bones: {len(armature.data.bones)}")
    print(f"Mesh parts: {len(parts)}")
    print(f"Materials: {len(mats)}")

    for p in parts:
        vgs = [vg.name for vg in p.vertex_groups]
        mat_name = p.data.materials[0].name if p.data.materials else 'none'
        print(f"  {p.name:20s} bone={vgs[0]:15s} mat={mat_name}")

    print("\nTactical soldier complete!")


if __name__ == "__main__":
    main()
