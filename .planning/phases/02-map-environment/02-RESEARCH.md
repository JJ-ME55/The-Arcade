# Phase 2: Map & Environment - Research

**Researched:** 2026-02-15
**Domain:** BSP-to-Three.js pipeline, Blender GLTF workflow, FPS collision detection
**Confidence:** MEDIUM-HIGH

## Summary

Phase 2 requires loading the aim_ag_texture2 Counter-Strike: Source map into the browser and integrating it with the Phase 1 movement engine. Based on the CONTEXT.md requirement for pixel-perfect recreation, research reveals two primary approaches:

1. **BSP Direct Parsing** - Extract geometry from the original .bsp file using JavaScript BSP parsers
2. **BSP Decompile → Blender → GLTF** - Decompile BSP to VMF, rebuild in Blender, export to GLTF

The second approach is more practical because:
- BSP parsers for Source engine are scarce and incomplete (most target Quake III)
- BSPSource can decompile CS:S .bsp to .vmf (Hammer format)
- Blender can import .vmf geometry via community plugins
- GLTF export from Blender is mature and well-supported
- Three.js GLTFLoader is the industry standard

For collision detection with the movement engine, Three.js provides official Octree + Capsule examples (games_fps.html) that demonstrate:
- Spatial partitioning via Octree for efficient collision queries (O(log n) vs O(n))
- Capsule player representation for smooth sliding along walls
- Integration with fixed-timestep physics loops

The critical challenge is material recreation - Blender's procedural shader nodes (math-based grids) do NOT export to GLTF. Materials must be baked to image textures before export.

**Primary recommendation:** Decompile aim_ag_texture2.bsp with BSPSource, import geometry to Blender, manually apply flat-color materials matching reference screenshots, export to GLB with custom properties for spawn points, load via GLTFLoader, build Octree from scene geometry, integrate with existing Movement.ts using Capsule collision.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Three.js GLTFLoader | r160+ | GLTF/GLB file loading | Official Three.js addon, battle-tested, handles scene graph traversal |
| Three.js Octree | r160+ (examples/jsm/math/) | Spatial partitioning for collision | Official Three.js example code, used in games_fps.html demo |
| Three.js Capsule | r160+ (examples/jsm/math/) | Player collision primitive | Official Three.js example code, smooth sliding physics |
| BSPSource | 1.3.18+ | BSP → VMF decompiler | Community standard for Source engine map decompiling |
| Blender | 4.0+ | 3D modeling, GLTF export | Industry standard, excellent GLTF exporter, custom property support |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| three-mesh-bvh | Latest | Alternative to Octree (BVH spatial structure) | If Octree performance insufficient (unlikely for block geometry) |
| Draco compression | Latest | GLTF compression | If .glb file size exceeds 10MB (compression reduces by ~50%) |
| openarena-bsp-parser | Latest (npm) | Direct BSP parsing | ONLY if BSP → Blender workflow fails (LOW confidence this works for Source BSP) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| BSP decompile workflow | Direct BSP parsing in JS | No mature Source engine BSP parser exists; Quake III parsers won't work |
| Octree collision | three-mesh-bvh (BVH structure) | BVH faster for raycasting, Octree proven for FPS collision, use official examples |
| GLTF format | OBJ/FBX export | GLTF supports custom properties (spawn points), animations, PBR materials; OBJ is legacy |
| Blender import | Manual geometry recreation | 100+ hours of manual work vs automated BSP decompile |
| Manual collision boxes | Octree from visual mesh | Manual error-prone, Octree auto-generates from geometry |

**Installation:**
```bash
# Three.js already installed from Phase 1
# No additional npm packages required (Octree/Capsule are example code, copy into project)

# External tools (not npm):
# - BSPSource: Download JAR from https://developer.valvesoftware.com/wiki/BSPSource
# - Blender 4.0+: Download from https://www.blender.org/download/
# - aim_ag_texture2.bsp: Download from https://tsarvar.com/en/maps/counter-strike-source/aim_ag_texture2
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── engine/
│   ├── collision/
│   │   ├── Octree.ts          # Copy from three/examples/jsm/math/Octree.js
│   │   ├── Capsule.ts         # Copy from three/examples/jsm/math/Capsule.js
│   │   ├── CollisionWorld.ts  # Wraps Octree, provides collision queries
│   │   └── OctreeHelper.ts    # Debug visualization (optional)
│   └── movement.ts            # Existing from Phase 1
├── map/
│   ├── MapLoader.ts           # GLTFLoader wrapper, scene graph traversal
│   ├── SpawnPoints.ts         # Extract spawn points from GLTF extras/userData
│   └── MapLighting.ts         # Setup bright, even lighting
└── renderer/
    └── Scene.ts               # Existing from Phase 1, updated to add GLTF scene

assets/
└── maps/
    └── aim_ag_texture2.glb    # Exported from Blender (NOT committed to git)
```

