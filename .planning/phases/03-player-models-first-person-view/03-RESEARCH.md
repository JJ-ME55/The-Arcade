# Phase 3: Player Models & First-Person View - Research

**Researched:** 2026-02-15
**Domain:** Blender rigged character modeling, Three.js skeletal animation, ragdoll physics, first-person weapon rendering
**Confidence:** HIGH

## Summary

This phase covers creating mannequin character models in Blender with armatures, exporting them as GLB with skinning data, loading them into Three.js as SkinnedMesh objects, applying procedural animations at runtime by manipulating bone transforms, implementing a two-pass first-person weapon renderer, and building ragdoll physics using Rapier.js.

The standard approach is: (1) Build mannequin body from geometric primitives in Blender via Python scripting, (2) Create an armature with a humanoid bone hierarchy, (3) Parent mesh parts to bones with vertex group weights, (4) Export as GLB with `export_skins=True`, (5) Load in Three.js where GLTFLoader produces SkinnedMesh + Skeleton objects, (6) Drive bones procedurally each frame using sine-wave-based animation formulas, (7) Render first-person arms in a separate pass with `renderer.clearDepth()`, (8) On death, spawn Rapier.js rigid bodies at bone positions connected by spherical/revolute joints for ragdoll.

**Primary recommendation:** Use Blender Python scripting to create two separate GLB files per team variant -- a full third-person mannequin with armature and a first-person arms-only model. Apply procedural animations at runtime by directly setting `bone.rotation` each frame. Use Rapier 3D (`@dimforge/rapier3d-compat`) for ragdoll physics with capsule/cylinder rigid bodies connected by impulse joints.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Three.js | r160 | SkinnedMesh, Skeleton, Bone, GLTFLoader | Already in project, handles skeletal animation natively |
| Blender | 5.0 | Mannequin modeling, armature rigging, GLB export | Already in project pipeline, Python scripting in background mode |
| @dimforge/rapier3d-compat | 0.19.x | Ragdoll physics (rigid bodies + joint constraints) | Modern WASM physics engine, spherical/revolute joints for ragdoll, no bundler needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| SkeletonUtils | (three.js built-in) | Clone SkinnedMesh instances | When spawning multiple players from one loaded model |
| SkeletonHelper | (three.js built-in) | Debug bone visualization | During development to verify bone positions |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Rapier.js | cannon-es | Rapier is faster (WASM), has better joint types for ragdoll. cannon-es is pure JS but slower |
| Rapier.js | ammo.js | ammo.js is Bullet port, more mature ragdoll but much larger WASM bundle (~500KB vs ~200KB) |
| Separate arm model | Hide body parts via layers | Separate model is cleaner, avoids clipping, standard FPS approach |

**Installation (Rapier):**

Add to import map in `index.html`:
```html
<script type="importmap">
{
  "imports": {
    "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
    "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/",
    "@dimforge/rapier3d-compat": "https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.19.3/rapier.es.js"
  }
}
```

Or if CDN import maps don't resolve the WASM correctly, download the package and serve locally:
```bash
npm install @dimforge/rapier3d-compat@0.19.3
```
Then serve from `node_modules` or copy the built files to `visual/lib/`.

**Rapier initialization (async, must complete before game loop):**
```javascript
import RAPIER from '@dimforge/rapier3d-compat';
await RAPIER.init();
const world = new RAPIER.World({ x: 0.0, y: -9.81, z: 0.0 });
```

## Architecture Patterns

### Recommended Project Structure
```
visual/
  main.js                    # Existing renderer (extend for player models)
  index.html                 # Add Rapier to import map
  arena_map.glb              # Existing map
  mannequin_neutral.glb      # Third-person mannequin (no team color)
  fp_arms.glb                # First-person arms model
  rifle.glb                  # Weapon model (separate file)
  pistol.glb                 # Weapon model
  knife.glb                  # Weapon model
visual/blender/
  create_mannequin.py        # Blender script: full body mannequin + armature
  create_fp_arms.py          # Blender script: first-person arms + armature
  create_weapons.py          # Blender script: rifle, pistol, knife models
  export_mannequin.py        # Export mannequin GLB with skins
  export_fp_arms.py          # Export FP arms GLB with skins
  export_weapons.py          # Export weapon GLBs (static, no armature)
  mannequin.blend            # Mannequin Blender file
  weapons.blend              # Weapons Blender file
```

### Pattern 1: Blender Mannequin Creation via Python
**What:** Create humanoid mannequin from geometric primitives with armature in Blender background mode
**When to use:** Building all character models

The mannequin body is built from Blender primitives (cylinders for limbs/torso, UV spheres for joints/head, scaled capsules for shoulders). An armature is created with a standard humanoid bone hierarchy. Each body part mesh gets a vertex group matching its controlling bone name, and an Armature modifier links mesh deformation to the skeleton.

