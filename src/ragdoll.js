/**
 * RagdollSystem - Physics-driven ragdoll spawning and simulation using Rapier.js
 *
 * When a mannequin dies, its animated SkinnedMesh is hidden and replaced by
 * physics-driven body part meshes that collapse under gravity with joint constraints.
 */
export class RagdollSystem {
  constructor(THREE) {
    this.THREE = THREE;
    this.RAPIER = null;
    this.world = null;
    this.ragdolls = [];
    this.groundCreated = false;
  }

  /**
   * Initialize Rapier WASM (must await before use)
   */
  async init() {
    // Dynamic import so CDN failure doesn't block the entire page
    const RAPIER = (await import('@dimforge/rapier3d-compat')).default;
    await RAPIER.init();
    this.RAPIER = RAPIER;

    // Create physics world with gravity
    this.world = new RAPIER.World({ x: 0.0, y: -9.81, z: 0.0 });

    // Ground collider. Rapier's JS ColliderDesc has no halfSpace factory (it only
    // exists in the raw WASM), so use a large thin cuboid whose TOP surface sits
    // at y=0 — the arena floor level — for dead bodies to settle on.
    const groundDesc = RAPIER.ColliderDesc.cuboid(200, 0.5, 200).setTranslation(0, -0.5, 0);
    this.world.createCollider(groundDesc);
    this.groundCreated = true;

    console.log('RagdollSystem initialized with Rapier.js');
  }

