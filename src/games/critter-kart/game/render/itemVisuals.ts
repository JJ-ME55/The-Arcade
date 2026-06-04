// @ts-nocheck
import * as THREE from 'three';
import { buildItemBalloonTextures } from './itemIcons';

const balloonTextures = (() => {
  let cache: THREE.CanvasTexture[] | null = null;
  return () => (cache ??= buildItemBalloonTextures());
})();

/** Floating item balloon, coloured by item type, showing the actual weapon/boost icon
 *  (matches the HUD icon the player sees in the corner after grabbing it — so they know
 *  which balloon corresponds to which item). itemId is an ITEM constant from items.ts. */
export function makeBalloon(color: number, itemId: number): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(2.4, 18, 18),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3, roughness: 0.35 }),
  );
  body.scale.set(1, 1.25, 1);
  g.add(body);
  const knot = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1, 8), new THREE.MeshStandardMaterial({ color }));
  knot.position.y = -3;
  knot.rotation.x = Math.PI;
  g.add(knot);
  const textures = balloonTextures();
  if (itemId >= 0 && itemId < textures.length) {
    // depthTest ON so world geometry (e.g. the bridge) correctly occludes the icon — it used
    // to be off, which made the icon ghost straight through the bridge. Sat ABOVE the balloon
    // (not at its centre) so the balloon's own front face never hides it.
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: textures[itemId], transparent: true }));
    sprite.scale.set(3.4, 3.4, 1);
    sprite.position.set(0, 4.0, 0);
    g.add(sprite);
  }
  return g;
}

// Cached category emblem textures (cream coin + a bold symbol): attack / speed / defence.
const catTex: Record<number, THREE.CanvasTexture> = {};
function categoryTexture(category: number): THREE.CanvasTexture {
  if (catTex[category]) return catTex[category];
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.beginPath();
  g.arc(64, 64, 56, 0, Math.PI * 2);
  g.fillStyle = '#fffdf3';
  g.fill();
  g.lineWidth = 7;
  g.strokeStyle = 'rgba(44,32,20,0.5)';
  g.stroke();
  g.fillStyle = '#2c2014';
  g.strokeStyle = '#2c2014';
  g.lineWidth = 11;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  if (category === 1) {
    // SPEED — double chevron »
    for (const dx of [-12, 8]) { g.beginPath(); g.moveTo(42 + dx, 38); g.lineTo(70 + dx, 64); g.lineTo(42 + dx, 90); g.stroke(); }
  } else if (category === 2) {
    // DEFENCE — shield
    g.beginPath();
    g.moveTo(64, 30); g.lineTo(95, 43); g.lineTo(95, 66);
    g.quadraticCurveTo(95, 92, 64, 101);
    g.quadraticCurveTo(33, 92, 33, 66); g.lineTo(33, 43);
    g.closePath();
    g.lineWidth = 9;
    g.stroke();
  } else {
    // ATTACK — 4-point burst star
    const cx = 64, cy = 64, R = 36, r = 14;
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const ang = -Math.PI / 2 + i * Math.PI / 4;
      const rad = i % 2 ? r : R;
      const x = cx + Math.cos(ang) * rad, y = cy + Math.sin(ang) * rad;
      if (i) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.closePath();
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.minFilter = THREE.LinearMipmapLinearFilter;
  catTex[category] = t;
  return t;
}

/** A coloured, category-coded item balloon. The colour + emblem on its FACE tell you what KIND
 *  of item it gives (red = attack, blue = speed, yellow = defence) so you can choose your lane;
 *  the exact item is still rolled on pickup. The emblem is a fixed-facing decal on the front of
 *  the balloon (depth-tested, so it never bleeds through the bridge) — orient the balloon so the
 *  face points back down the track toward oncoming karts. */
export function makeCategoryBalloon(category: number): THREE.Group {
  const g = new THREE.Group();
  const color = category === 1 ? 0x2f8fd0 : category === 2 ? 0xf2c14e : 0xd63a3a; // blue / yellow / red
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(2.4, 18, 18),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.32, roughness: 0.33 }),
  );
  body.scale.set(1, 1.25, 1);
  g.add(body);
  const knot = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1, 8), new THREE.MeshStandardMaterial({ color }));
  knot.position.y = -3;
  knot.rotation.x = Math.PI;
  g.add(knot);
  // emblem decal on the front face of the balloon (just outside the sphere surface)
  const emblem = new THREE.Mesh(
    new THREE.PlaneGeometry(2.9, 2.9),
    new THREE.MeshBasicMaterial({ map: categoryTexture(category), transparent: true, side: THREE.DoubleSide, depthWrite: false }),
  );
  emblem.position.set(0, 0.3, 2.45);
  g.add(emblem);
  return g;
}

/** An acorn (body + cap + stem). */
function makeAcorn(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.5, 14, 14), new THREE.MeshStandardMaterial({ color: 0xc08a4a, roughness: 0.6 }));
  body.scale.set(1, 1.3, 1);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(1.6, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.3), new THREE.MeshStandardMaterial({ color: 0x6b4422, roughness: 0.8 }));
  cap.position.y = 0.8;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.7), new THREE.MeshStandardMaterial({ color: 0x4a2f15 }));
  stem.position.y = 1.5;
  g.add(body, cap, stem);
  return g;
}

