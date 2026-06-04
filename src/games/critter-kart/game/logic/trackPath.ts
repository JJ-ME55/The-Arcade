// @ts-nocheck
/**
 * A closed-loop track centreline, sampled from Catmull-Rom control points.
 * Framework-free (no Three.js): drives road rendering, on-track tests, lap
 * progress, and later the AI racing line — all from one source of truth.
 */
export interface Vec2 {
  x: number;
  z: number;
}

export interface TrackDef {
  name: string;
  control: Vec2[]; // loop control points (order = travel direction)
  halfWidth: number; // road half-width in world units
  laps: number;
  samplesPerSegment?: number;
  /** A progress range where the road crosses a gap. With `bridge: true` the road is
   * removed in the gap, water shows through, and a bridge model spans it — the kart's Y
   * is raycast onto the bridge deck so it physically drives on the structure.
   * Without `bridge`, the kart launches off a ramp to clear the water (or is respawned). */
  jumpZone?: { startProgress: number; endProgress: number; bridge?: boolean };
  /** A second water gap spanned by a (flat, drivable) wooden bridge. The road + ground are
   * removed across this range and a procedural bridge deck fills it at road height, so karts
   * just drive over — no jump/ramp. Purely a separate scenic crossing from `jumpZone`. */
  bridgeZone?: { startProgress: number; endProgress: number };
  /** Like bridgeZone but ARCHED — the deck humps up, and the kart's Y follows the arch
   * (parabola peaking mid-span), so you ride up and over it. */
  archBridgeZone?: { startProgress: number; endProgress: number };
  /** An OPTIONAL raised "upper deck" on ONE side of a stretch: a gentle ramp lifts you onto a
   * second level that carries a speed booster, then a ramp brings you back down — a risk/reward
   * speed line you take by steering onto the `side` half. The kart's Y follows the deck profile
   * while committed. `boostStart/boostEnd` is the progress sub-range of the booster strip. */
  upperDeckZone?: {
    startProgress: number; endProgress: number; // whole feature (entry ramp → deck → exit ramp)
    rampUpEnd: number; rampDownStart: number;   // flat deck spans [rampUpEnd, rampDownStart]
    boostStart: number; boostEnd: number;       // booster strip on the deck
    height: number;                              // deck height in world units
    side: -1 | 1;                                // -1 = left of centre-line, +1 = right
  };
}

export interface PathQuery {
  segment: number; // nearest segment index
  t: number; // 0..1 along that segment
  distance: number; // perpendicular distance from the centreline
  progress: number; // 0..1 around the whole loop
  px: number; // closest point on the centreline (x)
  pz: number; // closest point on the centreline (z)
}

const lerp = (a: Vec2, b: Vec2, u: number): Vec2 => ({ x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u });

/**
 * CENTRIPETal Catmull-Rom (alpha = 0.5). Unlike the uniform form, it parameterises
 * by sqrt(distance), which is mathematically guaranteed never to cusp, loop, or
 * self-intersect between control points — even when a short segment sits between
 * long ones (that case made the uniform spline overshoot into a hairpin at the
 * start/finish, twisting the road ribbon). Returns the point at t∈[0,1] from p1→p2.
 */
function centripetal(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
  const tj = (ti: number, a: Vec2, b: Vec2) => ti + Math.sqrt(Math.hypot(b.x - a.x, b.z - a.z)) || ti + 1e-4;
  const t0 = 0;
  const t1 = tj(t0, p0, p1);
  const t2 = tj(t1, p1, p2);
  const t3 = tj(t2, p2, p3);
  const T = t1 + t * (t2 - t1);
  const A1 = lerp(p0, p1, (T - t0) / (t1 - t0 || 1));
  const A2 = lerp(p1, p2, (T - t1) / (t2 - t1 || 1));
  const A3 = lerp(p2, p3, (T - t2) / (t3 - t2 || 1));
  const B1 = lerp(A1, A2, (T - t0) / (t2 - t0 || 1));
  const B2 = lerp(A2, A3, (T - t1) / (t3 - t1 || 1));
  return lerp(B1, B2, (T - t1) / (t2 - t1 || 1));
}