  /**
   * Create ragdoll from a PlayerModel instance's current bone positions
   * @param {object} playerInstance - PlayerModel instance with { scene, bones, model, ... }
   * @param {THREE.Vector3} velocity - Initial velocity (from player movement at death)
   * @param {THREE.Scene} scene - Three.js scene to add visual meshes to
   */
  spawnRagdoll(playerInstance, velocity, scene) {
    const THREE = this.THREE;
    const RAPIER = this.RAPIER;

    if (!RAPIER || !this.world) {
      console.warn('RagdollSystem not initialized, cannot spawn ragdoll');
      return;
    }

    // Hide the SkinnedMesh model
    playerInstance.scene.visible = false;

    // Read bone world positions
    const bonePositions = {};
    for (const [name, bone] of Object.entries(playerInstance.bones)) {
      const wp = new THREE.Vector3();
      bone.getWorldPosition(wp);
      bonePositions[name] = wp;
    }

    // Get team color from the instance
    const teamColor = playerInstance.teamColor || 0xcccccc;

    // Create rigid bodies and colliders for major body segments (12 bodies)
    const bodies = {};
    const visuals = {};

    // Helper to create a dynamic rigid body with capsule collider
    const createBody = (name, pos, halfHeight, radius, linvel = velocity) => {
      const desc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(pos.x, pos.y, pos.z)
        .setLinvel(linvel.x, linvel.y, linvel.z)
        .setLinearDamping(0.5)    // Slow down over time
        .setAngularDamping(0.5);  // Reduce spinning
      const body = this.world.createRigidBody(desc);

      const collider = RAPIER.ColliderDesc.capsule(halfHeight, radius)
        .setRestitution(0.1)      // Low bounce
        .setFriction(0.8)         // High friction (don't slide forever)
        // Membership group 2, collide only with group 1 (the ground): ragdoll
        // parts overlap at joints, so self-collision makes them jitter forever.
        .setCollisionGroups(0x00020001);
      this.world.createCollider(collider, body);

      bodies[name] = body;
      return body;
    };

    // Helper to create a sphere collider rigid body
    const createSphereBody = (name, pos, radius, linvel = velocity) => {
      const desc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(pos.x, pos.y, pos.z)
        .setLinvel(linvel.x, linvel.y, linvel.z)
        .setLinearDamping(0.5)
        .setAngularDamping(0.5);
      const body = this.world.createRigidBody(desc);

      const collider = RAPIER.ColliderDesc.ball(radius)
        .setRestitution(0.1)
        .setFriction(0.8)
        .setCollisionGroups(0x00020001); // group 2, collide only with ground (no self-collision)
      this.world.createCollider(collider, body);

      bodies[name] = body;
      return body;
    };

    // Create visual mesh for capsule (cylinder)
    const createCapsuleVisual = (halfHeight, radius, color) => {
      const geometry = new THREE.CylinderGeometry(radius, radius, halfHeight * 2, 8);
      const material = new THREE.MeshStandardMaterial({ color });
      return new THREE.Mesh(geometry, material);
    };

    // Create visual mesh for sphere
    const createSphereVisual = (radius, color) => {
      const geometry = new THREE.SphereGeometry(radius, 8, 8);
      const material = new THREE.MeshStandardMaterial({ color });
      return new THREE.Mesh(geometry, material);
    };

    // HEAD (sphere)
    const headPos = bonePositions['Head'] || new THREE.Vector3(0, 1.7, 0);
    createSphereBody('head', headPos, 0.12);
    visuals.head = createSphereVisual(0.12, teamColor);
    scene.add(visuals.head);

    // TORSO UPPER (Chest) - capsule
    const chestPos = bonePositions['Chest'] || new THREE.Vector3(0, 1.3, 0);
    createBody('torsoUpper', chestPos, 0.15, 0.12);
    visuals.torsoUpper = createCapsuleVisual(0.15, 0.12, teamColor);
    scene.add(visuals.torsoUpper);

    // TORSO LOWER (Spine/Root) - capsule
    const rootPos = bonePositions['Root'] || new THREE.Vector3(0, 1.0, 0);
    createBody('torsoLower', rootPos, 0.12, 0.10);
    visuals.torsoLower = createCapsuleVisual(0.12, 0.10, teamColor);
    scene.add(visuals.torsoLower);

    // UPPER ARMS - capsules
    const upperArmLPos = bonePositions['UpperArm.L'] || new THREE.Vector3(-0.2, 1.3, 0);
    const upperArmRPos = bonePositions['UpperArm.R'] || new THREE.Vector3(0.2, 1.3, 0);
    createBody('upperArmL', upperArmLPos, 0.12, 0.04);
    createBody('upperArmR', upperArmRPos, 0.12, 0.04);
    visuals.upperArmL = createCapsuleVisual(0.12, 0.04, teamColor);
    visuals.upperArmR = createCapsuleVisual(0.12, 0.04, teamColor);
    scene.add(visuals.upperArmL);
    scene.add(visuals.upperArmR);

    // FOREARMS - capsules
    const foreArmLPos = bonePositions['ForeArm.L'] || new THREE.Vector3(-0.2, 1.0, 0);
    const foreArmRPos = bonePositions['ForeArm.R'] || new THREE.Vector3(0.2, 1.0, 0);
    createBody('foreArmL', foreArmLPos, 0.11, 0.035);
    createBody('foreArmR', foreArmRPos, 0.11, 0.035);
    visuals.foreArmL = createCapsuleVisual(0.11, 0.035, teamColor);
    visuals.foreArmR = createCapsuleVisual(0.11, 0.035, teamColor);
    scene.add(visuals.foreArmL);
    scene.add(visuals.foreArmR);

    // THIGHS - capsules
    const thighLPos = bonePositions['Thigh.L'] || new THREE.Vector3(-0.1, 0.6, 0);
    const thighRPos = bonePositions['Thigh.R'] || new THREE.Vector3(0.1, 0.6, 0);
    createBody('thighL', thighLPos, 0.20, 0.05);
    createBody('thighR', thighRPos, 0.20, 0.05);
    visuals.thighL = createCapsuleVisual(0.20, 0.05, teamColor);
    visuals.thighR = createCapsuleVisual(0.20, 0.05, teamColor);
    scene.add(visuals.thighL);
    scene.add(visuals.thighR);

    // SHINS - capsules
    const shinLPos = bonePositions['Shin.L'] || new THREE.Vector3(-0.1, 0.2, 0);
    const shinRPos = bonePositions['Shin.R'] || new THREE.Vector3(0.1, 0.2, 0);
    createBody('shinL', shinLPos, 0.18, 0.04);
    createBody('shinR', shinRPos, 0.18, 0.04);
    visuals.shinL = createCapsuleVisual(0.18, 0.04, teamColor);
    visuals.shinR = createCapsuleVisual(0.18, 0.04, teamColor);
    scene.add(visuals.shinL);
    scene.add(visuals.shinR);

    // Create joints between connected body parts
    const joints = [];

    // Helper to create spherical joint
    const createSphericalJoint = (parent, child, anchorOnParent, anchorOnChild) => {
      const params = RAPIER.JointData.spherical(
        { x: anchorOnParent.x, y: anchorOnParent.y, z: anchorOnParent.z },
        { x: anchorOnChild.x, y: anchorOnChild.y, z: anchorOnChild.z }
      );
      const joint = this.world.createImpulseJoint(params, parent, child, true);
      joints.push(joint);
      return joint;
    };

    // Helper to create revolute joint (single-axis rotation)
    const createRevoluteJoint = (parent, child, anchorOnParent, anchorOnChild, axis) => {
      const params = RAPIER.JointData.revolute(
        { x: anchorOnParent.x, y: anchorOnParent.y, z: anchorOnParent.z },
        { x: anchorOnChild.x, y: anchorOnChild.y, z: anchorOnChild.z },
        { x: axis.x, y: axis.y, z: axis.z }
      );
      const joint = this.world.createImpulseJoint(params, parent, child, true);
      joints.push(joint);
      return joint;
    };

    // NECK (Head -> Torso upper): spherical joint
    createSphericalJoint(
      bodies.torsoUpper,
      bodies.head,
      { x: 0, y: 0.15, z: 0 },  // Top of chest
      { x: 0, y: -0.12, z: 0 }  // Bottom of head
    );

    // SPINE (Torso upper -> Torso lower): spherical joint
    createSphericalJoint(
      bodies.torsoLower,
      bodies.torsoUpper,
      { x: 0, y: 0.12, z: 0 },  // Top of lower torso
      { x: 0, y: -0.15, z: 0 }  // Bottom of upper torso
    );

    // SHOULDERS (Torso upper -> Upper arms): spherical joints
    createSphericalJoint(
      bodies.torsoUpper,
      bodies.upperArmL,
      { x: -0.12, y: 0.10, z: 0 },  // Left shoulder position on chest
      { x: 0, y: 0.12, z: 0 }        // Top of upper arm
    );
    createSphericalJoint(
      bodies.torsoUpper,
      bodies.upperArmR,
      { x: 0.12, y: 0.10, z: 0 },   // Right shoulder position on chest
      { x: 0, y: 0.12, z: 0 }        // Top of upper arm
    );

    // ELBOWS (Upper arms -> Forearms): revolute joints (single-axis)
    createRevoluteJoint(
      bodies.upperArmL,
      bodies.foreArmL,
      { x: 0, y: -0.12, z: 0 },     // Bottom of upper arm
      { x: 0, y: 0.11, z: 0 },      // Top of forearm
      { x: 1, y: 0, z: 0 }          // Axis: X (bend forward/back)
    );
    createRevoluteJoint(
      bodies.upperArmR,
      bodies.foreArmR,
      { x: 0, y: -0.12, z: 0 },
      { x: 0, y: 0.11, z: 0 },
      { x: 1, y: 0, z: 0 }
    );

    // HIPS (Torso lower -> Thighs): spherical joints
    createSphericalJoint(
      bodies.torsoLower,
      bodies.thighL,
      { x: -0.08, y: -0.12, z: 0 }, // Left hip position on lower torso
      { x: 0, y: 0.20, z: 0 }        // Top of thigh
    );
    createSphericalJoint(
      bodies.torsoLower,
      bodies.thighR,
      { x: 0.08, y: -0.12, z: 0 },  // Right hip position on lower torso
      { x: 0, y: 0.20, z: 0 }        // Top of thigh
    );

    // KNEES (Thighs -> Shins): revolute joints (single-axis)
    createRevoluteJoint(
      bodies.thighL,
      bodies.shinL,
      { x: 0, y: -0.20, z: 0 },     // Bottom of thigh
      { x: 0, y: 0.18, z: 0 },      // Top of shin
      { x: 1, y: 0, z: 0 }          // Axis: X (bend forward/back)
    );
    createRevoluteJoint(
      bodies.thighR,
      bodies.shinR,
      { x: 0, y: -0.20, z: 0 },
      { x: 0, y: 0.18, z: 0 },
      { x: 1, y: 0, z: 0 }
    );

    // Store ragdoll for tracking
    const ragdoll = {
      bodies,
      visuals,
      joints,
      scene,
      spawnTime: performance.now() / 1000,
    };
    this.ragdolls.push(ragdoll);

    console.log(`Ragdoll spawned with ${Object.keys(bodies).length} body parts`);
  }