**Bone hierarchy for mannequin (22 bones):**
```
Root (hips)
  +-- Spine
      +-- Chest
          +-- Neck
              +-- Head
          +-- Shoulder.L
              +-- UpperArm.L
                  +-- ForeArm.L
                      +-- Hand.L
          +-- Shoulder.R
              +-- UpperArm.R
                  +-- ForeArm.R
                      +-- Hand.R
  +-- Thigh.L
      +-- Shin.L
          +-- Foot.L
  +-- Thigh.R
      +-- Shin.R
          +-- Foot.R
```

**Blender Python example -- creating armature with bones:**
```python
import bpy
from mathutils import Vector

# Create armature data and object
arm_data = bpy.data.armatures.new('MannequinArmature')
arm_obj = bpy.data.objects.new('Armature', arm_data)
bpy.context.scene.collection.objects.link(arm_obj)
bpy.context.view_layer.objects.active = arm_obj

# Switch to edit mode to create bones
bpy.ops.object.mode_set(mode='EDIT')
edit_bones = arm_data.edit_bones

# Create root bone (hips)
hips = edit_bones.new('Root')
hips.head = Vector((0, 0, 1.0))   # Hips at ~1m height
hips.tail = Vector((0, 0, 1.1))

# Create spine
spine = edit_bones.new('Spine')
spine.head = Vector((0, 0, 1.1))
spine.tail = Vector((0, 0, 1.3))
spine.parent = hips

# Create chest
chest = edit_bones.new('Chest')
chest.head = Vector((0, 0, 1.3))
chest.tail = Vector((0, 0, 1.5))
chest.parent = spine

# ... continue for all bones ...

bpy.ops.object.mode_set(mode='OBJECT')
```

**Blender Python example -- creating mesh and assigning weights:**
```python
# Create a cylinder for upper arm
bpy.ops.mesh.primitive_cylinder_add(
    radius=0.06, depth=0.28,
    location=(0.22, 0, 1.35)  # Shoulder position
)
upper_arm = bpy.context.object
upper_arm.name = 'UpperArm.L'

# Create vertex group matching bone name
vg = upper_arm.vertex_groups.new(name='UpperArm.L')
# Add ALL vertices with weight 1.0
vg.add(list(range(len(upper_arm.data.vertices))), 1.0, 'REPLACE')

# Parent to armature and add Armature modifier
upper_arm.parent = arm_obj
mod = upper_arm.modifiers.new('Armature', 'ARMATURE')
mod.object = arm_obj
mod.use_bone_envelopes = False
mod.use_vertex_groups = True
```

### Pattern 2: GLB Export with Skinning Data
**What:** Export rigged mannequin from Blender to GLB with armature/skin data intact
**When to use:** After mannequin creation, before loading in Three.js

```python
bpy.ops.export_scene.gltf(
    filepath='mannequin_neutral.glb',
    export_format='GLB',
    export_skins=True,           # CRITICAL: exports skinning/armature data
    export_yup=True,             # Y-up for Three.js/glTF standard
    export_apply=True,           # Apply modifiers
    export_extras=True,          # Custom properties
    export_animations=False,     # No baked animations (procedural at runtime)
    export_cameras=False,
    export_lights=False,
)
```

**Critical export notes:**
- `export_skins=True` is required or armature data is stripped
- `export_yup=True` converts Blender Z-up to glTF Y-up (Three.js Y-up)
- Do NOT apply the armature modifier manually before export -- the exporter handles it
- All mesh objects must have proper vertex groups matching bone names
- Meshes should be at rest pose position when exported
- Joint vertex influences default to 4 (sufficient for mannequin -- each part bound to 1-2 bones)

### Pattern 3: Three.js Procedural Bone Animation
**What:** Manipulate SkinnedMesh bones directly each frame for procedural walk/run/strafe animations
**When to use:** Every frame during gameplay for all visible player models

After loading the GLB with GLTFLoader, traverse the scene to find SkinnedMesh and its Skeleton. Bones are Object3D instances -- set their `rotation` (Euler) or `quaternion` directly.