### Pattern 1: GLTF Loading with Scene Graph Traversal

**What:** Load .glb file, traverse scene graph to extract meshes and metadata.

**When to use:** Required for any GLTF asset import.

**Example:**
```typescript
// Source: https://threejs.org/docs/#examples/en/loaders/GLTFLoader
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

class MapLoader {
  private loader = new GLTFLoader();

  async load(path: string): Promise<THREE.Scene> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        path,
        (gltf) => {
          console.log('Map loaded:', gltf.scene);
          console.log('Meshes:', this.countMeshes(gltf.scene));
          resolve(gltf.scene);
        },
        (progress) => {
          const percent = (progress.loaded / progress.total) * 100;
          console.log(`Loading: ${percent.toFixed(1)}%`);
        },
        (error) => {
          console.error('Failed to load map:', error);
          reject(error);
        }
      );
    });
  }

  private countMeshes(scene: THREE.Scene): number {
    let count = 0;
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        count++;
      }
    });
    return count;
  }

  // Extract all meshes for collision Octree building
  getMeshes(scene: THREE.Scene): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        meshes.push(object);
      }
    });
    return meshes;
  }
}
```

### Pattern 2: Octree Construction from GLTF Scene

**What:** Build spatial partitioning structure from loaded map geometry for efficient collision queries.

**When to use:** Required for FPS collision detection against complex geometry.

**Example:**
```typescript
// Source: https://github.com/mrdoob/three.js/blob/dev/examples/games_fps.html
import { Octree } from 'three/examples/jsm/math/Octree.js';

class CollisionWorld {
  private worldOctree = new Octree();

  // Build octree from GLTF scene (one-time operation after map load)
  buildFromScene(scene: THREE.Scene): void {
    console.log('Building collision octree from scene...');
    const startTime = performance.now();

    // fromGraphNode recursively traverses scene, extracts mesh triangles
    this.worldOctree.fromGraphNode(scene);

    const elapsed = performance.now() - startTime;
    console.log(`Octree built in ${elapsed.toFixed(2)}ms`);
  }

  // Query collision for player capsule
  capsuleIntersect(capsule: Capsule): CollisionResult | null {
    const result = this.worldOctree.capsuleIntersect(capsule);

    if (result) {
      return {
        normal: result.normal,      // Surface normal for sliding
        depth: result.depth,         // Penetration depth
        contactPoint: result.point   // Where collision occurred
      };
    }

    return null;
  }
}

interface CollisionResult {
  normal: THREE.Vector3;
  depth: number;
  contactPoint: THREE.Vector3;
}
```

### Pattern 3: Capsule Player Collision Integration with Movement Engine

**What:** Replace simple ground-only collision with full 3D capsule collision against Octree.

**When to use:** Required to enable player collision with map geometry.

**Example:**
```typescript
// Source: https://github.com/mrdoob/three.js/blob/dev/examples/games_fps.html
import { Capsule } from 'three/examples/jsm/math/Capsule.js';

// In movement.ts (Phase 1), add:
class MovementEngine {
  private playerCollider: Capsule;

  constructor(
    config?: Partial<MovementConfig>,
    private collisionWorld?: CollisionWorld  // NEW: inject collision world
  ) {
    // ... existing setup ...

    // Player capsule: radius 0.35, segment from feet to head
    this.playerCollider = new Capsule(
      new THREE.Vector3(0, 0.35, 0),   // Bottom sphere center (feet + radius)
      new THREE.Vector3(0, 1.0, 0),    // Top sphere center (head - radius)
      0.35                              // Radius (player "width")
    );
  }

  update(dt: number, input: InputState) {
    // ... existing physics (friction, acceleration, gravity) ...

    // Integrate velocity into position (tentative move)
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    // Update capsule position to match player position
    this.playerCollider.start.copy(this.position).add(new THREE.Vector3(0, 0.35, 0));
    this.playerCollider.end.copy(this.position).add(new THREE.Vector3(0, 1.0, 0));

    // NEW: Resolve collisions with world geometry
    if (this.collisionWorld) {
      this.resolveCollisions();
    } else {
      // Fallback: simple ground collision (Phase 1 behavior)
      if (this.position.y <= 0) {
        this.position.y = 0;
        this.velocity.y = 0;
        this.onGround = true;
      }
    }
  }

  private resolveCollisions() {
    const result = this.collisionWorld.capsuleIntersect(this.playerCollider);

    if (result) {
      // Push player out of geometry
      this.position.addScaledVector(result.normal, result.depth);

      // Update capsule to match corrected position
      this.playerCollider.start.copy(this.position).add(new THREE.Vector3(0, 0.35, 0));
      this.playerCollider.end.copy(this.position).add(new THREE.Vector3(0, 1.0, 0));

      // Sliding collision response: remove velocity component into surface
      const velocityIntoSurface = this.velocity.dot(result.normal);
      if (velocityIntoSurface < 0) {
        this.velocity.addScaledVector(result.normal, -velocityIntoSurface);
      }

      // Ground detection: if collision normal points mostly upward, we're grounded
      this.onGround = result.normal.y > 0.5;  // >45° upward = ground
    } else {
      this.onGround = false;  // No collision = airborne
    }
  }
}
```

