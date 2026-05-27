/**
 * Arena navigation mesh: bakes a walkable navmesh from the arena geometry using
 * recast-navigation (WASM recast/detour) and exposes path-finding + random-point
 * queries used by the bot AI. Also builds a debug overlay mesh so we can eyeball
 * walkable coverage in-engine (toggle with N).
 */
import { init, NavMeshQuery, getNavMeshPositionsAndIndices } from 'recast-navigation';
import { generateSoloNavMesh, mergePositionsAndIndices } from 'recast-navigation/generators';

// Agent dimensions (soldier ~1.8m tall, ~0.35m radius). Recast wants the walkable
// fields in voxels (world / cell), so derive them from the cell size.
const CELL_SIZE = 0.2;   // xz voxel size (world units)
const CELL_HEIGHT = 0.2; // y voxel size
const AGENT_HEIGHT = 1.8;
const AGENT_RADIUS = 0.35;
const AGENT_MAX_CLIMB = 0.4; // step-up height (stairs/curbs)
const AGENT_MAX_SLOPE = 50;  // degrees — arena has ramps/slopes

export class ArenaNavMesh {
  constructor() {
    this.navMesh = null;
    this.query = null;
    this.ready = false;
  }

  /**
   * Bake the navmesh from a three.js scene graph of arena geometry.
   * @param {THREE.Object3D} arenaScene - environment meshes (this.mapScene)
   * @param {object} THREE
   * @returns {boolean} success
   */
  async build(arenaScene, THREE) {
    await init();

    // Collect world-space positions + indices from every mesh in the arena.
    const meshes = [];
    arenaScene.updateMatrixWorld(true);
    const v = new THREE.Vector3();
    arenaScene.traverse((obj) => {
      if (!obj.isMesh || !obj.geometry || !obj.geometry.attributes.position) return;
      const geom = obj.geometry;
      const posAttr = geom.attributes.position;
      const positions = new Float32Array(posAttr.count * 3);
      for (let i = 0; i < posAttr.count; i++) {
        v.fromBufferAttribute(posAttr, i).applyMatrix4(obj.matrixWorld);
        positions[i * 3] = v.x;
        positions[i * 3 + 1] = v.y;
        positions[i * 3 + 2] = v.z;
      }
      let indices;
      if (geom.index) {
        indices = geom.index.array;
      } else {
        indices = new Uint32Array(posAttr.count);
        for (let i = 0; i < posAttr.count; i++) indices[i] = i;
      }
      meshes.push({ positions, indices });
    });

    if (meshes.length === 0) {
      console.error('[navmesh] no geometry found in arena scene');
      return false;
    }

    const [positions, indices] = mergePositionsAndIndices(meshes);

    const config = {
      cs: CELL_SIZE,
      ch: CELL_HEIGHT,
      walkableSlopeAngle: AGENT_MAX_SLOPE,
      walkableHeight: Math.ceil(AGENT_HEIGHT / CELL_HEIGHT),
      walkableClimb: Math.floor(AGENT_MAX_CLIMB / CELL_HEIGHT),
      walkableRadius: Math.ceil(AGENT_RADIUS / CELL_SIZE),
      maxEdgeLen: Math.round(12 / CELL_SIZE),
      maxSimplificationError: 1.3,
      minRegionArea: 8,
      mergeRegionArea: 20,
      maxVertsPerPoly: 6,
      detailSampleDist: 6,
      detailSampleMaxError: 1,
    };

    const t0 = performance.now();
    const result = generateSoloNavMesh(positions, indices, config);
    if (!result.success || !result.navMesh) {
      console.error('[navmesh] generation failed:', result.error);
      return false;
    }

    this.navMesh = result.navMesh;
    this.query = new NavMeshQuery(this.navMesh);
    this.ready = true;
    console.log(`[navmesh] baked in ${(performance.now() - t0).toFixed(1)}ms ` +
      `from ${meshes.length} meshes (${(positions.length / 3) | 0} verts)`);
    return true;
  }

  /** Snap an arbitrary world point onto the navmesh; returns THREE.Vector3 or null. */
  closestPoint(pos, THREE) {
    if (!this.ready) return null;
    const r = this.query.findClosestPoint({ x: pos.x, y: pos.y, z: pos.z });
    if (!r.success) return null;
    return new THREE.Vector3(r.point.x, r.point.y, r.point.z);
  }

  /**
   * Walkable surface height directly under/around a world position. Used to keep
   * a moving bot glued to ramps/slopes instead of snapping to waypoint heights.
   * The tall y half-extent lets it find the floor when the query point is above it,
   * while staying on the bot's current level in multi-storey areas.
   * @returns {number|null} surface y, or null if off-navmesh
   */
  sampleHeight(pos) {
    if (!this.ready) return null;
    const r = this.query.findClosestPoint(
      { x: pos.x, y: pos.y, z: pos.z },
      { halfExtents: { x: 0.6, y: 4.0, z: 0.6 } }
    );
    if (!r.success) return null;
    return r.point.y;
  }

  /** A uniformly random walkable point. Returns THREE.Vector3 or null. */
  randomPoint(THREE) {
    if (!this.ready) return null;
    const r = this.query.findRandomPoint();
    if (!r.success) return null;
    return new THREE.Vector3(r.randomPoint.x, r.randomPoint.y, r.randomPoint.z);
  }

  /** A random walkable point within `radius` of `pos`. Returns THREE.Vector3 or null. */
  randomPointNear(pos, radius, THREE) {
    if (!this.ready) return null;
    const r = this.query.findRandomPointAroundCircle({ x: pos.x, y: pos.y, z: pos.z }, radius);
    if (!r.success) return null;
    return new THREE.Vector3(r.randomPoint.x, r.randomPoint.y, r.randomPoint.z);
  }

  /**
   * Straight path of waypoints from start to end (both snapped to navmesh).
   * @returns {THREE.Vector3[]} waypoints (may be empty if no path)
   */
  computePath(start, end, THREE) {
    if (!this.ready) return [];
    const r = this.query.computePath(
      { x: start.x, y: start.y, z: start.z },
      { x: end.x, y: end.y, z: end.z }
    );
    if (!r.success || !r.path) return [];
    return r.path.map((p) => new THREE.Vector3(p.x, p.y, p.z));
  }

  /** Translucent overlay mesh of the walkable surface for debugging (toggle N). */
  buildDebugMesh(THREE) {
    if (!this.ready) return null;
    const [positions, indices] = getNavMeshPositionsAndIndices(this.navMesh);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00ddff, transparent: true, opacity: 0.35,
      depthWrite: false, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.y += 0.05; // lift slightly so it reads above the floor
    mesh.renderOrder = 999;
    return mesh;
  }
}
