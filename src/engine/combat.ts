import {
  Vec3,
  vecAdd,
  vecSub,
  vecScale,
  vecDot,
  vecNormalize,
  vecLength,
  Hitbox,
  HitboxZone,
  HitboxSet,
  ZONE_MULTIPLIERS,
  raySphereIntersect,
  rayCapsuleIntersect,
  rayBoxIntersect,
  createDefaultHitboxTemplate,
} from './hitboxes.js';

// ========== HIT RESULT TYPE ==========

export interface HitResult {
  targetId: string;           // ID of player hit
  zone: HitboxZone;           // Which body zone was hit
  multiplier: number;         // Damage multiplier for that zone
  distance: number;           // Distance from shooter to hit point
  hitPosition: Vec3;          // World position of impact
  hitNormal: Vec3;            // Surface normal at impact (for particle direction)
  isHeadshot: boolean;        // Convenience flag
  armorProtected: boolean;    // Whether this zone has armor
}

// ========== HITBOX SET MANAGEMENT ==========

/**
 * Creates a new hitbox set for a player using the default template
 */
export function createHitboxSet(id: string): HitboxSet {
  return createDefaultHitboxTemplate();
}

/**
 * Updates hitbox positions based on current skeleton bone world transforms
 * @param hitboxSet - The player's hitbox set to update
 * @param boneWorldPositions - Record of bone names to world-space positions
 */
export function updateHitboxPositions(
  hitboxSet: HitboxSet,
  boneWorldPositions: Record<string, Vec3>
): void {
  for (const hitbox of hitboxSet) {
    const bonePos = boneWorldPositions[hitbox.boneName];
    if (!bonePos) continue; // Bone not found, skip

    if (hitbox.shape === 'sphere') {
      // Sphere: center follows bone
      hitbox.center = { ...bonePos };
    } else if (hitbox.shape === 'box') {
      // Box: center follows bone
      hitbox.center = { ...bonePos };
    } else if (hitbox.shape === 'capsule') {
      // Capsule: endA = bone position, endB = target bone position
      if (hitbox.zone === 'arm_l') {
        hitbox.endA = boneWorldPositions['UpperArm.L'] || hitbox.endA;
        hitbox.endB = boneWorldPositions['Hand.L'] || hitbox.endB;
        hitbox.center = hitbox.endA; // Center for distance sorting
      } else if (hitbox.zone === 'arm_r') {
        hitbox.endA = boneWorldPositions['UpperArm.R'] || hitbox.endA;
        hitbox.endB = boneWorldPositions['Hand.R'] || hitbox.endB;
        hitbox.center = hitbox.endA;
      } else if (hitbox.zone === 'leg_l') {
        hitbox.endA = boneWorldPositions['Thigh.L'] || hitbox.endA;
        hitbox.endB = boneWorldPositions['Shin.L'] || hitbox.endB;
        hitbox.center = hitbox.endA;
      } else if (hitbox.zone === 'leg_r') {
        hitbox.endA = boneWorldPositions['Thigh.R'] || hitbox.endA;
        hitbox.endB = boneWorldPositions['Shin.R'] || hitbox.endB;
        hitbox.center = hitbox.endA;
      }
    }
  }
}

// ========== HITSCAN TESTING ==========

/**
 * Tests hitscan ray against all targets' hitboxes
 * @param rayOrigin - Ray origin (camera position)
 * @param rayDir - Ray direction (normalized)
 * @param targets - Array of targets with id and hitboxes
 * @param shooterId - ID of shooter (to prevent self-hit)
 * @returns Closest hit result, or null if nothing hit
 */