/** Sample a smooth closed loop through the control points (centripetal — no cusps). */
export function buildClosedPath(control: Vec2[], samplesPerSegment: number): Vec2[] {
  const n = control.length;
  const out: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = control[(i - 1 + n) % n];
    const p1 = control[i];
    const p2 = control[(i + 1) % n];
    const p3 = control[(i + 2) % n];
    for (let s = 0; s < samplesPerSegment; s++) {
      out.push(centripetal(p0, p1, p2, p3, s / samplesPerSegment));
    }
  }
  return out;
}

export class TrackPath {
  readonly name: string;
  readonly points: Vec2[];
  readonly halfWidth: number;
  readonly laps: number;
  readonly jumpZone?: { startProgress: number; endProgress: number; bridge?: boolean };
  readonly bridgeZone?: { startProgress: number; endProgress: number };
  readonly archBridgeZone?: { startProgress: number; endProgress: number };
  readonly upperDeckZone?: TrackDef['upperDeckZone'];
  private readonly segLen: number[];
  private readonly cumLen: number[];
  readonly totalLength: number;

  constructor(def: TrackDef) {
    this.name = def.name;
    this.halfWidth = def.halfWidth;
    this.laps = def.laps;
    this.jumpZone = def.jumpZone;
    this.bridgeZone = def.bridgeZone;
    this.archBridgeZone = def.archBridgeZone;
    this.upperDeckZone = def.upperDeckZone;
    this.points = buildClosedPath(def.control, def.samplesPerSegment ?? 24);

    const n = this.points.length;
    this.segLen = new Array(n);
    this.cumLen = new Array(n);
    let acc = 0;
    for (let i = 0; i < n; i++) {
      const a = this.points[i];
      const b = this.points[(i + 1) % n];
      this.cumLen[i] = acc;
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      this.segLen[i] = len;
      acc += len;
    }
    this.totalLength = acc;
  }

  /** Closest point on the centreline to (x,z), with progress around the loop. */
  nearest(x: number, z: number): PathQuery {
    const pts = this.points;
    const n = pts.length;
    let best: PathQuery = { segment: 0, t: 0, distance: Infinity, progress: 0, px: 0, pz: 0 };
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len2 = dx * dx + dz * dz;
      let t = len2 > 0 ? ((x - a.x) * dx + (z - a.z) * dz) / len2 : 0;
      t = Math.max(0, Math.min(1, t));
      const px = a.x + dx * t;
      const pz = a.z + dz * t;
      const dist = Math.hypot(x - px, z - pz);
      if (dist < best.distance) {
        const along = this.cumLen[i] + t * this.segLen[i];
        best = { segment: i, t, distance: dist, progress: along / this.totalLength, px, pz };
      }
    }
    return best;
  }

  isOnTrack(x: number, z: number): boolean {
    return this.nearest(x, z).distance < this.halfWidth;
  }

  /** World point at a normalized progress (0..1) around the loop (arc-length based). */
  pointAtProgress(progress: number): Vec2 {
    const p = ((progress % 1) + 1) % 1;
    const targetArc = p * this.totalLength;
    const n = this.points.length;
    let i = 0;
    while (i < n - 1 && this.cumLen[i + 1] <= targetArc) i++;
    const t = this.segLen[i] > 0 ? (targetArc - this.cumLen[i]) / this.segLen[i] : 0;
    const a = this.points[i];
    const b = this.points[(i + 1) % n];
    return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
  }

  /** Start pose: at the first sample, facing along the path. heading 0 = +z. */
  startPose(): { x: number; z: number; heading: number } {
    const a = this.points[0];
    const b = this.points[1 % this.points.length];
    return { x: a.x, z: a.z, heading: Math.atan2(b.x - a.x, b.z - a.z) };
  }
}