### Pattern 4: Spawn Point Extraction from GLTF Custom Properties

**What:** Embed spawn point metadata in Blender as custom properties, read via GLTF extras → userData.

**When to use:** Required to define fixed spawn points per team.

**Example:**

**In Blender (before export):**
1. Create Empty objects at spawn locations
2. Name them: `spawn_team_red`, `spawn_team_blue`
3. Add custom property: `spawnTeam` = `"red"` or `"blue"`
4. Export with "Include → Custom Properties" enabled

**In TypeScript:**
```typescript
// Source: https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html
class SpawnPoints {
  private redSpawn?: THREE.Vector3;
  private blueSpawn?: THREE.Vector3;

  // Extract spawn points from loaded GLTF scene
  extract(scene: THREE.Scene): void {
    scene.traverse((object) => {
      // Custom properties exported as object.userData
      if (object.userData.spawnTeam === 'red') {
        this.redSpawn = object.position.clone();
        console.log('Red spawn:', this.redSpawn);
      } else if (object.userData.spawnTeam === 'blue') {
        this.blueSpawn = object.position.clone();
        console.log('Blue spawn:', this.blueSpawn);
      }

      // Alternative: check by object name if custom properties not exported
      if (object.name === 'spawn_team_red') {
        this.redSpawn = object.position.clone();
      } else if (object.name === 'spawn_team_blue') {
        this.blueSpawn = object.position.clone();
      }
    });

    if (!this.redSpawn || !this.blueSpawn) {
      console.warn('Spawn points not found in GLTF, using fallback positions');
      this.redSpawn = new THREE.Vector3(-10, 0, -10);
      this.blueSpawn = new THREE.Vector3(10, 0, 10);
    }
  }

  getSpawn(team: 'red' | 'blue'): THREE.Vector3 {
    return team === 'red' ? this.redSpawn! : this.blueSpawn!;
  }
}
```

### Pattern 5: Bright, Even Lighting Setup (No Shadows)

**What:** Combine HemisphereLight + DirectionalLight for uniform, shadowless illumination.

**When to use:** Required for MAP-06 (bright, even, static lighting with no dark corners).

**Example:**
```typescript
// Sources:
// - https://sbcode.net/threejs/hemisphere-light/
// - https://discoverthreejs.com/book/first-steps/ambient-lighting/
class MapLighting {
  setup(scene: THREE.Scene): void {
    // HemisphereLight: sky-to-ground gradient, no shadows, uniform base lighting
    const hemisphereLight = new THREE.HemisphereLight(
      0xffffff,  // Sky color (white)
      0x888888,  // Ground color (light grey)
      0.6        // Intensity
    );
    scene.add(hemisphereLight);

    // DirectionalLight: simulates sun, adds definition without harsh shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = false;  // CRITICAL: disable shadows
    scene.add(directionalLight);

    // Optional: Additional fill lights to eliminate dark corners
    const fillLight1 = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight1.position.set(-50, 50, -50);
    fillLight1.castShadow = false;
    scene.add(fillLight1);

    const fillLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight2.position.set(50, 50, -50);
    fillLight2.castShadow = false;
    scene.add(fillLight2);

    // Note: WebGLRenderer shadow settings not needed (shadows disabled)
    // renderer.shadowMap.enabled = false;  // Default, explicitly set if unsure
  }
}
```

### Pattern 6: Mesh Optimization for 150+ Objects (Instancing/Batching)

**What:** Reduce draw calls by merging or instancing geometry sharing materials.

**When to use:** If performance profiling shows draw call bottleneck (150+ meshes).