/** A chunky cartoon bee. */
function makeBee(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.5, 14, 14), new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.5 }));
  body.scale.set(1, 1, 1.4);
  g.add(body);
  const bandMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
  for (const z of [-0.5, 0.5]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.28, 8, 16), bandMat);
    band.rotation.y = Math.PI / 2;
    band.position.z = z;
    band.scale.set(1, 1, 1);
    g.add(band);
  }
  const wingMat = new THREE.MeshStandardMaterial({ color: 0xeaf6ff, transparent: true, opacity: 0.8 });
  for (const x of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 8), wingMat);
    wing.scale.set(0.7, 0.2, 1);
    wing.position.set(x * 1.1, 0.9, 0.2);
    g.add(wing);
  }
  return g;
}

export function makeProjectile(kind: 'acorn' | 'bee'): THREE.Group {
  const g = kind === 'bee' ? makeBee() : makeAcorn();
  g.position.y = 2.6;
  return g;
}

/** A glossy dark oil spill (irregular blobby puddle). */
export function makeTrap(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x0a0a12, metalness: 0.7, roughness: 0.12, emissive: 0x241a3a, emissiveIntensity: 0.35 });
  const blobs: [number, number, number][] = [
    [0, 0, 3.6],
    [2.2, 1.4, 2.2],
    [-2.0, 1.0, 2.4],
    [0.8, -2.2, 2.0],
  ];
  for (const [x, z, r] of blobs) {
    const c = new THREE.Mesh(new THREE.CircleGeometry(r, 20), mat);
    c.rotation.x = -Math.PI / 2;
    c.position.set(x, 0.05, z);
    g.add(c);
  }
  return g;
}

/** Twin exhaust flames that trail out the BACK of the kart (local -Z) while boosting. */
export function makeBoostFlame(): THREE.Group {
  const g = new THREE.Group();
  const cone = (radius: number, height: number, color: number, z: number, opacity = 1) => {
    const m = new THREE.Mesh(
      new THREE.ConeGeometry(radius, height, 10),
      new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }),
    );
    m.rotation.x = -Math.PI / 2; // tip points -Z (backward)
    m.position.z = z; // further back = more negative
    return m;
  };
  for (const side of [-1, 1]) {
    const outer = cone(0.85, 3.4, 0xff6a1a, -1.7, 0.8);
    const inner = cone(0.45, 2.3, 0xffe24d, -1.2);
    outer.position.x = inner.position.x = side * 0.9;
    g.add(outer, inner);
  }
  g.visible = false;
  return g;
}

/**
 * A bright jagged lightning bolt built from cylinder segments (a 1px Line is invisible
 * in WebGL). Its BOTTOM sits at the group's origin (y≈3), so positioning the group at a
 * kart makes the bolt strike right onto it, with a glow flash at the impact point.
 */
export function makeLightning(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xfff7d0, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  const pts: THREE.Vector3[] = [new THREE.Vector3(0, 3, 0)]; // impact point at the kart
  let y = 3;
  let x = 0;
  let z = 0;
  while (y < 42) {
    y += 3 + Math.random() * 3;
    x += (Math.random() * 2 - 1) * 2.6;
    z += (Math.random() * 2 - 1) * 2.6;
    pts.push(new THREE.Vector3(x, y, z));
  }
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const dir = new THREE.Vector3().subVectors(pts[i + 1], a);
    const len = dir.length();
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, len, 6), mat);
    seg.position.copy(a).addScaledVector(dir, 0.5);
    seg.quaternion.setFromUnitVectors(up, dir.clone().normalize());
    g.add(seg);
  }
  const glow = new THREE.Mesh(new THREE.SphereGeometry(2.6, 12, 12), mat);
  glow.position.set(0, 3, 0);
  g.add(glow);
  g.visible = false;
  return g;
}

/** A little dark rain cloud that hovers over a storm-slowed kart, so the slow is visible. */
export function makeStormCloud(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x4a5360, emissive: 0x20262e, emissiveIntensity: 0.4, roughness: 1 });
  const puffs: [number, number, number, number][] = [
    [0, 0, 0, 2.4],
    [2.2, -0.2, 0.3, 1.7],
    [-2.2, -0.1, -0.3, 1.8],
    [0.5, 0.5, 1.6, 1.5],
    [-0.7, 0.4, -1.4, 1.6],
  ];
  for (const [x, y, z, r] of puffs) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 10), mat);
    m.position.set(x, y, z);
    m.scale.y = 0.62;
    g.add(m);
  }
  // a couple of pale lightning flecks below the cloud
  const boltMat = new THREE.MeshBasicMaterial({ color: 0xfff3a0 });
  for (const x of [-0.8, 0.9]) {
    const bolt = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.8, 4), boltMat);
    bolt.position.set(x, -2.2, 0.2);
    bolt.rotation.z = Math.PI;
    g.add(bolt);
  }
  g.visible = false;
  return g;
}

export function makeShield(): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({ color: 0x66ff99, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
  const m = new THREE.Mesh(new THREE.RingGeometry(4.5, 5.6, 22), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = 3;
  m.visible = false;
  return m;
}

/** Dispose all geometries under an object (for cleanup of pooled entities). */
export function disposeObject(obj: THREE.Object3D): void {
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
  });
}