  /**
   * Step Rapier physics world (call each tick at 64Hz)
   * @param {number} dt - Delta time in seconds
   */
  step(dt) {
    if (!this.world) return;

    // Rapier uses its own internal timestep
    this.world.step();

    // Auto-remove ragdolls after 5 seconds
    const now = performance.now() / 1000;
    this.ragdolls = this.ragdolls.filter(r => {
      if (now - r.spawnTime > 5.0) {
        this.removeRagdoll(r);
        return false;
      }
      return true;
    });
  }

  /**
   * Sync visual meshes to physics body positions (call each render frame)
   */
  updateVisuals() {
    for (const ragdoll of this.ragdolls) {
      for (const [name, body] of Object.entries(ragdoll.bodies)) {
        const visual = ragdoll.visuals[name];
        if (!visual) continue;

        const pos = body.translation();
        const rot = body.rotation();
        visual.position.set(pos.x, pos.y, pos.z);
        visual.quaternion.set(rot.x, rot.y, rot.z, rot.w);
      }
    }
  }

  /**
   * Remove a ragdoll after N seconds
   * @param {object} ragdoll - Ragdoll object with bodies, visuals, joints, scene
   */
  removeRagdoll(ragdoll) {
    // Remove visual meshes from scene
    for (const visual of Object.values(ragdoll.visuals)) {
      ragdoll.scene.remove(visual);
      visual.geometry.dispose();
      visual.material.dispose();
    }

    // Remove rigid bodies from Rapier world (colliders/joints removed automatically)
    for (const body of Object.values(ragdoll.bodies)) {
      this.world.removeRigidBody(body);
    }

    console.log('Ragdoll removed');
  }
}