**Example:**
```typescript
// Sources:
// - https://www.utsubo.com/blog/threejs-best-practices-100-tips
// - https://threejsfundamentals.org/threejs/lessons/threejs-optimize-lots-of-objects.html

// Option 1: Merge geometries with same material (static geometry)
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

class MeshOptimizer {
  // Merge all meshes with orange material into single mesh (1 draw call)
  mergeByMaterial(scene: THREE.Scene): void {
    const meshesByMaterial = new Map<THREE.Material, THREE.Mesh[]>();

    // Group meshes by material
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const material = object.material as THREE.Material;
        if (!meshesByMaterial.has(material)) {
          meshesByMaterial.set(material, []);
        }
        meshesByMaterial.get(material)!.push(object);
      }
    });

    // Merge each material group
    for (const [material, meshes] of meshesByMaterial) {
      if (meshes.length < 2) continue;  // Skip if only one mesh

      const geometries = meshes.map(mesh => {
        // Apply mesh transform to geometry
        const geo = mesh.geometry.clone();
        geo.applyMatrix4(mesh.matrixWorld);
        return geo;
      });

      const merged = mergeGeometries(geometries, false);
      const mergedMesh = new THREE.Mesh(merged, material);
      scene.add(mergedMesh);

      // Remove original meshes
      meshes.forEach(mesh => {
        scene.remove(mesh);
        mesh.geometry.dispose();
      });

      console.log(`Merged ${meshes.length} meshes into 1 (material: ${material.name})`);
    }
  }

  // Option 2: InstancedMesh for repeated geometry (e.g., cover boxes)
  // Use when same geometry repeated many times (cubes, barrels, etc.)
  instanceRepeatedGeometry(scene: THREE.Scene): void {
    // Identify meshes with identical geometry + material
    // Replace with InstancedMesh (1 draw call for all instances)
    // See: https://threejs.org/docs/#api/en/objects/InstancedMesh
  }
}

// Performance target: <100 draw calls for 60fps
// Check with: renderer.info.render.calls
```

### Anti-Patterns to Avoid

- **Recreating map manually in Blender**: BSP decompile workflow saves 100+ hours of manual work
- **Using OBJ export instead of GLTF**: GLTF supports custom properties, PBR materials, animations; OBJ is legacy
- **Not baking procedural materials**: Blender procedural shaders (Brick Texture, Math nodes) do NOT export to GLTF - always bake to image textures
- **Building Octree every frame**: Octree construction is expensive (100+ ms for complex geometry) - build once on map load, reuse for all collision queries
- **Not disabling shadows**: Shadows add GPU overhead and darken corners, violating MAP-06 requirement for bright, even lighting
- **Loading uncompressed GLTF**: Use .glb (binary) instead of .gltf (JSON) for smaller file size and faster parsing
- **Not disposing old map on reload**: Three.js geometries/materials not garbage collected - always call .dispose() when changing maps

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| BSP geometry extraction | Custom BSP parser from scratch | BSPSource decompiler + Blender import | Source BSP format is complex (40+ lumps), decompile handles brush entities, textures, metadata |
| Spatial partitioning | Manual collision detection (loop all triangles) | Three.js Octree (examples/jsm/math/) | O(log n) vs O(n), official Three.js code, used in games_fps.html |
| GLTF loading | Manual buffer parsing | GLTFLoader | Handles Draco compression, KTX2 textures, animations, skins - 1000+ edge cases |
| Capsule-box collision math | Custom penetration depth solver | Three.js Capsule + Octree.capsuleIntersect | Official implementation handles sliding, normal calculation, edge cases |
| Texture baking | Manual UV unwrap + render to texture | Blender bake to image texture | Automatic UV layout, multi-material support, handles procedural node trees |

**Key insight:** BSP → Blender → GLTF workflow leverages mature tools instead of reinventing complex parsers. Three.js examples (Octree, Capsule) provide production-ready collision code - copy and use directly.

## Common Pitfalls

### Pitfall 1: Procedural Materials Don't Export to GLTF

**What goes wrong:** Materials look correct in Blender but appear grey/missing in Three.js after GLTF export.

**Why it happens:** GLTF format only supports image textures and Principled BSDF parameters. Blender procedural nodes (Brick Texture, Math, ColorRamp) are NOT compatible with GLTF standard.

**How to avoid:**
1. Design materials with Principled BSDF + image textures (not procedural nodes)
2. OR bake procedural materials to image textures before export:
   - UV unwrap all meshes (Smart UV Project)
   - Create new image texture node (2048x2048)
   - Select all objects → Render Properties → Bake → Diffuse
   - Save baked texture (Alt+S in Image Editor)
   - Replace procedural material with Principled BSDF + baked texture

**Warning signs:**
- Materials preview correctly in Blender but appear grey in Three.js
- GLTF validator shows "materials using unsupported features"
- No textures loaded in GLTFLoader callback

