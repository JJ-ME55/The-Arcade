// ========== VECTOR MATH UTILITIES ==========

type Vec3 = { x: number; y: number; z: number };

function vecAdd(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function vecSub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function vecScale(a: Vec3, s: number): Vec3 {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

function vecDot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function vecLength(a: Vec3): number {
  return Math.sqrt(vecDot(a, a));
}

function vecNormalize(a: Vec3): Vec3 {
  const l = vecLength(a) || 1;
  return vecScale(a, 1 / l);
}

function vecCross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

// ========== HITBOX ZONE DEFINITIONS ==========

export type HitboxZone = 'head' | 'chest' | 'stomach' | 'arm_l' | 'arm_r' | 'leg_l' | 'leg_r';

export const ZONE_MULTIPLIERS: Record<HitboxZone, number> = {
  head: 4.0,
  chest: 1.0,
  stomach: 1.25,
  arm_l: 1.0,
  arm_r: 1.0,
  leg_l: 0.75,
  leg_r: 0.75,
};

// ========== HITBOX INTERFACE ==========

export interface Hitbox {
  zone: HitboxZone;
  shape: 'sphere' | 'capsule' | 'box';
  multiplier: number;
  armorProtected: boolean;
  boneName: string;

  // Shared: all shapes have center
  center: Vec3;

  // Optional world-space offset applied to the bone position (e.g. raise the head
  // sphere from the neck-base Head bone up to the visual head center).
  offset?: Vec3;

  // Sphere: center + radius
  radius?: number;

  // Capsule: two endpoints + radius
  endA?: Vec3;
  endB?: Vec3;

  // Box: center + halfExtents + rotation (euler angles)
  halfExtents?: Vec3;
  rotation?: [number, number, number]; // euler angles (x, y, z)
}

export type HitboxSet = Hitbox[];

// ========== RAY-PRIMITIVE INTERSECTION ==========

const EPSILON = 0.001;

/**
 * Ray-sphere intersection using quadratic formula
 * @returns Distance along ray to closest intersection, or null if no hit
 */
export function raySphereIntersect(
  rayOrigin: Vec3,
  rayDir: Vec3,
  center: Vec3,
  radius: number
): number | null {
  const oc = vecSub(rayOrigin, center);
  const b = vecDot(oc, rayDir);
  const c = vecDot(oc, oc) - radius * radius;
  const discriminant = b * b - c;

  if (discriminant < 0) return null;

  const sqrtDisc = Math.sqrt(discriminant);
  const t1 = -b - sqrtDisc;
  const t2 = -b + sqrtDisc;

  // Return closest positive intersection
  if (t1 >= EPSILON) return t1;
  if (t2 >= EPSILON) return t2;
  return null;
}

/**
 * Ray-capsule intersection (cylinder with hemisphere caps)
 * @returns Distance along ray to closest intersection, or null if no hit
 */
export function rayCapsuleIntersect(
  rayOrigin: Vec3,
  rayDir: Vec3,
  endA: Vec3,
  endB: Vec3,
  radius: number
): number | null {
  const ab = vecSub(endB, endA);
  const ao = vecSub(rayOrigin, endA);

  const abDot = vecDot(ab, ab);
  const aoDot = vecDot(ao, rayDir);
  const abDotDir = vecDot(ab, rayDir);
  const abDotAo = vecDot(ab, ao);

  // Solve for closest point on infinite cylinder
  const m = abDot * aoDot - abDotAo * abDotDir;
  const n = abDot - abDotDir * abDotDir;

  // Check if ray is parallel to capsule axis
  if (Math.abs(n) < EPSILON) {
    // Ray parallel to capsule - test hemisphere caps only
    const hitA = raySphereIntersect(rayOrigin, rayDir, endA, radius);
    const hitB = raySphereIntersect(rayOrigin, rayDir, endB, radius);
    if (hitA !== null && hitB !== null) return Math.min(hitA, hitB);
    if (hitA !== null) return hitA;
    if (hitB !== null) return hitB;
    return null;
  }

  const t = m / n;
  const s = (abDotAo + abDotDir * t) / abDot;

  // Check if closest point is within cylinder segment [0, 1]
  if (s >= 0 && s <= 1) {
    // Hit on cylinder body
    const closestOnAxis = vecAdd(endA, vecScale(ab, s));
    const toRay = vecSub(vecAdd(rayOrigin, vecScale(rayDir, t)), closestOnAxis);
    const distSq = vecDot(toRay, toRay);

    if (distSq <= radius * radius && t >= EPSILON) {
      return t;
    }
  }

  // Hit on hemisphere caps
  const hitA = raySphereIntersect(rayOrigin, rayDir, endA, radius);
  const hitB = raySphereIntersect(rayOrigin, rayDir, endB, radius);

  if (hitA !== null && hitB !== null) return Math.min(hitA, hitB);
  if (hitA !== null) return hitA;
  if (hitB !== null) return hitB;

  return null;
}

/**
 * Ray-box intersection (oriented bounding box using slab method)
 * @returns Distance along ray to entry point, or null if no hit
 */
export function rayBoxIntersect(
  rayOrigin: Vec3,
  rayDir: Vec3,
  center: Vec3,
  halfExtents: Vec3,
  rotation?: [number, number, number]
): number | null {
  let origin = rayOrigin;
  let dir = rayDir;

  // If box is rotated, transform ray into box local space
  if (rotation) {
    const [rx, ry, rz] = rotation;

    // Create rotation matrix from euler angles
    const cosX = Math.cos(rx), sinX = Math.sin(rx);
    const cosY = Math.cos(ry), sinY = Math.sin(ry);
    const cosZ = Math.cos(rz), sinZ = Math.sin(rz);

    // Rotation matrix (inverse = transpose for orthogonal matrix)
    const m = [
      [cosY * cosZ, sinX * sinY * cosZ + cosX * sinZ, -cosX * sinY * cosZ + sinX * sinZ],
      [-cosY * sinZ, -sinX * sinY * sinZ + cosX * cosZ, cosX * sinY * sinZ + sinX * cosZ],
      [sinY, -sinX * cosY, cosX * cosY]
    ];

    // Transform ray origin to box local space
    const localOrigin = vecSub(rayOrigin, center);
    origin = {
      x: m[0][0] * localOrigin.x + m[1][0] * localOrigin.y + m[2][0] * localOrigin.z,
      y: m[0][1] * localOrigin.x + m[1][1] * localOrigin.y + m[2][1] * localOrigin.z,
      z: m[0][2] * localOrigin.x + m[1][2] * localOrigin.y + m[2][2] * localOrigin.z,
    };

    // Transform ray direction to box local space
    dir = {
      x: m[0][0] * rayDir.x + m[1][0] * rayDir.y + m[2][0] * rayDir.z,
      y: m[0][1] * rayDir.x + m[1][1] * rayDir.y + m[2][1] * rayDir.z,
      z: m[0][2] * rayDir.x + m[1][2] * rayDir.y + m[2][2] * rayDir.z,
    };

    // Box center is now at origin in local space
    center = { x: 0, y: 0, z: 0 };
  }

  // AABB slab test in local space
  const boxMin = vecSub(center, halfExtents);
  const boxMax = vecAdd(center, halfExtents);

  let tmin = -Infinity;
  let tmax = Infinity;

  // X axis slab
  if (Math.abs(dir.x) > EPSILON) {
    const tx1 = (boxMin.x - origin.x) / dir.x;
    const tx2 = (boxMax.x - origin.x) / dir.x;
    tmin = Math.max(tmin, Math.min(tx1, tx2));
    tmax = Math.min(tmax, Math.max(tx1, tx2));
  } else if (origin.x < boxMin.x || origin.x > boxMax.x) {
    return null; // Ray parallel to slab and outside
  }

  // Y axis slab
  if (Math.abs(dir.y) > EPSILON) {
    const ty1 = (boxMin.y - origin.y) / dir.y;
    const ty2 = (boxMax.y - origin.y) / dir.y;
    tmin = Math.max(tmin, Math.min(ty1, ty2));
    tmax = Math.min(tmax, Math.max(ty1, ty2));
  } else if (origin.y < boxMin.y || origin.y > boxMax.y) {
    return null;
  }

  // Z axis slab
  if (Math.abs(dir.z) > EPSILON) {
    const tz1 = (boxMin.z - origin.z) / dir.z;
    const tz2 = (boxMax.z - origin.z) / dir.z;
    tmin = Math.max(tmin, Math.min(tz1, tz2));
    tmax = Math.min(tmax, Math.max(tz1, tz2));
  } else if (origin.z < boxMin.z || origin.z > boxMax.z) {
    return null;
  }

  // Check if ray intersects box
  if (tmin > tmax || tmax < EPSILON) return null;

  // Return entry point (tmin if positive, else tmax)
  return tmin >= EPSILON ? tmin : (tmax >= EPSILON ? tmax : null);
}

// ========== DEFAULT HITBOX TEMPLATE ==========

/**
 * Creates default hitbox template based on mannequin skeleton
 * Sizes are approximate based on typical humanoid proportions
 * Head hitbox is 15% larger than visual for CS:S-style generous hitboxes
 */
export function createDefaultHitboxTemplate(): Hitbox[] {
  return [
    // HEAD: Sphere. The Mixamo 'Head' bone sits at the neck/chin, so offset the
    // sphere UP to the visual head center. Slightly generous (CS:S style).
    {
      zone: 'head',
      shape: 'sphere',
      multiplier: ZONE_MULTIPLIERS.head,
      armorProtected: true, // Protected only if hasHelmet
      boneName: 'Head',
      center: { x: 0, y: 0, z: 0 },
      offset: { x: 0, y: 0.13, z: 0 },
      radius: 0.20,
    },

    // CHEST: Box, sized for the bulkier armored soldier torso (upper chest).
    {
      zone: 'chest',
      shape: 'box',
      multiplier: ZONE_MULTIPLIERS.chest,
      armorProtected: true, // Protected if hasArmor
      boneName: 'Chest',
      center: { x: 0, y: 0, z: 0 },
      offset: { x: 0, y: 0.06, z: 0 },
      halfExtents: { x: 0.19, y: 0.16, z: 0.15 },
    },

    // STOMACH: Box, lower torso (pelvis/abdomen).
    {
      zone: 'stomach',
      shape: 'box',
      multiplier: ZONE_MULTIPLIERS.stomach,
      armorProtected: true, // Protected if hasArmor
      boneName: 'Spine',
      center: { x: 0, y: 0, z: 0 },
      offset: { x: 0, y: 0.05, z: 0 },
      halfExtents: { x: 0.17, y: 0.14, z: 0.13 },
    },

    // LEFT ARM: Capsule, radius ~0.06, from UpperArm to Hand
    {
      zone: 'arm_l',
      shape: 'capsule',
      multiplier: ZONE_MULTIPLIERS.arm_l,
      armorProtected: true, // Protected if hasArmor
      boneName: 'UpperArm.L',
      center: { x: 0, y: 0, z: 0 },
      endA: { x: 0, y: 0, z: 0 },
      endB: { x: 0, y: 0, z: 0 },
      radius: 0.075,
    },

    // RIGHT ARM: Capsule, radius ~0.06, from UpperArm to Hand
    {
      zone: 'arm_r',
      shape: 'capsule',
      multiplier: ZONE_MULTIPLIERS.arm_r,
      armorProtected: true, // Protected if hasArmor
      boneName: 'UpperArm.R',
      center: { x: 0, y: 0, z: 0 },
      endA: { x: 0, y: 0, z: 0 },
      endB: { x: 0, y: 0, z: 0 },
      radius: 0.075,
    },

    // LEFT LEG: Capsule, radius ~0.08, from Thigh to Shin end
    {
      zone: 'leg_l',
      shape: 'capsule',
      multiplier: ZONE_MULTIPLIERS.leg_l,
      armorProtected: false, // Legs NOT protected by armor
      boneName: 'Thigh.L',
      center: { x: 0, y: 0, z: 0 },
      endA: { x: 0, y: 0, z: 0 },
      endB: { x: 0, y: 0, z: 0 },
      radius: 0.095,
    },

    // RIGHT LEG: Capsule, radius ~0.08, from Thigh to Shin end
    {
      zone: 'leg_r',
      shape: 'capsule',
      multiplier: ZONE_MULTIPLIERS.leg_r,
      armorProtected: false, // Legs NOT protected by armor
      boneName: 'Thigh.R',
      center: { x: 0, y: 0, z: 0 },
      endA: { x: 0, y: 0, z: 0 },
      endB: { x: 0, y: 0, z: 0 },
      radius: 0.095,
    },
  ];
}

export { Vec3, vecAdd, vecSub, vecScale, vecDot, vecLength, vecNormalize, vecCross };
