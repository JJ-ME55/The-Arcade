/**
 * Inspect mannequin GLB to find the scale/transform issue.
 * Run: node visual/inspect_glb.mjs
 */
import { readFileSync } from 'fs';

const buf = readFileSync('visual/mannequin_neutral.glb');

// Parse GLB header
const magic = buf.readUInt32LE(0);
const version = buf.readUInt32LE(4);
const length = buf.readUInt32LE(8);
console.log(`GLB: magic=0x${magic.toString(16)} version=${version} length=${length}`);

// Chunk 0: JSON
const chunk0Len = buf.readUInt32LE(12);
const chunk0Type = buf.readUInt32LE(16);
const jsonStr = buf.toString('utf8', 20, 20 + chunk0Len);
const gltf = JSON.parse(jsonStr);

// Print scene hierarchy
console.log('\n=== NODES ===');
for (const [i, node] of gltf.nodes.entries()) {
  const parts = [`Node[${i}] "${node.name || ''}"`];
  if (node.translation) parts.push(`T=(${node.translation.map(v=>v.toFixed(4)).join(',')})`);
  if (node.rotation) parts.push(`R=(${node.rotation.map(v=>v.toFixed(4)).join(',')})`);
  if (node.scale) parts.push(`S=(${node.scale.map(v=>v.toFixed(4)).join(',')})`);
  if (node.matrix) parts.push(`M=[${node.matrix.map(v=>v.toFixed(4)).join(',')}]`);
  if (node.mesh !== undefined) parts.push(`mesh=${node.mesh}`);
  if (node.skin !== undefined) parts.push(`skin=${node.skin}`);
  if (node.children) parts.push(`children=[${node.children.join(',')}]`);
  console.log(parts.join('  '));
}

// Print skins
console.log('\n=== SKINS ===');
if (gltf.skins) {
  for (const [i, skin] of gltf.skins.entries()) {
    console.log(`Skin[${i}] "${skin.name || ''}" skeleton=${skin.skeleton} joints=[${skin.joints.length} joints]`);
  }
}

// Print meshes (just names and vertex counts)
console.log('\n=== MESHES ===');
if (gltf.meshes) {
  for (const [i, mesh] of gltf.meshes.entries()) {
    const prim = mesh.primitives[0];
    const posAccessor = gltf.accessors[prim.attributes.POSITION];
    console.log(`Mesh[${i}] "${mesh.name || ''}" vertices=${posAccessor.count} min=[${posAccessor.min?.map(v=>v.toFixed(4)).join(',')}] max=[${posAccessor.max?.map(v=>v.toFixed(4)).join(',')}]`);
  }
}

// Find the root scene node(s)
console.log('\n=== SCENE ROOT ===');
const sceneNodes = gltf.scenes[0].nodes;
console.log(`Scene root nodes: [${sceneNodes.join(',')}]`);
for (const idx of sceneNodes) {
  const node = gltf.nodes[idx];
  console.log(`  Node[${idx}] "${node.name}" children=[${node.children?.join(',') || ''}]`);
}