export function testHitscan(
  rayOrigin: Vec3,
  rayDir: Vec3,
  targets: { id: string; hitboxes: HitboxSet }[],
  shooterId?: string
): HitResult | null {
  // Collect all hits per target
  const targetHits = new Map<string, { hitbox: Hitbox; distance: number; position: Vec3 }[]>();

  for (const target of targets) {
    // Skip shooter (prevent self-hit)
    if (shooterId && target.id === shooterId) continue;

    const hits: { hitbox: Hitbox; distance: number; position: Vec3 }[] = [];

    for (const hitbox of target.hitboxes) {
      let distance: number | null = null;

      if (hitbox.shape === 'sphere' && hitbox.radius !== undefined) {
        distance = raySphereIntersect(rayOrigin, rayDir, hitbox.center, hitbox.radius);
      } else if (hitbox.shape === 'capsule' && hitbox.endA && hitbox.endB && hitbox.radius !== undefined) {
        distance = rayCapsuleIntersect(rayOrigin, rayDir, hitbox.endA, hitbox.endB, hitbox.radius);
      } else if (hitbox.shape === 'box' && hitbox.halfExtents) {
        distance = rayBoxIntersect(rayOrigin, rayDir, hitbox.center, hitbox.halfExtents, hitbox.rotation);
      }

      if (distance !== null) {
        const position = vecAdd(rayOrigin, vecScale(rayDir, distance));
        hits.push({ hitbox, distance, position });
      }
    }

    if (hits.length > 0) {
      targetHits.set(target.id, hits);
    }
  }

  // ARM PENETRATION: For each target, if arm hit exists AND torso hit exists, discard arm hits
  targetHits.forEach((hits, targetId) => {
    const armHits = hits.filter(h => h.hitbox.zone === 'arm_l' || h.hitbox.zone === 'arm_r');
    const torsoHits = hits.filter(h => h.hitbox.zone === 'chest' || h.hitbox.zone === 'stomach');

    if (armHits.length > 0 && torsoHits.length > 0) {
      // Remove arm hits - arms are "transparent" to torso shots
      const filteredHits = hits.filter(h => h.hitbox.zone !== 'arm_l' && h.hitbox.zone !== 'arm_r');
      targetHits.set(targetId, filteredHits);
    }
  });

  // Find closest hit across all targets
  let closestHit: { targetId: string; hitbox: Hitbox; distance: number; position: Vec3 } | null = null;
  let closestDist = Infinity;

  targetHits.forEach((hits, targetId) => {
    for (const hit of hits) {
      if (hit.distance < closestDist) {
        closestDist = hit.distance;
        closestHit = { targetId, ...hit };
      }
    }
  });

  if (!closestHit) return null;

  // Compute hit normal based on shape
  const hitNormal = computeHitNormal(closestHit.hitbox, closestHit.position, rayDir);

  return {
    targetId: closestHit.targetId,
    zone: closestHit.hitbox.zone,
    multiplier: closestHit.hitbox.multiplier,
    distance: closestHit.distance,
    hitPosition: closestHit.position,
    hitNormal,
    isHeadshot: closestHit.hitbox.zone === 'head',
    armorProtected: closestHit.hitbox.armorProtected,
  };
}

/**
 * Computes surface normal at hit point based on hitbox shape
 */
function computeHitNormal(hitbox: Hitbox, hitPosition: Vec3, rayDir: Vec3): Vec3 {
  if (hitbox.shape === 'sphere') {
    // Sphere: normal = normalize(hitPoint - center)
    const normal = vecSub(hitPosition, hitbox.center);
    return vecNormalize(normal);
  } else if (hitbox.shape === 'capsule' && hitbox.endA && hitbox.endB) {
    // Capsule: perpendicular from axis to hit point
    const ab = vecSub(hitbox.endB, hitbox.endA);
    const ah = vecSub(hitPosition, hitbox.endA);
    const abDot = vecDot(ab, ab);
    const t = Math.max(0, Math.min(1, vecDot(ah, ab) / abDot));
    const closestOnAxis = vecAdd(hitbox.endA, vecScale(ab, t));
    const normal = vecSub(hitPosition, closestOnAxis);
    return vecNormalize(normal);
  } else if (hitbox.shape === 'box' && hitbox.halfExtents) {
    // Box: find face normal by determining which axis is closest to surface
    const localHit = vecSub(hitPosition, hitbox.center);
    const he = hitbox.halfExtents;

    // Find which face was hit (largest normalized distance)
    const dx = Math.abs(localHit.x / he.x);
    const dy = Math.abs(localHit.y / he.y);
    const dz = Math.abs(localHit.z / he.z);

    if (dx > dy && dx > dz) {
      // X face
      return { x: Math.sign(localHit.x), y: 0, z: 0 };
    } else if (dy > dz) {
      // Y face
      return { x: 0, y: Math.sign(localHit.y), z: 0 };
    } else {
      // Z face
      return { x: 0, y: 0, z: Math.sign(localHit.z) };
    }
  }

  // Fallback: reverse ray direction
  return vecScale(rayDir, -1);
}

/**
 * Tests ray against world geometry (placeholder)
 * Will be wired to Three.js Raycaster in Plan 05
 */
export function testEnvironmentHit(
  rayOrigin: Vec3,
  rayDir: Vec3,
  maxDistance: number
): { position: Vec3; normal: Vec3 } | null {
  // Placeholder - will integrate with Three.js Raycaster in Plan 05
  return null;
}