**Reference:** [glTF workflow with Blender - Braincoke](https://braincoke.fr/blog/2020/04/gl-tf-workflow-with-blender/)

### Pitfall 2: Octree Not Rebuilt After Map Load

**What goes wrong:** Collision detection doesn't work, player falls through map geometry.

**Why it happens:** Forgot to call `worldOctree.fromGraphNode(scene)` after loading GLTF, or Octree built from empty scene before GLTF loaded.

**How to avoid:**
```typescript
async loadMap(path: string) {
  const scene = await this.mapLoader.load(path);
  this.mainScene.add(scene);  // Add to Three.js scene

  // CRITICAL: Build octree AFTER GLTF added to scene
  this.collisionWorld.buildFromScene(scene);
  console.log('Octree ready for collision queries');
}
```

**Warning signs:**
- Console shows "Octree built in 0ms" (should be 50-200ms for complex geometry)
- Player falls through floor despite map visible
- `octree.capsuleIntersect()` always returns null

### Pitfall 3: Custom Properties Not Exported from Blender

**What goes wrong:** Spawn point objects exist in Blender but `object.userData` is empty in Three.js.

**Why it happens:** "Include → Custom Properties" not enabled in Blender GLTF export settings.

**How to avoid:**
1. Blender → File → Export → glTF 2.0
2. Expand "Include" section in export sidebar
3. Check "Custom Properties" checkbox
4. Export GLB

**Warning signs:**
- `object.userData` is `{}` for objects that should have custom properties
- Spawn point extraction logs "Spawn points not found in GLTF"
- Console shows object names but no userData

**Reference:** [glTF 2.0 - Blender Manual](https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html)

### Pitfall 4: Collision Capsule Size Mismatch with Player Model

**What goes wrong:** Player model clips through walls, or collides before visually touching geometry.

**Why it happens:** Capsule dimensions don't match visual player representation (box geometry in Phase 1 is 24x72x24 HU, capsule must match).

**How to avoid:**
```typescript
// Phase 1 player box: 24 width, 72 height (in Hammer Units)
// Capsule should match:
const PLAYER_RADIUS = 24 / 2;  // 12 HU (half width)
const PLAYER_HEIGHT = 72;       // 72 HU

this.playerCollider = new Capsule(
  new THREE.Vector3(0, PLAYER_RADIUS, 0),           // Bottom (feet + radius)
  new THREE.Vector3(0, PLAYER_HEIGHT - PLAYER_RADIUS, 0),  // Top (head - radius)
  PLAYER_RADIUS                                      // Radius
);
```

**Warning signs:**
- Player head sticks through low ceilings
- Player can squeeze through gaps narrower than 24 HU
- Collision triggers before visual model touches wall

### Pitfall 5: Draw Call Performance Bottleneck Not Identified

**What goes wrong:** Frame rate drops on complex maps but profiling shows GPU idle.

**Why it happens:** 150+ individual meshes each trigger draw call, CPU-GPU communication overhead.

**How to avoid:**
1. Check draw call count: `renderer.info.render.calls`
2. If >100 draw calls and FPS <60, investigate mesh merging
3. Use Chrome DevTools Performance profiler to identify bottleneck
4. Merge static geometry by material BEFORE adding to scene

**Warning signs:**
- FPS drops when looking at geometry-heavy areas
- `renderer.info.render.calls` > 100
- GPU utilization low (<50%) but FPS still drops
- Performance profiler shows long frames but GPU mostly idle

**Reference:** [Building Efficient Three.js Scenes - Codrops](https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/)

### Pitfall 6: Collision Response Removes Horizontal Velocity

**What goes wrong:** Player strafing along wall causes slowdown instead of smooth sliding.

**Why it happens:** Collision response removes ALL velocity instead of only component perpendicular to surface.

**How to avoid:**
```typescript
// WRONG: Zeroes all velocity on collision
if (result) {
  this.velocity.set(0, 0, 0);  // ❌ Player stops completely
}

// CORRECT: Only remove velocity INTO surface (preserve sliding)
if (result) {
  const velocityIntoSurface = this.velocity.dot(result.normal);
  if (velocityIntoSurface < 0) {
    // Remove only perpendicular component, preserve tangent (sliding)
    this.velocity.addScaledVector(result.normal, -velocityIntoSurface);
  }
}
```

**Warning signs:**
- Player stops moving when touching walls
- Strafing along wall feels sluggish
- Bunny hopping into angled ramps kills all speed

## Code Examples

### Complete Map Loading with Octree Integration

```typescript
// Demonstrates full workflow: GLTF load → Octree build → collision integration
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Octree } from 'three/examples/jsm/math/Octree.js';

class MapManager {
  private loader = new GLTFLoader();
  private worldOctree = new Octree();
  private currentMap?: THREE.Scene;

  async loadMap(
    path: string,
    mainScene: THREE.Scene,
    movementEngine: MovementEngine
  ): Promise<void> {
    console.log(`Loading map: ${path}`);

    // Dispose previous map if exists
    if (this.currentMap) {
      this.disposeMap();
    }

    // Load GLTF
    const gltf = await new Promise<any>((resolve, reject) => {
      this.loader.load(path, resolve, undefined, reject);
    });

    this.currentMap = gltf.scene;
    mainScene.add(this.currentMap);

    console.log('Map geometry loaded, building collision octree...');

    // Build octree from loaded geometry
    const octreeStart = performance.now();
    this.worldOctree.fromGraphNode(this.currentMap);
    const octreeTime = performance.now() - octreeStart;
    console.log(`Octree built in ${octreeTime.toFixed(2)}ms`);

    // Extract spawn points
    const spawnPoints = new SpawnPoints();
    spawnPoints.extract(this.currentMap);

    // Inject collision world into movement engine
    movementEngine.setCollisionWorld(this.worldOctree);

    // Setup lighting
    const lighting = new MapLighting();
    lighting.setup(mainScene);

    console.log('Map ready for gameplay');
  }

  private disposeMap(): void {
    if (!this.currentMap) return;

    this.currentMap.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach(mat => mat.dispose());
        } else {
          object.material.dispose();
        }
      }
    });

    this.worldOctree.clear();  // Clear octree spatial structure
    console.log('Previous map disposed');
  }

  getWorldOctree(): Octree {
    return this.worldOctree;
  }
}
```

### Blender Material Baking Workflow (Python Script)

```python
# Run in Blender Scripting tab to batch-bake all procedural materials
# Source: https://docs.blender.org/manual/en/latest/render/cycles/baking.html
import bpy

def bake_all_materials():
    """Bake all procedural materials to image textures for GLTF export"""

    # Select all mesh objects
    bpy.ops.object.select_all(action='DESELECT')
    mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']

    for obj in mesh_objects:
        print(f"Baking: {obj.name}")

        # Select object
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)

        # Check if UV map exists, create if not
        if not obj.data.uv_layers:
            bpy.ops.object.mode_set(mode='EDIT')
            bpy.ops.mesh.select_all(action='SELECT')
            bpy.ops.uv.smart_project(angle_limit=66, island_margin=0.02)
            bpy.ops.object.mode_set(mode='OBJECT')

        # Create image for baking
        image_name = f"{obj.name}_baked"
        image = bpy.data.images.new(image_name, width=2048, height=2048)

        # Add image texture node to material (bake target)
        for mat_slot in obj.material_slots:
            mat = mat_slot.material
            if mat and mat.use_nodes:
                nodes = mat.node_tree.nodes

                # Create image texture node
                img_node = nodes.new('ShaderNodeTexImage')
                img_node.image = image
                img_node.select = True
                nodes.active = img_node  # CRITICAL: active node = bake target

        # Bake diffuse color
        bpy.context.scene.cycles.bake_type = 'DIFFUSE'
        bpy.context.scene.render.bake.use_pass_direct = False
        bpy.context.scene.render.bake.use_pass_indirect = False
        bpy.context.scene.render.bake.use_pass_color = True

        bpy.ops.object.bake(type='DIFFUSE')

        # Save image
        image.filepath_raw = f"//textures/{image_name}.png"
        image.file_format = 'PNG'
        image.save()

        print(f"  Saved: {image.filepath_raw}")

        obj.select_set(False)

    print("Baking complete! Replace materials with Principled BSDF + baked textures before GLTF export.")

# Run baking
bake_all_materials()
```

### Debug: Visualize Octree Spatial Partitioning

```typescript
// Useful for debugging collision issues - shows octree subdivision boxes
import { OctreeHelper } from 'three/examples/jsm/helpers/OctreeHelper.js';

class OctreeDebugVisualizer {
  private helper?: OctreeHelper;

  toggle(octree: Octree, scene: THREE.Scene): void {
    if (this.helper) {
      // Remove existing helper
      scene.remove(this.helper);
      this.helper = undefined;
    } else {
      // Create and add helper
      this.helper = new OctreeHelper(octree, 0x00ff00);
      scene.add(this.helper);
      console.log('Octree visualization enabled (green wireframe boxes)');
    }
  }
}

// Usage: Press F4 to toggle octree visualization
document.addEventListener('keydown', (e) => {
  if (e.code === 'F4') {
    octreeDebugVisualizer.toggle(worldOctree, scene);
  }
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual BSP parsing in JS | BSPSource decompile → Blender → GLTF | ~2015 | Mature toolchain vs incomplete parsers |
| AABB collision only | Octree + Capsule (Three.js examples) | r125+ (2021) | O(log n) vs O(n), smooth sliding |
| OBJ/FBX export | GLTF/GLB export | ~2017 | Custom properties, PBR, animations, web-optimized |
| Manual geometry merging | BufferGeometryUtils.mergeGeometries | r100+ | Automated, handles transforms |
| Shadow mapping for lighting | Bright ambient + directional (no shadows) | N/A | Performance + MAP-06 requirement |
| three-mesh-bvh (community) | Official Three.js Octree (examples/jsm/) | r160+ (2024) | Official support, games_fps.html demo |

**Deprecated/outdated:**
- **Quake III BSP parsers for Source engine**: Source BSP format diverged significantly, different lump structure, entities, brushes
- **ColladaLoader for Blender export**: GLTF replaced Collada (.dae) as web 3D standard ~2017
- **Manual octree implementations**: Three.js r160+ includes Octree in examples/jsm/math/ (copy into project)

## Open Questions

### 1. BSPSource Decompilation Accuracy for aim_ag_texture2

**What we know:**
- BSPSource is the standard tool for Source engine BSP decompilation
- Outputs .vmf (Hammer format)
- Documented limitations: "Some solids, instances, and areaportals may be broken"

**What's unclear:**
- Whether aim_ag_texture2 decompiles cleanly (no broken brushes)
- If decompiled geometry matches pixel-perfect requirement
- Ease of importing .vmf into Blender (requires community plugin)

**Recommendation:**
- Test BSPSource decompile workflow early in Phase 2
- If decompilation produces broken geometry, consider:
  - Manual geometry recreation in Blender using reference screenshots
  - Hybrid approach: decompile for layout reference, manually rebuild clean geometry
- Validate against reference screenshots before proceeding to materials

**Confidence:** MEDIUM (BSPSource is proven but map-specific results vary)

### 2. Material Baking vs Manual Flat-Color Recreation

**What we know:**
- CONTEXT.md specifies flat solid colors (orange, grey, dark grey) with grid lines
- Blender procedural materials must be baked or replaced with image textures
- Baking adds workflow complexity and file size (textures)

**What's unclear:**
- Whether simple flat colors need baking at all (could use MeshStandardMaterial with color property)
- How to recreate "thin white grid lines" from reference screenshots (texture vs geometry)

**Recommendation:**
- Start with simple approach: MeshStandardMaterial with flat colors (no textures)
  ```typescript
  const orangeMaterial = new THREE.MeshStandardMaterial({ color: 0xdd7722 });
  ```
- For grid lines:
  - Option A: Bake grid texture in Blender (2048x2048 with grid pattern)
  - Option B: Use shader (custom fragment shader with UV-based grid)
  - Option C: Ignore grid lines if not critical for gameplay
- Validate with project owner if grid lines are aesthetic requirement or just reference

**Confidence:** HIGH (flat colors work without baking), LOW (grid line recreation method)

### 3. Collision Performance with 150+ Mesh Octree

**What we know:**
- Octree reduces collision queries from O(n) to O(log n)
- Three.js games_fps.html example handles complex geometry well
- Phase 1 movement engine already runs at 64Hz fixed timestep

**What's unclear:**
- Whether 150 mesh objects exceeds performance budget for 64Hz collision queries
- If mesh merging is necessary or premature optimization
- Impact of collision substeps (Three.js example uses 5 substeps per frame)

**Recommendation:**
- Implement Octree collision first WITHOUT mesh merging
- Profile with Chrome DevTools: target <2ms per physics tick (64Hz = 15.6ms budget)
- If collision queries >2ms, then investigate:
  - Mesh merging to reduce Octree complexity
  - Reducing collision substeps from 5 to 3
  - Using simplified collision geometry (invisible low-poly collision mesh)
- Measure first, optimize only if proven bottleneck

**Confidence:** MEDIUM-HIGH (Octree likely sufficient, merge if profiling proves necessary)

### 4. Spawn Point Symmetry Validation

**What we know:**
- MAP-04 requires one fixed spawn per team on opposite ends
- MAP-03 requires symmetrical layout (neither side advantaged)
- Spawn points can be extracted from GLTF custom properties or hardcoded

**What's unclear:**
- Exact spawn locations from original aim_ag_texture2 BSP
- How to validate symmetry mathematically (center point, rotation, distance)

**Recommendation:**
- Extract spawn entities from decompiled .vmf (info_player_terrorist, info_player_counterterrorist)
- If BSP decompile doesn't preserve spawn entities:
  - Load aim_ag_texture2 in Hammer editor, note spawn coordinates
  - OR hardcode spawn positions from reference screenshots
- Validate symmetry: ensure `distance(redSpawn, center) == distance(blueSpawn, center)`
- Create debug visualization (colored spheres at spawn points) to verify placement

**Confidence:** LOW (spawn entity extraction from BSP/VMF not researched), HIGH (manual placement fallback)

## Sources

### Primary (HIGH confidence)

**Three.js Octree + Capsule:**
- [Three.js games_fps.html example](https://github.com/mrdoob/three.js/blob/dev/examples/games_fps.html) - Official FPS collision demo
- [Three.js Octree.js source](https://github.com/mrdoob/three.js/blob/master/examples/jsm/math/Octree.js) - Official implementation
- [Three.js Capsule.js source](https://github.com/mrdoob/three.js/blob/master/examples/jsm/math/Capsule.js) - Official implementation

**GLTF Export:**
- [Blender glTF 2.0 Manual](https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html) - Official Blender documentation
- [glTF workflow with Blender - Braincoke](https://braincoke.fr/blog/2020/04/gl-tf-workflow-with-blender/) - Baking tutorial

**BSP Decompilation:**
- [BSPSource - Valve Developer Community](https://developer.valvesoftware.com/wiki/BSPSource) - Official tool documentation
- [GitHub: ata4/bspsrc](https://github.com/ata4/bspsrc) - BSPSource repository

**Three.js GLTFLoader:**
- [Three.js GLTFLoader documentation](https://threejs.org/docs/#examples/en/loaders/GLTFLoader) - Official API docs

### Secondary (MEDIUM confidence)

**Collision Detection:**
- [Collision Detection in ThreeJs made easy using BVH - Medium](https://medium.com/@pablobandinopla/collision-detection-in-threejs-made-easy-using-bvh-1ce6012199e8) - BVH vs Octree comparison
- [three-mesh-bvh GitHub](https://github.com/gkjohnson/three-mesh-bvh) - Alternative to Octree (if needed)

**Performance Optimization:**
- [100 Three.js Tips That Actually Improve Performance (2026)](https://www.utsubo.com/blog/threejs-best-practices-100-tips) - Draw call reduction, batching, instancing
- [Building Efficient Three.js Scenes - Codrops](https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/) - Mesh merging, optimization

**Lighting:**
- [Three.js HemisphereLight - sbcode.net](https://sbcode.net/threejs/hemisphere-light/) - HemisphereLight tutorial
- [Ambient Lighting - Discover three.js](https://discoverthreejs.com/book/first-steps/ambient-lighting/) - Lighting best practices

**Custom Properties:**
- [BCON23: Custom Data in glTF files](https://gustafwaldemarson.com/pages/publications/custom-gltf-data/) - glTF extras field
- [Reading glTF extras from Blender - Castle Game Engine](https://castle-engine.io/wp/2020/12/26/reading-gltf-extras-e-g-from-blender-custom-properties-to-x3d-metadata-support-changing-shape-collision-mode-from-blender-documentation-improvements/) - Custom properties workflow

### Tertiary (LOW confidence)

**BSP Parsing (Quake III, not Source):**
- [openarena-bsp-parser - npm](https://www.npmjs.com/package/openarena-bsp-parser) - Quake III BSP parser (NOT compatible with Source)
- Marked LOW confidence: No mature Source engine BSP parser found for JavaScript

**aim_ag_texture2 Downloads:**
- [aim_ag_texture2 download - tsarvar.com](https://tsarvar.com/en/maps/counter-strike-source/aim_ag_texture2) - Map download source
- [aim_ag_texture2 - GameMaps.com](https://www.gamemaps.com/details/1317) - Alternative download

## Metadata

**Confidence breakdown:**
- **Standard stack: HIGH** - Three.js GLTFLoader and Octree/Capsule are official, BSPSource is community standard
- **Architecture: HIGH** - GLTF workflow proven, Octree integration pattern from official Three.js examples
- **Pitfalls: MEDIUM** - Material baking and custom properties require careful workflow, BSP decompile quality map-dependent
- **Open questions: MEDIUM** - BSPSource accuracy unknown for this specific map, spawn point extraction needs validation

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (30 days - Three.js stable, GLTF format stable, tools mature)

**Critical dependencies:**
- Phase 1 movement engine must be complete before integration
- BSPSource decompile quality determines if manual geometry recreation needed
- CONTEXT.md specifies pixel-perfect recreation - may conflict with BSP decompile limitations

**Recommended validation:**
- Early BSPSource test decompile to assess geometry quality
- Material workflow prototype (bake vs flat colors) before full map creation
- Octree performance profiling with test geometry before integration