```javascript
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

// Load mannequin
const loader = new GLTFLoader();
const gltf = await loader.loadAsync('mannequin_neutral.glb');

// Find skeleton and skinned mesh
let skeleton, skinnedMesh;
gltf.scene.traverse((child) => {
  if (child.isSkinnedMesh) {
    skinnedMesh = child;
    skeleton = child.skeleton;
  }
});

// Access bones by name (from Blender bone names)
const bones = {};
skeleton.bones.forEach(bone => { bones[bone.name] = bone; });

// Procedural walk animation (called each frame)
function animateWalk(time, speed) {
  const freq = speed * 4.0;  // Walk cycle frequency proportional to speed
  const t = time * freq;

  // Leg swing (opposite phase)
  bones['Thigh.L'].rotation.x = Math.sin(t) * 0.4;
  bones['Thigh.R'].rotation.x = Math.sin(t + Math.PI) * 0.4;
  bones['Shin.L'].rotation.x = Math.max(0, -Math.sin(t) * 0.3);
  bones['Shin.R'].rotation.x = Math.max(0, -Math.sin(t + Math.PI) * 0.3);

  // Arm swing (opposite to legs)
  bones['UpperArm.L'].rotation.x = Math.sin(t + Math.PI) * 0.3;
  bones['UpperArm.R'].rotation.x = Math.sin(t) * 0.3;

  // Body bob (double frequency of walk)
  bones['Root'].position.y = 1.0 + Math.abs(Math.sin(t)) * 0.02;

  // Torso slight twist
  bones['Chest'].rotation.y = Math.sin(t) * 0.05;
}
```

### Pattern 4: Two-Pass First-Person Weapon Rendering
**What:** Render FP arms and weapon on top of the main scene with separate depth buffer
**When to use:** Every frame for the local player's first-person view

Standard FPS technique: render the world scene first, clear the depth buffer, then render the weapon scene on top. This prevents the weapon from clipping into walls while keeping it always visible.

```javascript
// Setup: two scenes, one shared camera
const worldScene = new THREE.Scene();
const weaponScene = new THREE.Scene();

// Weapon camera matches main camera FOV but with different near plane
const weaponCamera = new THREE.PerspectiveCamera(75, aspect, 0.01, 2.0);

// In render loop:
renderer.autoClear = false;
renderer.clear();                         // Clear color + depth
renderer.render(worldScene, mainCamera);  // Render world
renderer.clearDepth();                    // Clear ONLY depth buffer
renderer.render(weaponScene, weaponCamera); // Render weapon on top
```

**Alternative approach using Layers (simpler, single camera):**
```javascript
// Assign FP model to layer 1
fpArms.layers.set(1);
weapon.layers.set(1);

// Camera sees both layers
camera.layers.enable(0); // world
camera.layers.enable(1); // weapon

// Weapon model uses material with depthTest: false or renderOrder trick
fpArms.renderOrder = 999;
fpArms.traverse(child => {
  if (child.isMesh) {
    child.material.depthTest = false;
  }
});
```

The two-pass approach is recommended as it properly handles depth, prevents wall clipping, and is the standard technique used in FPS games.

### Pattern 5: Team Color Material Swap
**What:** Change mannequin material color at runtime for red/blue teams
**When to use:** When spawning a player model or changing teams

```javascript
// After loading the mannequin GLB, clone for each player
const playerModel = SkeletonUtils.clone(gltf.scene);

// Set team color on all mesh materials
const teamColor = isRedTeam ? 0xcc2200 : 0x2244cc;
playerModel.traverse((child) => {
  if (child.isMesh) {
    // Clone material so each instance is independent
    child.material = child.material.clone();
    child.material.color.setHex(teamColor);
  }
});
```

**Important:** Always clone materials when creating team variants. Skinned meshes cannot share materials across instances (Three.js requirement).

### Pattern 6: Ragdoll Physics with Rapier.js
**What:** On death, replace animated skeleton with physics-driven rigid bodies
**When to use:** When a player's HP reaches 0

```javascript
import RAPIER from '@dimforge/rapier3d-compat';

function createRagdoll(skeleton, world, velocity) {
  const bodies = {};

  // Create rigid body for each major bone
  // Torso (hips -> chest)
  const torsoDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(skeleton.bones[0].getWorldPosition(new THREE.Vector3()).x,
                    skeleton.bones[0].getWorldPosition(new THREE.Vector3()).y,
                    skeleton.bones[0].getWorldPosition(new THREE.Vector3()).z)
    .setLinvel({ x: velocity.x, y: velocity.y, z: velocity.z });
  bodies.torso = world.createRigidBody(torsoDesc);
  const torsoCollider = RAPIER.ColliderDesc.capsule(0.2, 0.1);
  world.createCollider(torsoCollider, bodies.torso);

  // Upper arm
  const armDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(/* bone world position */);
  bodies.upperArmL = world.createRigidBody(armDesc);
  const armCollider = RAPIER.ColliderDesc.capsule(0.14, 0.04);
  world.createCollider(armCollider, bodies.upperArmL);

  // Connect with spherical joint (shoulder)
  const shoulderParams = RAPIER.JointData.spherical(
    { x: 0.2, y: 0.15, z: 0.0 },  // anchor on torso
    { x: 0.0, y: 0.14, z: 0.0 }   // anchor on upper arm
  );
  world.createImpulseJoint(shoulderParams, bodies.torso, bodies.upperArmL, true);

  // Elbow: revolute joint (single-axis rotation)
  const elbowParams = RAPIER.JointData.revolute(
    { x: 0.0, y: -0.14, z: 0.0 },  // anchor on upper arm
    { x: 0.0, y: 0.12, z: 0.0 },   // anchor on forearm
    { x: 1.0, y: 0.0, z: 0.0 }     // axis
  );
  world.createImpulseJoint(elbowParams, bodies.upperArmL, bodies.foreArmL, true);

  // ... repeat for all limbs ...
  return bodies;
}

// In physics tick: step world, then sync visual mesh positions
function updateRagdollVisuals(bodies, meshParts) {
  for (const [name, body] of Object.entries(bodies)) {
    const pos = body.translation();
    const rot = body.rotation();
    meshParts[name].position.set(pos.x, pos.y, pos.z);
    meshParts[name].quaternion.set(rot.x, rot.y, rot.z, rot.w);
  }
}
```

