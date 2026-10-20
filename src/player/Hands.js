import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const SKIN = new THREE.Color(0xc99a72);
const SLEEVE = new THREE.Color(0x2a2f38);

function paint(geo, color) {
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = color.r;
    arr[i * 3 + 1] = color.g;
    arr[i * 3 + 2] = color.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

/** Crude mitten: forearm, palm, four fingers, a thumb. Good enough at arm's length. */
function buildHand() {
  const pieces = [
    [0.105, 0.105, 0.36, 0, 0, 0.21, SLEEVE],
    [0.1, 0.055, 0.12, 0, 0, 0.0, SKIN],
  ];
  for (let i = 0; i < 4; i++) {
    pieces.push([0.022, 0.03, 0.085, -0.034 + i * 0.022, 0.002, -0.105, SKIN]);
  }
  pieces.push([0.028, 0.033, 0.055, -0.058, 0.0, -0.02, SKIN]);
  const geos = pieces.map(([w, h, d, x, y, z, c]) => {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(x, y, z);
    return paint(g, c);
  });
  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  return merged;
}

/**
 * Bare hands. No weapon, nothing to hide behind — just your own two fists,
 * swaying as you walk and reaching out when you touch something.
 */
export class Hands {
  constructor(camera) {
    this.camera = camera;
    const geo = buildHand();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x0a0806 });
    this.material = mat;

    this.left = new THREE.Mesh(geo, mat);
    this.right = new THREE.Mesh(geo, mat);

    this.leftHome = {
      pos: new THREE.Vector3(-0.3, -0.33, -0.5),
      rot: new THREE.Euler(0.42, 0.3, 0.16),
    };
    this.rightHome = {
      pos: new THREE.Vector3(0.3, -0.33, -0.5),
      rot: new THREE.Euler(0.42, -0.3, -0.16),
    };

    this.left.position.copy(this.leftHome.pos);
    this.left.rotation.copy(this.leftHome.rot);
    this.right.position.copy(this.rightHome.pos);
    this.right.rotation.copy(this.rightHome.rot);

    for (const m of [this.left, this.right]) {
      m.frustumCulled = false;
      camera.add(m);
    }

    this.bob = 0;
    this.reach = 0;
    this.swayX = 0;
    this.swayY = 0;
  }

  /** Called when the player interacts: the right hand lunges forward. */
  poke() {
    this.reach = 1;
  }

  update(dt, { moving = 0, lookX = 0, lookY = 0 } = {}) {
    this.bob += dt * (2 + moving * 2.4);
    this.reach = Math.max(0, this.reach - dt * 3.2);

    // Lead the camera slightly — hands lag behind a fast turn.
    this.swayX += (THREE.MathUtils.clamp(-lookX * 0.0012, -0.05, 0.05) - this.swayX) * Math.min(1, dt * 7);
    this.swayY += (THREE.MathUtils.clamp(-lookY * 0.0012, -0.05, 0.05) - this.swayY) * Math.min(1, dt * 7);

    const amp = 0.006 + moving * 0.012;
    const bx = Math.cos(this.bob) * amp;
    const by = Math.sin(this.bob * 2) * amp * 0.8;

    const punch = Math.sin(this.reach * Math.PI);

    this.left.position.set(
      this.leftHome.pos.x + bx + this.swayX,
      this.leftHome.pos.y + by + this.swayY - this.reach * 0.02,
      this.leftHome.pos.z - punch * 0.05
    );
    this.left.rotation.set(
      this.leftHome.rot.x - this.swayY * 1.2 - punch * 0.1,
      this.leftHome.rot.y - this.swayX * 1.4,
      this.leftHome.rot.z
    );

    this.right.position.set(
      this.rightHome.pos.x + bx + this.swayX - punch * 0.12,
      this.rightHome.pos.y + by + this.swayY - punch * 0.04,
      this.rightHome.pos.z - punch * 0.3
    );
    this.right.rotation.set(
      this.rightHome.rot.x - this.swayY * 1.2 - punch * 0.55,
      this.rightHome.rot.y - this.swayX * 1.4 + punch * 0.3,
      this.rightHome.rot.z
    );
  }
}
