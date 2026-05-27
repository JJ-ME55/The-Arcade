/**
 * Dump skeleton bone names, animations, and bbox for any GLB.
 * Run: node visual/inspect_skeleton.mjs <file.glb>
 */
import { readFileSync } from 'fs';

const file = process.argv[2] || 'visual/soldier_proto.glb';
const buf = readFileSync(file);

const chunk0Len = buf.readUInt32LE(12);
const jsonStr = buf.toString('utf8', 20, 20 + chunk0Len);
const gltf = JSON.parse(jsonStr);

console.log(`\n=== ${file} ===`);

// Skins / joints (bones)
if (gltf.skins) {
  for (const [i, skin] of gltf.skins.entries()) {
    console.log(`\nSkin[${i}] "${skin.name || ''}" joints=${skin.joints.length}`);
    const names = skin.joints.map(j => gltf.nodes[j].name);
    console.log(names.join('\n'));
  }
} else {
  console.log('No skins.');
}

// Animations
console.log('\n=== ANIMATIONS ===');
if (gltf.animations) {
  for (const [i, a] of gltf.animations.entries()) {
    console.log(`Anim[${i}] "${a.name || ''}" channels=${a.channels.length}`);
  }
} else {
  console.log('No animations.');
}

// Mesh bbox (overall) from POSITION accessors
console.log('\n=== MESH BBOX ===');
if (gltf.meshes) {
  for (const [i, mesh] of gltf.meshes.entries()) {
    for (const prim of mesh.primitives) {
      const acc = gltf.accessors[prim.attributes.POSITION];
      console.log(`Mesh[${i}] "${mesh.name||''}" verts=${acc.count} min=[${acc.min?.map(v=>v.toFixed(3)).join(',')}] max=[${acc.max?.map(v=>v.toFixed(3)).join(',')}]`);
    }
  }
}