### Anti-Patterns to Avoid
- **Do NOT animate bones using AnimationMixer/AnimationClip for procedural motion.** Directly set `bone.rotation` each frame instead. AnimationMixer is for playing back pre-baked keyframe animations from files.
- **Do NOT use `bone.position` for limb rotation.** Use `bone.rotation.x/y/z` (Euler) for rotating limbs. Only use `bone.position` for the root bone (body bob).
- **Do NOT share materials between SkinnedMesh instances.** Always clone materials per instance.
- **Do NOT call `skeleton.calculateInverses()` at runtime.** This is only needed once during setup; calling it every frame will break the bind pose.
- **Do NOT apply the Armature modifier in Blender before export.** The glTF exporter handles armature export automatically. Applying it bakes the deformation and loses the skeleton.
- **Do NOT export animations from Blender.** All animation is procedural at runtime. Export only the rest pose.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Physics ragdoll | Custom spring/constraint system | Rapier.js with spherical/revolute joints | Joint limits, collision response, stability are extremely hard to get right |
| SkinnedMesh cloning | Manual bone/mesh copying | SkeletonUtils.clone() | Handles skeleton hierarchy, bone references, skinning indices correctly |
| Bone matrix computation | Manual matrix multiplication | Three.js Skeleton.update() | GPU skinning pipeline expects specific matrix format |
| GLTF loading/parsing | Custom binary parser | GLTFLoader (already used) | Handles all glTF extensions, skinning, material conversion |
| Weapon depth rendering | Custom shader depth tricks | renderer.clearDepth() two-pass | Battle-tested approach, works with all materials |

**Key insight:** The most complex subsystem is ragdoll physics. Implementing stable constrained rigid body simulation from scratch is a multi-month project. Rapier.js provides production-quality joint constraints with WASM performance. Use it.

## Common Pitfalls

### Pitfall 1: SkinnedMesh Not Visible After Loading
**What goes wrong:** GLB loads successfully but the mannequin is invisible or renders as a deformed blob.
**Why it happens:** (a) Vertex groups don't match bone names exactly, (b) weights are zero or missing, (c) mesh transforms weren't applied in Blender before adding armature modifier, (d) `export_skins` was not set to True.
**How to avoid:** In Blender script, verify every mesh object has a vertex group with a name that exactly matches a bone name. Use `export_skins=True` in export. Test in the glTF Viewer (https://gltf-viewer.donmccurdy.com/) before loading in-game.
**Warning signs:** Mesh appears at world origin as a flat/stretched shape, or does not appear at all.

### Pitfall 2: Bones Have Wrong Rest Orientation
**What goes wrong:** Setting `bone.rotation.x = 0.5` rotates the limb in an unexpected direction.
**Why it happens:** Blender and Three.js use different conventions for bone orientation. Blender bones point from head to tail along the local Y axis. After glTF export with Y-up conversion, bone local axes may not align with expectations.
**How to avoid:** During Blender script creation, orient bones carefully. The bone's local Y axis points from head to tail. Test rotation axes after loading in Three.js using SkeletonHelper + AxesHelper attached to bones.
**Warning signs:** Arms swing sideways when they should swing forward.

### Pitfall 3: Ragdoll Bodies Explode on Spawn
**What goes wrong:** When ragdoll activates, body parts fly apart violently.
**Why it happens:** (a) Rigid body initial positions don't match bone world positions, (b) joint anchors are offset incorrectly, (c) initial velocity is too high, (d) physics timestep is too large.
**How to avoid:** Read bone world positions at the exact moment of death using `bone.getWorldPosition()`. Place rigid bodies exactly at those positions. Apply the player's velocity at death as initial linear velocity. Step Rapier at a fixed rate (e.g., 60Hz).
**Warning signs:** Bodies teleport to origin or scatter explosively in the first frame.

### Pitfall 4: First-Person Arms Clip Through Walls
**What goes wrong:** The FP arm model intersects with world geometry when standing near walls.
**Why it happens:** Single-pass rendering where FP arms share the depth buffer with the world scene.
**How to avoid:** Use the two-pass rendering pattern: render world first, clear depth buffer, then render FP scene. The weapon camera should have a small near plane (0.01) and small far plane (2.0).
**Warning signs:** Parts of the arm disappear when near walls, or arms render behind wall geometry.

### Pitfall 5: Mannequin Proportions Look Wrong In-Game
**What goes wrong:** The mannequin looks too tall, too short, or disproportionate in the game world.
**Why it happens:** Blender uses meters, Three.js/glTF uses meters, but the game's scale may differ. The player capsule is 1.8m tall. The mannequin must match.
**How to avoid:** Design mannequin to be exactly 1.8m tall (matching the player capsule height). Use 7.5 head-heights as proportion guide: head = 0.24m, so total = 1.8m. Verify by placing mannequin next to the player capsule collision shape.
**Warning signs:** Mannequin head clips through doorways, or mannequin appears to hover above ground.

### Pitfall 6: Performance Drops with Multiple Animated Characters
**What goes wrong:** FPS drops below 60 when 4+ animated mannequins are in the scene.
**Why it happens:** Each SkinnedMesh requires unique material and per-frame skeleton update. Materials cannot be shared between skinned meshes.
**How to avoid:** For a 1v1/2v2 game (max 4 players), standard SkinnedMesh is fine -- performance concerns only arise at 20+ characters. Keep mannequin geometry simple (low poly primitives). Use SkeletonUtils.clone() for proper instancing.
**Warning signs:** GPU draw calls spike per character, frame time increases linearly with player count.

## Code Examples

### Complete Blender Mannequin Creation Script (Skeleton)
```python
import bpy
from mathutils import Vector, Matrix

def create_mannequin_armature():
    """Create a humanoid armature with proper bone hierarchy."""
    # Clear selection
    bpy.ops.object.select_all(action='DESELECT')

    # Create armature
    arm_data = bpy.data.armatures.new('MannequinArmature')
    arm_obj = bpy.data.objects.new('Mannequin_Armature', arm_data)
    bpy.context.scene.collection.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj
    arm_obj.select_set(True)

    bpy.ops.object.mode_set(mode='EDIT')
    bones = arm_data.edit_bones

    # Mannequin: 1.8m tall, ~7.5 heads (head = 0.24m)
    # Blender Z-up: height along Z axis
    # All positions in Blender space (Z-up)
    bone_defs = {
        # name: (head_pos, tail_pos, parent_name, connected)
        'Root':       ((0, 0, 0.95),  (0, 0, 1.05),  None, False),
        'Spine':      ((0, 0, 1.05),  (0, 0, 1.20),  'Root', True),
        'Chest':      ((0, 0, 1.20),  (0, 0, 1.40),  'Spine', True),
        'Neck':       ((0, 0, 1.40),  (0, 0, 1.50),  'Chest', True),
        'Head':       ((0, 0, 1.50),  (0, 0, 1.74),  'Neck', True),
        # Left arm
        'Shoulder.L': ((0.08, 0, 1.38), (0.18, 0, 1.38), 'Chest', False),
        'UpperArm.L': ((0.18, 0, 1.38), (0.18, 0, 1.10), 'Shoulder.L', True),
        'ForeArm.L':  ((0.18, 0, 1.10), (0.18, 0, 0.84), 'UpperArm.L', True),
        'Hand.L':     ((0.18, 0, 0.84), (0.18, 0, 0.74), 'ForeArm.L', True),
        # Right arm
        'Shoulder.R': ((-0.08, 0, 1.38), (-0.18, 0, 1.38), 'Chest', False),
        'UpperArm.R': ((-0.18, 0, 1.38), (-0.18, 0, 1.10), 'Shoulder.R', True),
        'ForeArm.R':  ((-0.18, 0, 1.10), (-0.18, 0, 0.84), 'UpperArm.R', True),
        'Hand.R':     ((-0.18, 0, 0.84), (-0.18, 0, 0.74), 'ForeArm.R', True),
        # Left leg
        'Thigh.L':    ((0.09, 0, 0.95), (0.09, 0, 0.50), 'Root', False),
        'Shin.L':     ((0.09, 0, 0.50), (0.09, 0, 0.08), 'Thigh.L', True),
        'Foot.L':     ((0.09, 0, 0.08), (0.09, 0.12, 0.0), 'Shin.L', True),
        # Right leg
        'Thigh.R':    ((-0.09, 0, 0.95), (-0.09, 0, 0.50), 'Root', False),
        'Shin.R':     ((-0.09, 0, 0.50), (-0.09, 0, 0.08), 'Thigh.R', True),
        'Foot.R':     ((-0.09, 0, 0.08), (-0.09, 0.12, 0.0), 'Shin.R', True),
    }

    for name, (head, tail, parent_name, connected) in bone_defs.items():
        bone = bones.new(name)
        bone.head = Vector(head)
        bone.tail = Vector(tail)
        if parent_name:
            bone.parent = bones[parent_name]
            bone.use_connect = connected

    bpy.ops.object.mode_set(mode='OBJECT')
    return arm_obj
```

### GLB Loading and Bone Access in Three.js
```javascript
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { SkeletonHelper } from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

class PlayerModel {
  constructor(scene) {
    this.scene = scene;
    this.bones = {};
    this.model = null;
    this.skeleton = null;
  }

  async load(url) {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(url);
    this.sourceModel = gltf.scene;

    // Find skeleton
    gltf.scene.traverse((child) => {
      if (child.isSkinnedMesh) {
        this.skeleton = child.skeleton;
      }
    });
  }

  spawn(teamColor, position) {
    // Clone for this player instance
    this.model = SkeletonUtils.clone(this.sourceModel);

    // Build bone lookup
    this.model.traverse((child) => {
      if (child.isBone) {
        this.bones[child.name] = child;
      }
      if (child.isSkinnedMesh) {
        // Set team color (clone material for independence)
        child.material = child.material.clone();
        child.material.color.setHex(teamColor);
        // Ensure frustum culling doesn't hide animated mesh
        child.frustumCulled = false;
      }
    });

    this.model.position.copy(position);
    this.scene.add(this.model);

    // Debug: show skeleton
    // const helper = new SkeletonHelper(this.model);
    // this.scene.add(helper);
  }

  // Update procedural animation based on movement state
  updateAnimation(dt, state) {
    if (!this.bones['Root']) return;

    const speed = Math.hypot(state.velX, state.velZ);
    const moving = speed > 0.5;

    if (state.onGround && moving) {
      this._animateRun(state.time, speed);
    } else if (!state.onGround) {
      this._animateJump();
    } else {
      this._animateIdle();
    }

    if (state.crouching) {
      this._applyCrouch();
    }
  }

  _animateRun(time, speed) {
    const freq = speed * 1.2; // cycles per second
    const t = time * freq * Math.PI * 2;
    const amplitude = Math.min(speed / 4.5, 1.0); // max at full speed

    // Legs
    this.bones['Thigh.L'].rotation.x = Math.sin(t) * 0.5 * amplitude;
    this.bones['Thigh.R'].rotation.x = Math.sin(t + Math.PI) * 0.5 * amplitude;
    this.bones['Shin.L'].rotation.x = -Math.abs(Math.sin(t)) * 0.4 * amplitude;
    this.bones['Shin.R'].rotation.x = -Math.abs(Math.sin(t + Math.PI)) * 0.4 * amplitude;

    // Arms (opposite phase to legs)
    this.bones['UpperArm.L'].rotation.x = Math.sin(t + Math.PI) * 0.35 * amplitude;
    this.bones['UpperArm.R'].rotation.x = Math.sin(t) * 0.35 * amplitude;
    this.bones['ForeArm.L'].rotation.x = -0.2 - Math.abs(Math.sin(t + Math.PI)) * 0.2 * amplitude;
    this.bones['ForeArm.R'].rotation.x = -0.2 - Math.abs(Math.sin(t)) * 0.2 * amplitude;

    // Subtle body bob
    this.bones['Root'].position.y += Math.abs(Math.sin(t)) * 0.015 * amplitude;

    // Chest twist
    this.bones['Chest'].rotation.y = Math.sin(t) * 0.04 * amplitude;
  }

  _animateIdle() {
    // Reset all rotations to rest pose
    for (const bone of Object.values(this.bones)) {
      bone.rotation.set(0, 0, 0);
    }
  }

  _animateJump() {
    // Slight tuck
    this.bones['Thigh.L'].rotation.x = -0.2;
    this.bones['Thigh.R'].rotation.x = -0.2;
    this.bones['Shin.L'].rotation.x = -0.3;
    this.bones['Shin.R'].rotation.x = -0.3;
  }

  _applyCrouch() {
    this.bones['Root'].position.y -= 0.3;
    this.bones['Thigh.L'].rotation.x -= 0.4;
    this.bones['Thigh.R'].rotation.x -= 0.4;
    this.bones['Shin.L'].rotation.x -= 0.3;
    this.bones['Shin.R'].rotation.x -= 0.3;
  }
}
```

### Gun Bob and Recoil for First-Person View
```javascript
class FirstPersonWeapon {
  constructor(weaponScene, camera) {
    this.scene = weaponScene;
    this.camera = camera;
    this.bobTime = 0;
    this.recoilOffset = 0;
    this.recoilDecay = 10.0; // Spring-back speed
  }

  update(dt, state) {
    // Gun bob: sinusoidal sway synced to footstep frequency
    if (state.onGround && state.speed > 0.5) {
      this.bobTime += dt * state.speed * 1.5;
    } else {
      // Smoothly return to center when not moving
      this.bobTime += dt * 0.5;
    }

    const bobX = Math.sin(this.bobTime * Math.PI * 2) * 0.008 * Math.min(state.speed / 4.5, 1.0);
    const bobY = Math.abs(Math.sin(this.bobTime * Math.PI * 2)) * 0.006 * Math.min(state.speed / 4.5, 1.0);

    // Recoil kick: instant backward offset that springs back
    this.recoilOffset = Math.max(0, this.recoilOffset - this.recoilDecay * dt);

    // Apply to weapon model (attached to camera)
    // Default weapon position: slightly right and down from center
    this.weaponGroup.position.set(
      0.15 + bobX,                    // Right of center + bob
      -0.12 + bobY,                   // Below center + bob
      -0.3 + this.recoilOffset * 0.1  // In front of camera + recoil pushback
    );

    // Recoil rotation (slight upward kick)
    this.weaponGroup.rotation.x = -this.recoilOffset * 0.15;
  }

  fire() {
    this.recoilOffset = 1.0; // Instant kick

    // Muzzle flash: sprite with additive blending, visible 1-2 frames
    this._showMuzzleFlash();
  }

  _showMuzzleFlash() {
    const flash = this.muzzleFlashSprite;
    flash.visible = true;
    flash.material.opacity = 1.0;
    // Random rotation for variety
    flash.material.rotation = Math.random() * Math.PI * 2;

    // Auto-hide after 50ms (3 frames at 60fps)
    setTimeout(() => { flash.visible = false; }, 50);
  }
}
```

### Muzzle Flash Setup
```javascript
// Create muzzle flash sprite
const flashTexture = createMuzzleFlashTexture(); // Procedural or loaded
const flashMaterial = new THREE.SpriteMaterial({
  map: flashTexture,
  blending: THREE.AdditiveBlending,
  color: 0xffaa44,
  transparent: true,
  depthTest: false,
});
const muzzleFlash = new THREE.Sprite(flashMaterial);
muzzleFlash.scale.set(0.15, 0.15, 1);
muzzleFlash.position.set(0, 0, -0.45); // At muzzle of weapon
muzzleFlash.visible = false;
weaponGroup.add(muzzleFlash);

// Procedural flash texture (no external file needed)
function createMuzzleFlashTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
  gradient.addColorStop(0.3, 'rgba(255, 180, 50, 0.8)');
  gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}
```

### Two-Pass Rendering Integration
```javascript
// In existing MovementVisualizer, modify _loop():
_loop() {
  // ... existing fixed timestep simulation ...

  // Update camera position (existing code)
  // ...

  // === NEW: Two-pass rendering ===
  this.renderer.autoClear = false;
  this.renderer.clear();

  // Pass 1: World scene (map + other players)
  this.renderer.render(this.scene, this.camera);

  // Pass 2: Weapon/FP arms (renders on top, no depth conflict)
  this.renderer.clearDepth();
  // Weapon camera tracks main camera orientation
  this.weaponCamera.quaternion.copy(this.camera.quaternion);
  this.renderer.render(this.weaponScene, this.weaponCamera);

  requestAnimationFrame(() => this._loop());
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JSON model format | glTF/GLB | Three.js ~r90 (2018) | GLB is the standard, JSON loader deprecated |
| Manual bone matrix calc | GPU skinning via Skeleton.update() | Three.js ~r73 | Automatic bone texture upload for GPU skinning |
| cannon.js for physics | Rapier.js (WASM) | 2022+ | 2-4x faster, better joint constraint system |
| SkinnedMesh.clone() | SkeletonUtils.clone() | Three.js r125+ | Proper deep clone of skeleton hierarchy |
| Baked animations in file | Procedural bone manipulation | Always available | No animation file needed, dynamic response to gameplay |

**Deprecated/outdated:**
- `THREE.JSONLoader` -- removed, use GLTFLoader
- `cannon.js` (original) -- unmaintained, use cannon-es or Rapier
- `THREE.SkinnedMesh.initBones()` -- removed, bones come from Skeleton
- Direct `renderer.state.buffers.depth.setClear()` -- internal API, use `renderer.clearDepth()`

## Open Questions

1. **Rapier.js CDN import map compatibility**
   - What we know: The `-compat` package embeds WASM as base64 in JS, avoiding separate .wasm file loading issues
   - What's unclear: Whether the CDN-served ES module works correctly with browser import maps without a bundler
   - Recommendation: Test CDN import first. If WASM init fails, fall back to serving from local `node_modules` or a copied file in `visual/lib/`. LOW confidence on CDN working out of the box.

2. **Blender 5.0 `export_skins` parameter name**
   - What we know: Blender 3.x/4.x uses `export_skins=True` in `bpy.ops.export_scene.gltf`
   - What's unclear: Whether Blender 5.0 changed any parameter names in the gltf exporter
   - Recommendation: Test the export script first. If parameter name changed, check Blender 5.0 Python console with `help(bpy.ops.export_scene.gltf)`. MEDIUM confidence the parameter name is unchanged.

3. **Bone orientation after Y-up conversion**
   - What we know: Blender is Z-up, glTF/Three.js is Y-up. The exporter converts automatically.
   - What's unclear: Exactly which local axes of bones end up where after conversion, which affects which rotation axis to use for procedural animation.
   - Recommendation: Create a test mannequin first, load it, add AxesHelper to each bone, and empirically determine rotation axes. MEDIUM confidence on the bone orientation assumptions in code examples above.

4. **Ragdoll visual sync approach**
   - What we know: Need to convert from animated SkinnedMesh to physics-driven ragdoll on death.
   - What's unclear: Whether to keep SkinnedMesh and drive bones from physics body positions, or switch to separate mesh parts. Driving SkinnedMesh bones from physics would look seamless but may have matrix update issues.
   - Recommendation: Use the simpler approach first -- spawn separate simple mesh parts (cylinders/spheres) at bone positions, disable the SkinnedMesh. This avoids the complexity of reverse-driving bones from physics. The ragdoll only needs to look roughly right for 2-3 seconds. MEDIUM confidence.

## Sources

### Primary (HIGH confidence)
- [Blender Python API - Armature](https://docs.blender.org/api/current/bpy.types.Armature.html) - Armature, EditBone, Bone classes
- [Blender Python API - Armature Gotchas](https://docs.blender.org/api/current/info_gotchas_armatures_and_bones.html) - Mode switching requirements
- [Blender Python API - VertexGroup](https://docs.blender.org/api/current/bpy.types.VertexGroup.html) - Weight assignment API
- [Blender Python API - ArmatureModifier](https://docs.blender.org/api/current/bpy.types.ArmatureModifier.html) - Modifier configuration
- [Rapier.js Joints Documentation](https://rapier.rs/docs/user_guides/javascript/joints/) - Spherical, revolute joint creation
- [Rapier.js Rigid Bodies](https://rapier.rs/docs/user_guides/javascript/rigid_bodies/) - Body types and positioning
- [Rapier.js Getting Started](https://rapier.rs/docs/user_guides/javascript/getting_started_js/) - WASM initialization
- [Three.js DeepWiki - Skeletal Animation](https://deepwiki.com/mrdoob/three.js/5.2-object-manipulation) - SkinnedMesh/Skeleton architecture

### Secondary (MEDIUM confidence)
- [Blender to Three.js Export Guide](https://github.com/funwithtriangles/blender-to-threejs-export-guide) - Export settings, gotchas
- [Blender Armature Python Cookbook](https://wiki.blender.jp/Dev:Py/Scripts/Cookbook/Code_snippets/Armatures) - Complete rigging script examples
- [Adam Madej - Skeleton Hierarchy](https://adammadej.com/posts/202505-skeletonhierarchy_blender/) - Bone hierarchy creation pattern
- [Visualizing Three.js Bone Orientations](https://mattrossman.com/2024/07/10/visualizing-threejs-bone-orientations/) - Bone axis debugging
- [Three.js SkeletonUtils Cloning](https://www.typeee.com/post/66881d3194a0f9c2158d745f) - Proper clone workflow
- [@dimforge/rapier3d-compat npm](https://www.npmjs.com/package/@dimforge/rapier3d-compat) - Version 0.19.3, WASM compat package

### Tertiary (LOW confidence)
- WebSearch results on procedural walk cycle sine wave patterns - general game dev knowledge, not Three.js-specific verified
- WebSearch on SkinnedMesh performance limits (~20-30 before degradation) - approximate, varies by hardware
- WebSearch on muzzle flash implementation - general technique, no specific Three.js example verified

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Three.js r160 SkinnedMesh API well-documented, Rapier.js joints verified from official docs, Blender armature API confirmed from official Python docs
- Architecture: HIGH - Two-pass rendering, bone manipulation, SkeletonUtils.clone all verified from official sources
- Blender scripting: HIGH - Armature creation, vertex groups, armature modifier all confirmed from official Blender Python API
- GLB export with skins: MEDIUM - `export_skins` parameter confirmed for Blender 3.x/4.x, not verified for Blender 5.0 specifically
- Ragdoll physics: MEDIUM - Rapier joint types verified, but Three.js-to-Rapier bone mapping pattern is assembled from multiple sources rather than a single authoritative guide
- Procedural animation formulas: MEDIUM - Sine-wave approach is standard game dev, but specific amplitude/frequency values are estimates requiring tuning
- Pitfalls: HIGH - Common issues well-documented across multiple GitHub issues and community discussions

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (30 days - Three.js r160 and Rapier 0.19.x are stable)
