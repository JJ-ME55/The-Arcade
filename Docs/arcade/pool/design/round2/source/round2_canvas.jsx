// Round2Match.jsx — PoolTable + desktop match (DesktopMatch) + mobile match
// (GameplayA/B). One module so PoolTable is defined ONCE (loading two merged
// match files would redeclare PoolTable's top-level consts). Used by Round 2.

// ===================== LOCKED POOL TABLE =====================
// PoolTable.jsx — iteration 6 (pure SVG chrome).
//
// Drops the table_base.png and renders the entire table chrome in inline SVG
// at 1500×825 world coords (engine-native). This gives precise control over:
//   • cherry-wood rail w/ vertical gradient + light highlight on outer edge
//   • felt rectangle with chamfered corners (= corner wood shelves)
//   • cobalt felt with overhead lamp glow
//   • 6 cushion bumpers (chamfered ends, flush with felt — no float shadow)
//   • 6 dark pocket holes with inset rim
//   • ivory diamond markers on all four rails
//   • head-string line + foot spot
//
// Balls / cue / aim line stay as positioned HTML divs (unchanged) so the
// existing animation hooks keep working.

const TABLE_W = 1500, TABLE_H = 825;

// === Geometry =============================================================
// Real-table-ratio derived (ball = 38 in this 1500×825 world):
//   POCKET_R = 42 → pocket diameter 84 ≈ 2.2× ball (regulation 4.5–5")
//   Felt extends behind the cushions (inset = FELT_INSET, NOT RAIL) so the
//   pathway between cushion-tip and pocket edge reads as continuous felt,
//   not wood. Wood is the outer ring only.
//
//   FELT_INSET (=48) = visible wood thickness AND cushion outer edge Y
//   CUSHION_T  (=30) = cushion bumper thickness (visible felt-wrapped strip)
//   CUSHION_INNER (=78) = play-surface boundary (cushion's inner edge)
const FELT_INSET    = 48;
const CUSHION_T     = 30;
const CUSHION_INNER = FELT_INSET + CUSHION_T;   // 78
const POCKET_R      = 42;
const CHAMFER       = 30;   // 45° mitered cushion-end cut (= CUSHION_T)

// Side-pocket centre moved toward the play area so its felt entry opens into
// the playfield (was 32 — entirely inside the wood with no felt pathway).
const SIDE_POCKET_Y_TOP = 56;
const SIDE_POCKET_Y_BOT = TABLE_H - 56;

// Pocket centres — corners stay aligned with engine config; sides moved.
const POCKETS = [
  { x: 62,            y: 62,                kind: "corner" },
  { x: TABLE_W - 62,  y: 62,                kind: "corner" },
  { x: 62,            y: TABLE_H - 62,      kind: "corner" },
  { x: TABLE_W - 62,  y: TABLE_H - 62,      kind: "corner" },
  { x: TABLE_W / 2,   y: SIDE_POCKET_Y_TOP, kind: "side"   },
  { x: TABLE_W / 2,   y: SIDE_POCKET_Y_BOT, kind: "side"   },
];

// % positioning helpers
const tx = (x) => (x / TABLE_W) * 100 + "%";
const ty = (y) => (y / TABLE_H) * 100 + "%";

// === Felt polygon =========================================================
// Clean rectangle inset by FELT_INSET. No corner chamfers — the felt extends
// all the way to the wood, so the cushion-tip-to-pocket gap reads as felt
// (a clear pathway into the pocket), not wood.
function feltPolygonPoints() {
  const I = FELT_INSET;
  const W = TABLE_W - FELT_INSET, H = TABLE_H - FELT_INSET;
  return `${I},${I} ${W},${I} ${W},${H} ${I},${H}`;
}

// === Cushion bumpers ======================================================
// Cushion outer endpoints land EXACTLY at the pocket edge (where the pocket
// circle crosses the outer cushion line). Inner endpoints are mitered 45°
// toward the middle of the cushion (CHAMFER=30), so the bumper tips form V's
// that point toward each pocket. The wood between cushion and pocket is
// covered by felt (extends behind cushion) + the pocket dark circle on top.
//
// Rendering: each cushion is a 4-vertex polygon, but drawn via roundedPolyPath
// so all corners get a small radius — this softens the chamfered tips into
// "felt-wrap bullnoses" rather than sharp geometric points. A dark outline
// stroke suggests the wrap-fold seam.

// roundedPolyPath: convert a list of [x,y] vertices into an SVG path string
// with each corner rounded to radius r. Vertices in clockwise order.
function roundedPolyPath(verts, r) {
  const n = verts.length;
  let d = "";
  for (let i = 0; i < n; i++) {
    const prev = verts[(i - 1 + n) % n];
    const curr = verts[i];
    const next = verts[(i + 1) % n];
    const inDx = prev[0] - curr[0], inDy = prev[1] - curr[1];
    const inLen = Math.hypot(inDx, inDy);
    const inX = inDx / inLen, inY = inDy / inLen;
    const outDx = next[0] - curr[0], outDy = next[1] - curr[1];
    const outLen = Math.hypot(outDx, outDy);
    const outX = outDx / outLen, outY = outDy / outLen;
    const rUse = Math.min(r, inLen / 2, outLen / 2);
    const aS = [curr[0] + inX * rUse, curr[1] + inY * rUse];
    const aE = [curr[0] + outX * rUse, curr[1] + outY * rUse];
    if (i === 0) d += `M ${aS[0].toFixed(2)},${aS[1].toFixed(2)} `;
    else        d += `L ${aS[0].toFixed(2)},${aS[1].toFixed(2)} `;
    d += `A ${rUse.toFixed(2)},${rUse.toFixed(2)} 0 0 1 ${aE[0].toFixed(2)},${aE[1].toFixed(2)} `;
  }
  return d + "Z";
}

// pocketEdge(pocketCenter, atCoord, sign) — returns the coord-axis position
// where the pocket circle crosses a perpendicular line at `atCoord`.
function pocketEdge(pCenter, atCoord, sign) {
  const d = atCoord - pCenter;
  const r2 = POCKET_R * POCKET_R - d * d;
  return Math.sqrt(Math.max(0, r2)) * sign;
}

function buildCushions() {
  const I = FELT_INSET;
  const J = CUSHION_INNER;
  const I_bot = TABLE_H - I;
  const J_bot = TABLE_H - J;
  const I_right = TABLE_W - I;
  const J_right = TABLE_W - J;
  const C = CHAMFER;
  const cush = [];

  // TOP CUSHIONS (left half + right half, split by top side pocket)
  for (const half of [
    { L: POCKETS[0], R: POCKETS[4] },
    { L: POCKETS[4], R: POCKETS[1] },
  ]) {
    const xL = half.L.x + Math.sqrt(Math.max(0, POCKET_R*POCKET_R - (I - half.L.y)**2));
    const xR = half.R.x - Math.sqrt(Math.max(0, POCKET_R*POCKET_R - (I - half.R.y)**2));
    cush.push({
      side: "top",
      poly: [
        [xL,     I],
        [xR,     I],
        [xR - C, J],
        [xL + C, J],
      ],
    });
  }

  // BOTTOM CUSHIONS (mirror)
  for (const half of [
    { L: POCKETS[2], R: POCKETS[5] },
    { L: POCKETS[5], R: POCKETS[3] },
  ]) {
    const xL = half.L.x + Math.sqrt(Math.max(0, POCKET_R*POCKET_R - (I_bot - half.L.y)**2));
    const xR = half.R.x - Math.sqrt(Math.max(0, POCKET_R*POCKET_R - (I_bot - half.R.y)**2));
    cush.push({
      side: "bottom",
      poly: [
        [xL + C, J_bot],
        [xR - C, J_bot],
        [xR,     I_bot],
        [xL,     I_bot],
      ],
    });
  }

  // LEFT CUSHION (single, between TL and BL corners)
  {
    const yT = 62          + Math.sqrt(Math.max(0, POCKET_R*POCKET_R - (I - 62)**2));
    const yB = TABLE_H - 62 - Math.sqrt(Math.max(0, POCKET_R*POCKET_R - (I - 62)**2));
    cush.push({
      side: "left",
      poly: [
        [I, yT],
        [J, yT + C],
        [J, yB - C],
        [I, yB],
      ],
    });
  }

  // RIGHT CUSHION
  {
    const yT = 62          + Math.sqrt(Math.max(0, POCKET_R*POCKET_R - (I_right - (TABLE_W-62))**2));
    const yB = TABLE_H - 62 - Math.sqrt(Math.max(0, POCKET_R*POCKET_R - (I_right - (TABLE_W-62))**2));
    cush.push({
      side: "right",
      poly: [
        [J_right, yT + C],
        [I_right, yT],
        [I_right, yB],
        [J_right, yB - C],
      ],
    });
  }

  return cush;
}
const CUSHIONS = buildCushions();

// === Diamond markers ======================================================
// 6 per long rail (3 between each pocket pair), 3 per short rail.
// Centered in the visible wood (y=24 for top rail, x=24 for left, since
// wood spans 0..FELT_INSET=48).
const DIAMOND_SIZE = 14;
function buildDiamonds() {
  const d = [];
  // Top long rail — y centered in upper wood (between y=0 and y=RAIL-CUSHION_T=48)
  const topY = 24;
  const botY = TABLE_H - 24;
  // Left section: 3 diamonds between TL pocket (x=62) and TM side pocket (x=750)
  // Evenly spaced as quarter-points: skip pocket-adjacent, 3 marks
  const ls = [62, 750];
  const ldXs = [
    ls[0] + (ls[1] - ls[0]) * 0.25,
    ls[0] + (ls[1] - ls[0]) * 0.50,
    ls[0] + (ls[1] - ls[0]) * 0.75,
  ];
  const rs = [750, TABLE_W - 62];
  const rdXs = [
    rs[0] + (rs[1] - rs[0]) * 0.25,
    rs[0] + (rs[1] - rs[0]) * 0.50,
    rs[0] + (rs[1] - rs[0]) * 0.75,
  ];
  for (const x of [...ldXs, ...rdXs]) {
    d.push({ x, y: topY });
    d.push({ x, y: botY });
  }
  // Short rails (left, right) — 3 diamonds between TL and BL pockets
  const leftX = 24, rightX = TABLE_W - 24;
  const ss = [62, TABLE_H - 62];
  const sdYs = [
    ss[0] + (ss[1] - ss[0]) * 0.25,
    ss[0] + (ss[1] - ss[0]) * 0.50,
    ss[0] + (ss[1] - ss[0]) * 0.75,
  ];
  for (const y of sdYs) {
    d.push({ x: leftX, y });
    d.push({ x: rightX, y });
  }
  return d;
}
const DIAMONDS = buildDiamonds();

// ==========================================================================
// Table chrome — single SVG with all the fixed geometry baked in.
// ==========================================================================
function TableChrome() {
  return (
    <svg
      className="table-chrome"
      viewBox={`0 0 ${TABLE_W} ${TABLE_H}`}
      preserveAspectRatio="none"
      style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        display: "block", pointerEvents: "none", zIndex: 0,
      }}
    >
      <defs>
        {/* ============ CHERRY WOOD GRADIENTS ============ */}
        {/* Warm cherry-stained wood. Brightest catch-light at outer edge, mid
           deep mahogany, darkest toward the felt seam (in the cushion's shadow). */}
        <linearGradient id="woodTop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#B85540"/>
          <stop offset="10%"  stopColor="#963126"/>
          <stop offset="55%"  stopColor="#6B1F18"/>
          <stop offset="100%" stopColor="#2E0B07"/>
        </linearGradient>
        <linearGradient id="woodBottom" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%"   stopColor="#B85540"/>
          <stop offset="10%"  stopColor="#963126"/>
          <stop offset="55%"  stopColor="#6B1F18"/>
          <stop offset="100%" stopColor="#2E0B07"/>
        </linearGradient>
        <linearGradient id="woodLeft" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#B85540"/>
          <stop offset="10%"  stopColor="#963126"/>
          <stop offset="55%"  stopColor="#6B1F18"/>
          <stop offset="100%" stopColor="#2E0B07"/>
        </linearGradient>
        <linearGradient id="woodRight" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%"   stopColor="#B85540"/>
          <stop offset="10%"  stopColor="#963126"/>
          <stop offset="55%"  stopColor="#6B1F18"/>
          <stop offset="100%" stopColor="#2E0B07"/>
        </linearGradient>
        {/* Wood grain (subtle vertical noise streaks) */}
        <pattern id="woodGrain" x="0" y="0" width="24" height="200" patternUnits="userSpaceOnUse">
          <rect width="24" height="200" fill="transparent"/>
          <line x1="3"  y1="0" x2="3"  y2="200" stroke="rgba(0,0,0,0.07)"  strokeWidth="0.6"/>
          <line x1="9"  y1="0" x2="9"  y2="200" stroke="rgba(255,255,255,0.04)" strokeWidth="0.4"/>
          <line x1="15" y1="0" x2="15" y2="200" stroke="rgba(0,0,0,0.08)"  strokeWidth="0.5"/>
          <line x1="20" y1="0" x2="20" y2="200" stroke="rgba(255,255,255,0.03)" strokeWidth="0.3"/>
        </pattern>

        {/* ============ FELT GRADIENTS ============ */}
        <radialGradient id="feltBase" cx="50%" cy="40%" r="65%">
          <stop offset="0%"   stopColor="#2C7AC7"/>
          <stop offset="55%"  stopColor="#1E5FA8"/>
          <stop offset="100%" stopColor="#103E72"/>
        </radialGradient>
        {/* Lamp glow — warm hotspot from overhead, additive */}
        <radialGradient id="feltLamp" cx="50%" cy="38%" r="55%">
          <stop offset="0%"   stopColor="#FFE6B0" stopOpacity="0.18"/>
          <stop offset="45%"  stopColor="#FFE6B0" stopOpacity="0.04"/>
          <stop offset="100%" stopColor="#FFE6B0" stopOpacity="0"/>
        </radialGradient>

        {/* ============ CUSHION BUMPER GRADIENTS ============ */}
        {/* Felt-wrapped raised cushion. Subtle bevel: slightly darker at the
           wood seam (where the cushion sits on the wood), brighter mid, then
           DARKEST at the felt seam (shadow cast into the play area). The mid
           tone stays close to the felt color so it reads as one material. */}
        <linearGradient id="cushTop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#143E72"/>
          <stop offset="35%"  stopColor="#1E5FA8"/>
          <stop offset="68%"  stopColor="#2470BD"/>
          <stop offset="100%" stopColor="#08213F"/>
        </linearGradient>
        <linearGradient id="cushBottom" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%"   stopColor="#143E72"/>
          <stop offset="35%"  stopColor="#1E5FA8"/>
          <stop offset="68%"  stopColor="#2470BD"/>
          <stop offset="100%" stopColor="#08213F"/>
        </linearGradient>
        <linearGradient id="cushLeft" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#143E72"/>
          <stop offset="35%"  stopColor="#1E5FA8"/>
          <stop offset="68%"  stopColor="#2470BD"/>
          <stop offset="100%" stopColor="#08213F"/>
        </linearGradient>
        <linearGradient id="cushRight" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%"   stopColor="#143E72"/>
          <stop offset="35%"  stopColor="#1E5FA8"/>
          <stop offset="68%"  stopColor="#2470BD"/>
          <stop offset="100%" stopColor="#08213F"/>
        </linearGradient>

        {/* ============ POCKET HOLE ============ */}
        {/* Dark cylinder w/ subtle inner-rim shadow → looks like a hole, not a button */}
        <radialGradient id="pocketHole" cx="50%" cy="42%" r="50%">
          <stop offset="0%"   stopColor="#1a1a1d"/>
          <stop offset="55%"  stopColor="#08080a"/>
          <stop offset="100%" stopColor="#000000"/>
        </radialGradient>
        {/* Outer rim — a slightly darker collar around the pocket */}
        <radialGradient id="pocketRim" cx="50%" cy="50%" r="50%">
          <stop offset="80%"  stopColor="rgba(0,0,0,0)" />
          <stop offset="92%"  stopColor="rgba(0,0,0,0.55)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>

        {/* ============ FELT EDGE INNER SHADOW ============ */}
        <filter id="feltInnerShadow" x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
          <feOffset dx="0" dy="2"/>
          <feComposite in2="SourceGraphic" operator="arithmetic" k2="-1" k3="1"/>
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0"/>
          <feComposite in2="SourceGraphic" operator="in"/>
        </filter>
      </defs>

      {/* ============ LAYER 1: WOOD FRAME (mitered picture-frame) ============ */}
      {/* Mitered trapezoids — clean 45° corner joins, NO dark cross-seam where
          rails meet. Each rail keeps its directional gradient into the felt. */}
      <polygon points={`0,0 ${TABLE_W},0 ${TABLE_W-FELT_INSET},${FELT_INSET} ${FELT_INSET},${FELT_INSET}`} fill="url(#woodTop)"/>
      <polygon points={`0,${TABLE_H} ${TABLE_W},${TABLE_H} ${TABLE_W-FELT_INSET},${TABLE_H-FELT_INSET} ${FELT_INSET},${TABLE_H-FELT_INSET}`} fill="url(#woodBottom)"/>
      <polygon points={`0,0 ${FELT_INSET},${FELT_INSET} ${FELT_INSET},${TABLE_H-FELT_INSET} 0,${TABLE_H}`} fill="url(#woodLeft)"/>
      <polygon points={`${TABLE_W},0 ${TABLE_W-FELT_INSET},${FELT_INSET} ${TABLE_W-FELT_INSET},${TABLE_H-FELT_INSET} ${TABLE_W},${TABLE_H}`} fill="url(#woodRight)"/>
      {/* Grain overlay per rail (matching trapezoids, no per-strip seam) */}
      <polygon points={`0,0 ${TABLE_W},0 ${TABLE_W-FELT_INSET},${FELT_INSET} ${FELT_INSET},${FELT_INSET}`} fill="url(#woodGrain)" opacity="0.5"/>
      <polygon points={`0,${TABLE_H} ${TABLE_W},${TABLE_H} ${TABLE_W-FELT_INSET},${TABLE_H-FELT_INSET} ${FELT_INSET},${TABLE_H-FELT_INSET}`} fill="url(#woodGrain)" opacity="0.5"/>
      <polygon points={`0,0 ${FELT_INSET},${FELT_INSET} ${FELT_INSET},${TABLE_H-FELT_INSET} 0,${TABLE_H}`} fill="url(#woodGrain)" opacity="0.5"/>
      <polygon points={`${TABLE_W},0 ${TABLE_W-FELT_INSET},${FELT_INSET} ${TABLE_W-FELT_INSET},${TABLE_H-FELT_INSET} ${TABLE_W},${TABLE_H}`} fill="url(#woodGrain)" opacity="0.5"/>

      {/* Outer bright top-edge highlight on each rail (catches the room light) */}
      <rect x="0"           y="0"             width={TABLE_W}    height="2"           fill="rgba(255,200,170,0.55)"/>
      <rect x="0"           y={TABLE_H-2}     width={TABLE_W}    height="2"           fill="rgba(0,0,0,0.7)"/>
      <rect x="0"           y="0"             width="2"          height={TABLE_H}     fill="rgba(255,200,170,0.45)"/>
      <rect x={TABLE_W-2}   y="0"             width="2"          height={TABLE_H}     fill="rgba(0,0,0,0.6)"/>

      {/* ============ LAYER 2: FELT (chamfered-corner polygon) ============ */}
      <polygon points={feltPolygonPoints()} fill="url(#feltBase)"/>
      {/* Lamp glow on top of felt */}
      <polygon points={feltPolygonPoints()} fill="url(#feltLamp)"/>
      {/* Felt-edge inner darkening — thin dark stroke just inside the felt boundary */}
      <polygon points={feltPolygonPoints()} fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth="2.5"/>
      <polygon points={feltPolygonPoints()} fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="6" strokeLinejoin="round" style={{ mixBlendMode: "multiply" }}/>

      {/* Head string line + foot spot (faint, on felt) */}
      <line x1="375" y1={CUSHION_INNER + 6} x2="375" y2={TABLE_H - CUSHION_INNER - 6} stroke="rgba(0,0,0,0.28)" strokeWidth="1.5"/>
      <circle cx="375"  cy="412" r="3" fill="rgba(244,236,219,0.55)"/>
      <circle cx="1125" cy="412" r="3" fill="rgba(244,236,219,0.55)"/>

      {/* ============ LAYER 3: CUSHION BUMPERS ============ */}
      {CUSHIONS.map((c, i) => {
        const fill = c.side === "top"    ? "url(#cushTop)"
                   : c.side === "bottom" ? "url(#cushBottom)"
                   : c.side === "left"   ? "url(#cushLeft)"
                   :                       "url(#cushRight)";
        const d = roundedPolyPath(c.poly, 7);
        return (
          <g key={"cush-" + i}>
            {/* Rounded cushion body with a subtle wrap-fold seam around the
                outline (the felt fabric wrapping the rubber inside) */}
            <path d={d} fill={fill}
                  stroke="rgba(0,0,0,0.32)" strokeWidth="0.9"
                  strokeLinejoin="round"/>
            {/* Inner felt-seam darkening line (still distinct from outline) */}
            {renderCushionShadow(c)}
            {/* Outer wood-seam highlight */}
            {renderCushionHighlight(c)}
            {/* Tiny "bullnose" highlight at each chamfer tip — catches light
                on the rounded felt-wrap. Two highlights per cushion (one at
                each pocket-facing tip). */}
            {renderCushionBullnoses(c)}
          </g>
        );
      })}

      {/* ============ LAYER 4: POCKETS (dark holes punched through) ============ */}
      {POCKETS.map((p, i) => {
        const r = POCKET_R;
        return (
          <g key={"pocket-" + i}>
            {/* Outer rim shadow */}
            <circle cx={p.x} cy={p.y} r={r + 6} fill="url(#pocketRim)"/>
            {/* Dark hole */}
            <circle cx={p.x} cy={p.y} r={r} fill="url(#pocketHole)"/>
            {/* Subtle bottom-rim highlight — light catches the far inside lip */}
            <circle cx={p.x} cy={p.y + 2} r={r - 3}
                     fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
            {/* Deep top-arc inner shadow — sells the pocket as a hole */}
            <circle cx={p.x} cy={p.y - 3} r={r - 4}
                     fill="none" stroke="rgba(0,0,0,0.85)" strokeWidth="5"
                     strokeDasharray={`${r * 1.8} ${r * 5}`}
                     strokeDashoffset={r * 1.5}/>
          </g>
        );
      })}

      {/* ============ LAYER 5: DIAMOND RAIL MARKERS ============ */}
      {DIAMONDS.map((d, i) => (
        <g key={"d-" + i} transform={`translate(${d.x},${d.y}) rotate(45)`}>
          <rect x={-DIAMOND_SIZE/2} y={-DIAMOND_SIZE/2}
                width={DIAMOND_SIZE} height={DIAMOND_SIZE}
                fill="#F4ECDB"/>
          <rect x={-DIAMOND_SIZE/2} y={-DIAMOND_SIZE/2}
                width={DIAMOND_SIZE} height={DIAMOND_SIZE/2}
                fill="rgba(255,255,255,0.45)"/>
          <rect x={-DIAMOND_SIZE/2} y="0"
                width={DIAMOND_SIZE} height={DIAMOND_SIZE/2}
                fill="rgba(0,0,0,0.12)"/>
        </g>
      ))}
    </svg>
  );
}

// Cushion seam helpers — small directional decorations on each bumper
function renderCushionShadow(c) {
  // Find the two innermost (felt-side) points of the polygon and draw a dark line between them
  const idx = innerEdgeIndices(c);
  if (!idx) return null;
  const [a, b] = idx;
  const p0 = c.poly[a], p1 = c.poly[b];
  return (
    <line x1={p0[0]} y1={p0[1]} x2={p1[0]} y2={p1[1]}
          stroke="rgba(0,0,0,0.65)" strokeWidth="1.6"/>
  );
}
function renderCushionHighlight(c) {
  const idx = outerEdgeIndices(c);
  if (!idx) return null;
  const [a, b] = idx;
  const p0 = c.poly[a], p1 = c.poly[b];
  return (
    <line x1={p0[0]} y1={p0[1]} x2={p1[0]} y2={p1[1]}
          stroke="rgba(140,190,235,0.32)" strokeWidth="1.2"/>
  );
}
// Bullnose highlights — small bright dots near each cushion's chamfered tip,
// catching light on the felt-wrap's rounded fold. Two per cushion.
function renderCushionBullnoses(c) {
  // The "tip" of each chamfered end is at the OUTER endpoint of the chamfer
  // (closest to the pocket). For top cushion polygon (poly[0..3] clockwise),
  // those are poly[0] (left tip) and poly[1] (right tip). For bottom, the
  // outer edge is poly[2..3]. For left/right, the outer corners are different.
  const tips = bullnoseTipIndices(c);
  if (!tips) return null;
  return tips.map((idx, i) => {
    const p = c.poly[idx];
    // Nudge the highlight slightly INWARD (toward the cushion middle) so it
    // sits ON the rounded bullnose, not at the geometric corner.
    const center = cushionCenter(c);
    const dx = center[0] - p[0], dy = center[1] - p[1];
    const len = Math.hypot(dx, dy);
    const nx = p[0] + (dx / len) * 5;
    const ny = p[1] + (dy / len) * 5;
    return (
      <circle key={"bn-" + i} cx={nx} cy={ny} r="2.4"
              fill="rgba(255,255,255,0.5)"/>
    );
  });
}
function cushionCenter(c) {
  const xs = c.poly.map(p => p[0]);
  const ys = c.poly.map(p => p[1]);
  return [
    (Math.min(...xs) + Math.max(...xs)) / 2,
    (Math.min(...ys) + Math.max(...ys)) / 2,
  ];
}
function bullnoseTipIndices(c) {
  // Outer-edge corners of the cushion — the chamfer tips facing each pocket
  if (c.side === "top")    return [0, 1];   // (xL, I) and (xR, I)
  if (c.side === "bottom") return [3, 2];   // bottom-side outer corners
  if (c.side === "left")   return [0, 3];   // left outer corners (top + bottom)
  if (c.side === "right")  return [1, 2];   // right outer corners
  return null;
}
function innerEdgeIndices(c) {
  // Inner edge endpoints in poly[] order (the felt-side line)
  if (c.side === "top")    return [3, 2];   // (xL+CHAMFER, innerY) → (xR-CHAMFER, innerY)
  if (c.side === "bottom") return [0, 1];
  if (c.side === "left")   return [1, 2];
  if (c.side === "right")  return [0, 3];
  return null;
}
function outerEdgeIndices(c) {
  if (c.side === "top")    return [0, 1];
  if (c.side === "bottom") return [3, 2];
  if (c.side === "left")   return [0, 3];
  if (c.side === "right")  return [1, 2];
  return null;
}

// === Rack data (positions from game.config.ts) ============================
const AMERICAN_RACK = [
  { n: 1,  x: 1022, y: 413 },
  { n: 14, x: 1056, y: 393 }, { n: 2,  x: 1056, y: 433 },
  { n: 9,  x: 1090, y: 374 }, { n: 8,  x: 1090, y: 413 }, { n: 10, x: 1090, y: 452 },
  { n: 7,  x: 1126, y: 354 }, { n: 11, x: 1126, y: 393 }, { n: 3,  x: 1126, y: 433 }, { n: 12, x: 1126, y: 472 },
  { n: 4,  x: 1162, y: 335 }, { n: 13, x: 1162, y: 374 }, { n: 5,  x: 1162, y: 413 }, { n: 15, x: 1162, y: 452 }, { n: 6,  x: 1162, y: 491 },
];
const UK_RACK = [
  { c: "red",    x: 1056, y: 433 },
  { c: "yellow", x: 1090, y: 374 }, { c: "yellow", x: 1126, y: 393 }, { c: "red", x: 1126, y: 472 },
  { c: "yellow", x: 1162, y: 335 }, { c: "red",    x: 1162, y: 374 }, { c: "red", x: 1162, y: 452 },
  { c: "yellow", x: 1022, y: 413 }, { c: "red",    x: 1056, y: 393 }, { c: "yellow", x: 1090, y: 452 },
  { c: "red",    x: 1126, y: 354 }, { c: "yellow", x: 1126, y: 433 }, { c: "yellow", x: 1162, y: 413 }, { c: "red", x: 1162, y: 491 },
];
const BALL_COLORS = {
  1: "var(--ball-1)", 2: "var(--ball-2)", 3: "var(--ball-3)", 4: "var(--ball-4)",
  5: "var(--ball-5)", 6: "var(--ball-6)", 7: "var(--ball-7)",
};

// Engine ball diameter is 38px in 1500×825 space
const BALL_PCT_W = 38 / TABLE_W * 100;

function ballStyleProps(x, y) {
  return {
    left: tx(x), top: ty(y),
    width: BALL_PCT_W + "%", height: 0,
    paddingTop: BALL_PCT_W + "%",
  };
}

function NumberedBall({ x, y, n }) {
  const isStripe = n >= 9;
  const baseN = isStripe ? n - 8 : n;
  const color = BALL_COLORS[baseN];
  return (
    <div className="ball-pos ball-numbered" style={ballStyleProps(x, y)}>
      <div className="ball-vis" style={{
        background: isStripe
          ? `linear-gradient(180deg, #fbfaf5 0%, #fbfaf5 22%, ${color} 22%, ${color} 78%, #fbfaf5 78%, #fbfaf5 100%)`
          : color,
      }}>
        <div className="ball-numdot">{n}</div>
      </div>
    </div>
  );
}

function PlainBall({ x, y, kind }) {
  return (
    <div className={`ball-pos ball-${kind}`} style={ballStyleProps(x, y)}>
      <div className="ball-vis"></div>
    </div>
  );
}

// === Cue Stick (unchanged) ================================================
function CueStick({ cueX, cueY, angleDeg = 0, pullback = 0 }) {
  const lenPct  = (720 + pullback * 4)  / TABLE_W * 100;
  const gapPct  = (22  + pullback * 1.5) / TABLE_W * 100;
  const heightPct = 16 / TABLE_H * 100;
  const cueXPct = cueX / TABLE_W * 100;
  const cueYPct = cueY / TABLE_H * 100;
  const pivotXPct = ((lenPct + gapPct) / lenPct) * 100;

  return (
    <div style={{
      position: "absolute",
      left:   `${cueXPct - gapPct - lenPct}%`,
      top:    `${cueYPct - heightPct / 2}%`,
      width:  `${lenPct}%`,
      height: `${heightPct}%`,
      transformOrigin: `${pivotXPct}% 50%`,
      transform: `rotate(${angleDeg}deg)`,
      zIndex: 30,
      pointerEvents: "none",
      filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.65))",
    }}>
      <svg viewBox="0 0 720 16" preserveAspectRatio="none" width="100%" height="100%">
        <defs>
          <linearGradient id="cs-shaft" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff5d8" stopOpacity="0.6"/>
            <stop offset="0.45" stopColor="#ecd49a"/>
            <stop offset="1" stopColor="#9a6a32"/>
          </linearGradient>
          <linearGradient id="cs-fore" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.25"/>
            <stop offset="0.55" stopColor="#3a1f10"/>
            <stop offset="1" stopColor="#0a0506"/>
          </linearGradient>
          <linearGradient id="cs-wrap" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.15"/>
            <stop offset="0.5" stopColor="#1a0d06"/>
            <stop offset="1" stopColor="#000"/>
          </linearGradient>
        </defs>
        <rect x="0" y="3.8" width="14" height="8.4" fill="#d9b14a"/>
        <rect x="0" y="3.8" width="14" height="1" fill="#fff" opacity="0.5"/>
        <polygon points="12,4.0 80,3.8 80,12.2 12,12.0" fill="url(#cs-fore)"/>
        <rect x="80" y="3.8" width="180" height="8.4" fill="url(#cs-wrap)"/>
        <rect x="80" y="3.8" width="180" height="8.4" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="0.4"/>
        <polygon points="260,4.0 334,4.0 334,12.0 260,12.0" fill="url(#cs-fore)"/>
        <rect x="334" y="3.6" width="8" height="8.8" fill="#d9b14a"/>
        <rect x="334" y="3.6" width="8" height="1" fill="#fff" opacity="0.5"/>
        <polygon points="342,5.8 688,4.5 688,11.5 342,10.2" fill="url(#cs-shaft)"/>
        <rect x="688" y="5.6" width="20" height="4.8" fill="#f4ecd2"/>
        <rect x="688" y="5.6" width="20" height="0.8" fill="#fff" opacity="0.5"/>
        <ellipse cx="714" cy="8" rx="6" ry="2.2" fill="#3a5fb0"/>
      </svg>
    </div>
  );
}

function AimLine({ cueX, cueY, angleDeg = 0, lengthWorld = 720 }) {
  return (
    <div style={{
      position: "absolute",
      left: tx(cueX), top: ty(cueY),
      width: (lengthWorld / TABLE_W * 100) + "%", height: 0,
      borderTop: "2px dashed rgba(255,255,255,0.6)",
      transform: `rotate(${angleDeg}deg)`,
      transformOrigin: "0 50%",
      pointerEvents: "none",
      zIndex: 20,
    }}>
      {/* Ghost-ball target at the end of the aim line */}
      <div style={{
        position: "absolute", right: -12, top: -13,
        width: 26, height: 26, borderRadius: "50%",
        border: "2px dashed rgba(255,255,255,0.85)",
        background: "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.18), transparent 60%)",
        boxSizing: "border-box",
      }}/>
    </div>
  );
}

// === PoolTable ============================================================
function PoolTable({
  ballStyle = "american",
  cueAt = { x: 413, y: 413 },
  showStick = true,
  pullback = 0,
  showAim = true,
  showRack = true,
  stampLabel = null,
  stampKind = null,
}) {
  return (
    <div className="table">
      {/* All chrome (wood, felt, cushions, pockets, diamonds) drawn in one SVG */}
      <TableChrome/>

      {/* Balls, cue, aim (positioned HTML overlays in % coords) */}
      <PlainBall x={cueAt.x} y={cueAt.y} kind="cue"/>

      {showRack && ballStyle === "american" && (
        <React.Fragment>
          {AMERICAN_RACK.filter(b => b.n !== 8).map(b => (
            <NumberedBall key={"a"+b.n} x={b.x} y={b.y} n={b.n}/>
          ))}
          <PlainBall x={1090} y={413} kind="eight"/>
        </React.Fragment>
      )}
      {showRack && ballStyle === "uk" && (
        <React.Fragment>
          <PlainBall x={1090} y={413} kind="eight"/>
          {UK_RACK.map((b, i) => (
            <PlainBall key={"u"+i} x={b.x} y={b.y} kind={b.c}/>
          ))}
        </React.Fragment>
      )}

      {showAim && <AimLine cueX={cueAt.x} cueY={cueAt.y} angleDeg={0} lengthWorld={760}/>}

      {showStick && <CueStick cueX={cueAt.x} cueY={cueAt.y} angleDeg={0} pullback={pullback}/>}

      {stampLabel && (
        <div className="stamp-floating" key={stampLabel + Math.random()}>
          <span className={"stamp " + (stampKind || "")}>{stampLabel}</span>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { PoolTable, TABLE_W, TABLE_H });


// ===================== DESKTOP MATCH =====================
// SidePocketGameUI.jsx — desktop (web) match view. Three-row design-system
// layout in the Side Pocket brand: brass HUD (both players) · centred cobalt
// PoolTable · action shelf (power + Shoot). Reconciled with the mobile build:
// correct potted-ball colours, ball numbers scaled, small yellow power marker,
// no silly hint text. Renders PoolTable (merged into this file at build).

function SpgRack({ kind, potted = 0 }) {
  return (
    <span className="rack">
      {[1, 2, 3, 4, 5, 6, 7].map((b, i) => {
        const c = "var(--ball-" + b + ")";
        const bg = kind === "stripes" ? "linear-gradient(180deg,#fbfaf5 0 28%," + c + " 28% 72%,#fbfaf5 72%)" : c;
        return <i key={b} className={i < potted ? "" : "rem"} style={{ background: bg }}></i>;
      })}
    </span>
  );
}

function DesktopMatch({ turn = "you" }) {
  const you = turn === "you";
  return (
    <div className={"spg" + (you ? "" : " opp")}>
      <div className="spg-grain"></div>

      <header className="spg-bar">
        <div className={"spg-p" + (you ? " active" : " idle")}>
          <div className="avw"><div className="ring" style={{ "--deg": you ? "300deg" : "0deg" }}></div><div className="av" style={{ background: "radial-gradient(circle at 38% 30%, #2a6b4f, #143b2c 78%)" }}>J</div></div>
          <div className="col">
            <div className="nmrow"><span className="nm">jjk_55</span><span className="tier">Gold III</span></div>
            <SpgRack kind="solids" potted={3} />
          </div>
          <span className="sc">2</span>
        </div>

        <div className="spg-mid">
          <span className="room">The Velvet Room · Ranked · Best of 3</span>
          <div className="tm"><span className="ring2"></span><span className="t">0:42</span></div>
          <span className="turn">{you ? "Your Shot" : "Opponent's Turn"}</span>
        </div>

        <div className={"spg-p right" + (you ? " idle" : " active")}>
          <div className="avw"><div className="ring" style={{ "--deg": you ? "0deg" : "300deg" }}></div><div className="av" style={{ background: "radial-gradient(circle at 38% 30%, #7a3aa0, #2c1140 80%)" }}>V</div></div>
          <div className="col">
            <div className="nmrow"><span className="tier">Gold II</span><span className="nm">Velvet Q</span></div>
            <SpgRack kind="stripes" potted={2} />
          </div>
          <span className="sc">1</span>
        </div>
      </header>

      <main className="spg-stage">
        <div className="spg-board">
          <PoolTable ballStyle="american" cueAt={{ x: 413, y: 413 }} showRack showAim={you} showStick={you} pullback={you ? 28 : 0} />
        </div>
        <div className="spg-spin"><span className="dot"></span><span className="lab">Spin</span></div>
      </main>

      <footer className="spg-shelf">
        <div className="spg-tools"><button className="spg-tool">⚑</button><button className="spg-tool">≡</button></div>
        <div className="spg-power">
          <span className="lbl">POWER</span>
          <div className="barwrap">
            <span className="mark" style={{ left: "64%" }}></span>
            <div className="bar"><span className="fill" style={{ width: "calc(64% - 4px)" }}></span></div>
          </div>
          <span className="pct">64%</span>
        </div>
        {you
          ? <button className="spg-shoot">Shoot</button>
          : <button className="spg-shoot wait">Waiting…</button>}
      </footer>
    </div>
  );
}

Object.assign(window, { DesktopMatch, SpgRack });

// ===================== MOBILE GAMEPLAY =====================
// MobileGame.jsx — in-match gameplay (landscape). The board is the LOCKED
// cobalt PoolTable (PoolTable.jsx) — cherry rails, cobalt felt, SVG chrome —
// centred and contained at its true 1.818:1 ratio (scale, never stretch).
// Chrome around it: top HUD (both players + timer), cue-ball spin node, and a
// vertical power slider on the cue-hand rail. Mirrorable via .hand-l/.hand-r.

function GameTable() {
  return (
    <div className="gstage">
      <div className="gboard">
        <PoolTable ballStyle="american" cueAt={{ x: 413, y: 413 }} showRack showAim showStick pullback={26} />
      </div>
    </div>
  );
}

// Potted-ball tally in the balls' real resin colours (reconciled with HUD.jsx).
function Rack({ kind, potted = 0 }) {
  return (
    <span className="rack">
      {[1, 2, 3, 4, 5, 6, 7].map((b, i) => {
        const c = "var(--ball-" + b + ")";
        const bg = kind === "stripes" ? "linear-gradient(180deg,#fbfaf5 0 28%," + c + " 28% 72%,#fbfaf5 72%)" : c;
        return <i key={b} className={"pball" + (i < potted ? "" : " rem")} style={{ background: bg }}></i>;
      })}
    </span>
  );
}

function TopBar() {
  return (
    <div className="gbar">
      <div className="gp">
        <div className="avw"><div className="ring" style={{ "--deg": "300deg" }}></div><div className="av" style={{ background: "radial-gradient(circle at 38% 30%, #2a6b4f, #143b2c 78%)" }}>J</div></div>
        <div className="col"><span className="nm">jjk_55</span><Rack kind="solids" potted={3} /></div>
        <span className="sc">2</span>
      </div>
      <div className="mid">
        <span className="fr">Frame 4 · Best of 3</span>
        <span className="timer"><span className="dot"></span><span className="t">0:42</span></span>
      </div>
      <div className="gp right idle">
        <div className="avw"><div className="ring"></div><div className="av" style={{ background: "radial-gradient(circle at 38% 30%, #7a3aa0, #2c1140 80%)" }}>V</div></div>
        <div className="col"><span className="nm">Velvet Q</span><Rack kind="stripes" potted={2} /></div>
        <span className="sc">1</span>
      </div>
    </div>
  );
}

function SpinNode() {
  return <div className="gspin"><span className="dot"></span><span className="lab">Spin</span></div>;
}

function GameplayA({ hand = "r" }) {
  return (
    <div className={"gplay var-a hand-" + hand}>
      <TopBar />
      <GameTable />
      <SpinNode />
      <div className="gpower">
        <div className="gtrack"><span className="fill" style={{ height: "64%" }}></span><span className="gmark" style={{ bottom: "64%" }}></span></div>
        <span className="gpct">64%</span>
      </div>
      <div className="gutils"><button className="gutil">⚑</button><button className="gutil">≡</button></div>
    </div>
  );
}

function GameplayB({ hand = "l" }) {
  return (
    <div className={"gplay var-b hand-" + hand}>
      <TopBar />
      <GameTable />
      <SpinNode />
      <div className="gpower">
        <div className="gtrack"><span className="fill" style={{ height: "64%" }}></span><span className="gmark" style={{ bottom: "64%" }}></span></div>
        <button className="gshoot">Shoot</button>
      </div>
      <div className="gutils"><button className="gutil">⚑</button><button className="gutil">≡</button></div>
    </div>
  );
}

Object.assign(window, { GameTable, GameplayA, GameplayB });

// ===================== MARATHON =====================
// Round2Marathon.jsx — Marathon trick-shot lives mode. Reuses PoolTable, the
// .spg/.gboard table styling, the .spg-power/.gpower shelf, and the result
// language for run-end. 3 lives; complete setups for streak + Gold; bank to exit.
// Merged into round2_canvas.jsx so PoolTable (same script) is available.

function Lives({ remaining = 3, total = 3, cls = "mar-life" }) {
  return <span className={cls === "mar-life" ? "mar-lives" : "mar-mlives"}>
    {Array.from({ length: total }).map((_, i) => <i key={i} className={cls + (i < remaining ? "" : " lost")}></i>)}
  </span>;
}

// #7 — Mode Entry
function MarathonEntry({ surface = "web", banner = false }) {
  const lb = [{ rk: "1", nm: "Deadstroke", sc: "412" }, { rk: "2", nm: "KissShot", sc: "388" }, { rk: "14", nm: "jjk_55 (You)", sc: "142", me: true }];
  return (
    <div className={"mar " + surface}>
      <div className="grain"></div>
      <div className="mar-entry">
        <div className="mar-e-top"><button className="mar-e-back">‹</button><span className="mar-e-eyebrow">Solo · Trick Shots</span></div>
        <div className="mar-e-main">
          <div className="mar-hero">
            <span className="mar-kick">Marathon</span>
            <span className="mar-wm">Trick Shots</span>
            <span className="mar-tag">Three lives. Curated setups. How far can you run?</span>
            <div className="mar-pb">
              <div className="s"><span className="v gold">23</span><span className="k">Best Streak</span></div>
              <div className="s"><span className="v">186</span><span className="k">Setups Done</span></div>
              <div className="s"><span className="v">412</span><span className="k">Best Score</span></div>
            </div>
            {banner && <div className="mar-banner"><span>★</span><span>You set a <b>new streak record</b> last run — share it?</span></div>}
            <button className="mar-start">Start Run ›</button>
          </div>
          <div className="mar-aside">
            <div className="mar-card">
              <div className="ch"><span className="ct">This Week</span><span className="cs">Top Runs</span></div>
              {lb.map((r) => <div key={r.rk} className={"mar-lb" + (r.me ? " me" : "")}><span className="rk">{r.rk}</span><span className="nm">{r.nm}</span><span className="sc">{r.sc}</span></div>)}
            </div>
            <div className="mar-card">
              <div className="ch"><span className="ct">Rewards</span><span className="cs">Per Setup</span></div>
              <div className="mar-reward">Each completed setup earns <b>G</b>. Milestone bonuses at streaks of <b>5</b>, <b>10</b>, <b>20</b>. Bank any time to lock your score.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// #8 — Setup Preview / Intro
function SetupPreview({ surface = "web" }) {
  return (
    <div className={"mar " + surface}>
      <div className="grain"></div>
      <div className="mar-prev">
        <span className="step">Setup 8 of run · Tier 3</span>
        <span className="name">Three-Rail Bank</span>
        <span className="mar-pips"><i className="on"></i><i className="on"></i><i className="on"></i><i></i></span>
        <span className="mar-cond">Pot the 8-ball legally in the highlighted corner pocket — off three cushions.</span>
        <span className="rwd">+18 G if you complete</span>
        <button className="go">Start Shot ›</button>
        <span className="auto">Auto-advances in 3s</span>
      </div>
    </div>
  );
}

// #9/#10/#11 — In-Setup HUD. stamp: null | 'success' | 'fail'
function MarathonHUD({ surface = "web", stamp = null, remaining = 3 }) {
  if (surface === "mob") {
    return (
      <div className="gplay mar-mob">
        <div className="gstage"><div className="gboard"><PoolTable ballStyle="american" cueAt={{ x: 470, y: 300 }} showRack showAim showStick pullback={26} /></div>
          <div className="mar-ring" style={{ top: "22%", right: "20%", width: 38, height: 38 }}><span className="lbl">Target</span></div>
        </div>
        <div className="mar-mbar">
          <div className="setup">Three-Rail Bank<span>Tier 3</span></div>
          <div className="mid"><div className="streak">STREAK 7</div><div className="score">Score 142</div></div>
          <div className="right"><Lives remaining={remaining} cls="mlife" /><button className="mar-mbank">Bank</button></div>
        </div>
        <div className="gpower"><div className="gtrack"><span className="fill" style={{ height: "64%" }}></span><span className="gmark" style={{ bottom: "64%" }}></span></div><span className="gpct">64%</span></div>
        <div className="gspin"><span className="dot"></span><span className="lab">Spin</span></div>
        {stamp && <MarStamp stamp={stamp} />}
        {stamp === "fail" && <div className="mar-fail-cta"><button className="mar-retry">Retry</button><button className="mar-skip">Skip</button></div>}
      </div>
    );
  }
  return (
    <div className="spg mar-web">
      <div className="mar-bar">
        <div className="setup"><span className="nm">Three-Rail Bank</span><span className="pips"><i className="on"></i><i className="on"></i><i className="on"></i><i></i></span></div>
        <div className="mid"><div className="streak">STREAK 7</div><div className="score">Score 142</div></div>
        <div className="right"><Lives remaining={remaining} /><button className="mar-bank">Bank Streak</button></div>
      </div>
      <div className="mar-stage">
        <div className="spg-board"><PoolTable ballStyle="american" cueAt={{ x: 470, y: 300 }} showRack showAim showStick pullback={28} /></div>
        <div className="mar-ring" style={{ top: "26%", right: "17%" }}><span className="lbl">Target Pocket</span></div>
      </div>
      <div className="mar-shelf">
        <div className="spg-tools"><button className="spg-tool">⚑</button><button className="spg-tool">≡</button></div>
        <div className="spg-power"><span className="lbl">POWER</span><div className="barwrap"><span className="mark" style={{ left: "64%" }}></span><div className="bar"><span className="fill" style={{ width: "calc(64% - 4px)" }}></span></div></div><span className="pct">64%</span></div>
        <button className="spg-shoot">Shoot</button>
      </div>
      <div className="spg-spin"><span className="dot"></span><span className="lab">Spin</span></div>
      {stamp && <MarStamp stamp={stamp} />}
      {stamp === "fail" && <div className="mar-fail-cta"><button className="mar-retry">Retry Setup</button><button className="mar-skip">Skip · No Points</button></div>}
    </div>
  );
}

function MarStamp({ stamp }) {
  const ok = stamp === "success";
  return (
    <div className="mar-stamp">
      <span className={"word " + (ok ? "ok" : "miss")}>{ok ? "Completed" : "Missed"}</span>
      <span className={"sub " + (ok ? "g" : "life")}>{ok ? "+18 G" : "−1 Life"}</span>
    </div>
  );
}

// #12 — Run End (reuses the result-screen language)
function RunEnd({ surface = "web", banked = false }) {
  const headWeb = banked ? "Banked" : "Run Ended";
  if (surface === "mob") {
    return (
      <div className="spm mm-reveal">
        <div className="mbg"></div><div className="mveil"></div>
        <header className="m-top"><span className="m-eyebrow">Marathon · <b>{banked ? "Banked" : "Run Ended"}</b></span></header>
        <div className="mstage">
          <div className="kick mres-kick">{banked ? "You Locked It In" : "Out of Lives"}</div>
          <h1 className="mres-stamp">{banked ? "Banked" : "Run Ended"}</h1>
          <div className="mar-mstats">
            <div className="seg"><span className="v gold">7</span><span className="k">Streak</span></div>
            <div className="seg"><span className="v">142</span><span className="k">Score</span></div>
            <div className="seg"><span className="v gold">+126</span><span className="k">Gold</span></div>
            <div className="seg"><span className="v">T3</span><span className="k">Top Tier</span></div>
          </div>
          <div className="mar-mplace">12th this week · 6 of 8 setups cleared</div>
          <div className="mres-cta"><button className="m-gold">New Run</button><button className="m-ghost">Share</button></div>
        </div>
      </div>
    );
  }
  return (
    <div className="sp-result">
      <div className="res-bg"></div><div className="res-veil"></div>
      <header className="res-top"><span className="rmtag">Marathon · <b>Trick Shots</b> · Tier floor Medium</span></header>
      <div className="res-stage">
        <div className="res-kick">{banked ? "You Locked It In" : "Out of Lives"}</div>
        <h1 className="res-stamp">{headWeb}</h1>
        <div className="mar-pbest">{banked ? "" : "New Personal Best!"}</div>
        <div className="mar-runstats">
          <div className="seg"><span className="k">Final Streak</span><span className="v gold">7</span></div>
          <div className="seg"><span className="k">Setups Cleared</span><span className="v">6 / 8</span></div>
          <div className="seg"><span className="k">Total Score</span><span className="v">142</span></div>
          <div className="seg"><span className="k">Gold Earned</span><span className="v gold">+126</span></div>
          <div className="seg"><span className="k">Top Tier</span><span className="v">Tier 3</span></div>
        </div>
        <div className="mar-place">You finished 12th this week</div>
        <div className="res-cta"><button className="res-rematch">New Run</button><button className="res-lobby">Share</button></div>
      </div>
    </div>
  );
}

Object.assign(window, { MarathonEntry, SetupPreview, MarathonHUD, RunEnd });

// ===================== ASYNC & CONNECT =====================
// Round2Async.jsx — #15 async waiting, #16 match-expired, #17 invite link,
// #18 waiting for opponent. Modals reuse the .wf shell; #15 uses a frozen table.
// Merged into round2_canvas.jsx so PoolTable is in scope.

function AsyncWait({ surface = "web", notif = true }) {
  return (
    <div className={"aw " + surface}>
      <div className="frozen"><div className="gboard"><PoolTable ballStyle="american" cueAt={{ x: 520, y: 360 }} showRack showAim={false} showStick={false} /></div></div>
      <div className="veil"></div>
      <div className="aw-panel">
        <span className="aw-kick">Async Match · Their Turn</span>
        <div className="aw-opp"><span className="av">V</span><span className="nm">Velvet Q</span></div>
        <div className="aw-cd">11h 23m</div>
        <span className="aw-cdl">left for @VelvetQ's turn</span>
        <div className="aw-toggle"><span className={"aw-sw" + (notif ? "" : " off")}></span><span>Notify me when they shoot</span></div>
        <div className="aw-cta"><button className="b ghost">Watch More Pool</button><button className="b gold">Back to Lobby</button></div>
      </div>
    </div>
  );
}

function MatchExpired({ surface = "web", kind = "turn" }) {
  const msg = kind === "wall" ? "72-hour match clock ran out — you win by forfeit."
    : kind === "draw" ? "Neither player finished in time. The frame is a draw."
      : "Opponent took too long on their turn — you win by forfeit.";
  return (
    <React.Fragment>
      <div className="behind"></div><div className="grain"></div>
      <div className="wf-modal">
        <div className="wf-head"><div><div className="wf-eyebrow">{kind === "draw" ? "Match Expired" : "Forfeit"}</div><div className="wf-title">{kind === "draw" ? "Time's Up" : "Match Expired"}</div></div></div>
        <div className="wf-body">
          <div className="wf-cap" style={{ textAlign: "left", fontSize: "calc(13px * var(--u))", color: "var(--c-cream)" }}>{msg}</div>
          <button className={"wf-cta" + (kind === "draw" ? " ghost" : "")}>{kind === "draw" ? "Back to Lobby" : "Claim Win"}</button>
        </div>
      </div>
    </React.Fragment>
  );
}

function InviteLink({ surface = "web", state = "generated" }) {
  return (
    <React.Fragment>
      <div className="behind"></div><div className="grain"></div>
      <div className="wf-modal">
        <div className="wf-head"><div><div className="wf-eyebrow">Private 1v1</div><div className="wf-title">Challenge a Friend</div></div></div>
        <div className="wf-body">
          <div className="wf-cap" style={{ textAlign: "left" }}>Generate a one-time link. First friend to open it sits across from you — no stakes.</div>
          <div className="aw-code"><span className="u">{state === "generating" ? "generating link…" : "sp.gg/r/ABC123"}</span><button className="copy">{state === "copied" ? "Copied" : "Copy"}</button></div>
          <div className="aw-share">
            <span className="s tg">✈ Telegram</span>
            <span className="s">Copy Link</span>
            {surface === "mob" && <span className="s">QR</span>}
          </div>
          {surface === "web" && <div className="aw-qr">{[1,0,1,0,1, 0,1,1,1,0, 1,1,0,1,1, 0,1,1,0,1, 1,0,1,0,1].map((b, i) => <i key={i} className={b ? "" : "o"}></i>)}</div>}
          <div className="aw-ttl">{state === "expired" ? "Link expired · regenerate" : "Link expires in 30 minutes"}</div>
        </div>
      </div>
    </React.Fragment>
  );
}

function WaitingOpponent({ surface = "web" }) {
  return (
    <React.Fragment>
      <div className="behind"></div><div className="grain"></div>
      <div className="wf-modal">
        <div className="wf-head"><div><div className="wf-eyebrow">Private 1v1</div><div className="wf-title">Waiting for Friend<span className="aw-wait-dots"></span></div></div></div>
        <div className="wf-body">
          <div className="aw-seats">
            <div className="aw-seat"><div className="ring">J</div><div className="nm">jjk_55</div></div>
            <div className="aw-vs">vs</div>
            <div className="aw-seat empty"><div className="ring">?</div><div className="nm">Joining…</div></div>
          </div>
          <div className="aw-code"><span className="u">sp.gg/r/ABC123</span><button className="copy">Re-share</button></div>
          <button className="wf-cancel">Cancel table</button>
        </div>
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { AsyncWait, MatchExpired, InviteLink, WaitingOpponent });

// ===================== TOURNAMENTS R2 =====================
// Round2Tour.jsx — #24 pre-round waiting room, #25 round result, #26 champion.
// #25/#26 reuse the .sp-result / .mm-reveal result language (Abril stamp). The
// pre-round stage + mini bracket are .t2-*. Merged into round2_canvas.

function MiniBracket({ u = "web" }) {
  return (
    <div className="t2-br">
      <div className="t2-col"><span className="t2-rl">Semis</span>
        <div className="t2-m now"><div className="r you"><span>jjk_55</span><span className="s">—</span></div><div className="r"><span>Velvet Q</span><span className="s">—</span></div></div>
        <div className="t2-m"><div className="r"><span>Deadstroke</span><span className="s">—</span></div><div className="r"><span>KissShot</span><span className="s">—</span></div></div>
      </div>
      <div className="t2-col"><span className="t2-rl">Final</span>
        <div className="t2-m"><div className="r tbd"><span>Winner SF1</span></div><div className="r tbd"><span>Winner SF2</span></div></div>
      </div>
      <div className="t2-col"><span className="t2-rl">Cup</span>
        <div className="t2-champ-node"><span className="cr">♔</span></div>
      </div>
    </div>
  );
}

// #24 — pre-round waiting room
function PreRound({ surface = "web" }) {
  return (
    <div className={"t2 " + surface}>
      <div className="grain"></div>
      <div className="t2-pr">
        <span className="t2-kick">The Velvet Cup · Semifinal</span>
        <div className="t2-start">Starts in <b>1:23</b></div>
        <div className="t2-vs">
          <div className="t2-f"><div className="av" style={{ background: "radial-gradient(circle at 38% 30%, #2a6b4f, #143b2c 78%)" }}>J</div><div className="nm">jjk_55</div><div className="el">1,250 Elo</div></div>
          <div className="med">VS</div>
          <div className="t2-f"><div className="av" style={{ background: "radial-gradient(circle at 38% 30%, #7a3aa0, #2c1140 80%)" }}>V</div><div className="nm">Velvet Q</div><div className="el">1,238 Elo</div></div>
        </div>
        <div className="t2-h2h">Head-to-head <b>3–2</b> · you lead</div>
        <MiniBracket />
        <button className="t2-ready">Ready Up</button>
      </div>
    </div>
  );
}

// #25 — round result (won / lost a round, not the final)
function RoundResult({ surface = "web", win = true }) {
  if (surface === "mob") {
    return (
      <div className="spm mm-reveal">
        <div className="mbg"></div><div className="mveil"></div>
        <header className="m-top"><span className="m-eyebrow">Velvet Cup · <b>Semifinal</b></span></header>
        <div className="mstage">
          <div className="kick mres-kick">{win ? "Into the Final" : "Your Cup Ends Here"}</div>
          <h1 className={"mres-stamp" + (win ? "" : " lose")}>{win ? "Won" : "Out"}</h1>
          <div className="mar-mstats">
            <div className="seg"><span className="v">{win ? "5–3" : "3–5"}</span><span className="k">vs Velvet Q</span></div>
            <div className="seg"><span className="v gold">{win ? "25" : "12"}</span><span className="k">TKT {win ? "finalist" : "3rd place"}</span></div>
          </div>
          <div className="mres-cta">{win ? <button className="m-gold">Next Match</button> : <button className="m-gold">Back to Bracket</button>}<button className="m-ghost">Bracket</button></div>
        </div>
      </div>
    );
  }
  return (
    <div className="sp-result">
      <div className="res-bg"></div><div className="res-veil"></div>
      <header className="res-top"><span className="rmtag">The Velvet Cup · <b>Semifinal</b></span></header>
      <div className="res-stage">
        <div className="res-kick">{win ? "Into the Final" : "Your Cup Ends Here"}</div>
        <h1 className={"res-stamp" + (win ? "" : " lose")}>{win ? "Semifinal Won" : "Eliminated"}</h1>
        <div className="t2-prize">
          <div className="seg"><span className="k">Final Score</span><span className="v">{win ? "5 — 3" : "3 — 5"} vs Velvet Q</span></div>
          <div className="seg"><span className="k">Prize Tier</span><span className="v up">{win ? "Now guaranteed: 25 TKT (finalist)" : "3rd place: 12 TKT"}</span></div>
        </div>
        <div className="res-cta">{win ? <button className="res-rematch">Next Match</button> : <button className="res-rematch">Back to Bracket</button>}<button className="res-lobby">View Bracket</button></div>
      </div>
    </div>
  );
}

// #26 — champion card (bigger than a normal victory)
function Champion({ surface = "web" }) {
  if (surface === "mob") {
    return (
      <div className="spm mm-reveal">
        <div className="mbg"></div><div className="mveil"></div>
        <header className="m-top"><span className="m-eyebrow">The Velvet Cup</span></header>
        <div className="mstage">
          <div className="t2-crown" style={{ fontSize: 40 }}>♔</div>
          <h1 className="mres-stamp">Champion</h1>
          <div className="t2-badge">Velvet Cup · Winner</div>
          <div className="mar-mstats"><div className="seg"><span className="v gold">120 TKT</span><span className="k">Prize</span></div><div className="seg"><span className="v">7</span><span className="k">Beaten</span></div></div>
          <div className="mres-cta"><button className="m-gold">Share</button><button className="m-ghost">Lobby</button></div>
        </div>
      </div>
    );
  }
  return (
    <div className="sp-result">
      <div className="res-bg"></div><div className="res-veil"></div>
      <header className="res-top"><span className="rmtag">The Velvet Cup · <b>The Final</b></span></header>
      <div className="res-stage">
        <div className="t2-crown">♔</div>
        <h1 className="res-stamp">Champion</h1>
        <div className="t2-badge">Velvet Cup · Winner · Est. tonight</div>
        <div className="t2-prize">
          <div className="seg"><span className="k">Cup Prize</span><span className="t2-prizebig">120 TKT</span></div>
          <div className="seg"><span className="k">Players Beaten</span><span className="v">7 of 8 · bracket cleared</span></div>
          <div className="seg"><span className="k">Title</span><span className="v up">Velvet Cup Champion</span></div>
        </div>
        <div className="res-cta"><button className="res-rematch">Share Win</button><button className="res-lobby">Back to Lobby</button></div>
      </div>
    </div>
  );
}

Object.assign(window, { PreRound, RoundResult, Champion });

// ===================== META2 =====================
// Round2Meta2.jsx — #21 Game settings section, #22 cue Equip modal, #23 wagered
// room badge. Settings/badge use the .t2 shell; equip reuses the .wf modal.

function GameSettings({ surface = "web" }) {
  return (
    <div className={"t2 " + surface}>
      <div className="grain"></div>
      <div className="gs-card">
        <div className="gs-head"><div className="eb">Settings</div><div className="ti">Game</div></div>
        <div className="gs-body">
          <div className="gs-sh">Aiming</div>
          <div className="gs-row">
            <span className="gs-lab">Aim guideline<span className="d">Projected cue line + ghost ball</span></span>
            <span style={{ display: "flex", alignItems: "center", gap: "calc(10px * var(--u))" }}>
              <span className="gs-prev"><span className="ln"></span><span className="gh"></span></span>
              <span className="gs-seg"><button className="on">On</button><button>Short</button><button>Off</button></span>
            </span>
          </div>
          <div className="gs-row">
            <span className="gs-lab">English physics<span className="d">Full spin · off reduces to display-only</span></span>
            <span className="gs-tog"></span>
          </div>
          {surface === "mob" && <div className="gs-row"><span className="gs-lab">Aim-assist sensitivity<span className="d">Tap-aim + hold-to-refine</span></span><span className="gs-sl"><i style={{ width: "60%" }}></i><span className="k" style={{ left: "60%" }}></span></span></div>}
          <div className="gs-sh">Table</div>
          <div className="gs-row"><span className="gs-lab">Cue &amp; felt theme<span className="d">Cosmetic · more coming</span></span><span className="gs-theme"><i style={{ background: "#1E5FA8" }}></i><i style={{ background: "#1b5a3e" }}></i><i style={{ background: "#5e2c7a" }}></i></span></div>
          <div className="gs-sh">Sound</div>
          <div className="gs-row"><span className="gs-lab">Match sound effects<span className="d">Cue, pocket, break</span></span><span className="gs-tog"></span></div>
          <div className="gs-row"><span className="gs-lab">Pub ambience<span className="d">Low after-hours loop</span></span><span className="gs-tog off"></span></div>
          <div className="gs-row"><span className="gs-lab">Master volume</span><span className="gs-sl"><i style={{ width: "70%" }}></i><span className="k" style={{ left: "70%" }}></span></span></div>
        </div>
      </div>
    </div>
  );
}

function CueEquip({ surface = "web", equipped = false }) {
  return (
    <React.Fragment>
      <div className="behind"></div><div className="grain"></div>
      <div className="wf-modal">
        <div className="wf-head"><div><div className="wf-eyebrow">Cue Locker</div><div className="wf-title">{equipped ? "Equipped" : "Equip Cue?"}</div></div></div>
        <div className="wf-body">
          <div className="ce-cuewrap"><span className="ce-cue"></span></div>
          {equipped
            ? <React.Fragment><div className="ce-equipped">Velvet Night — Equipped</div><button className="wf-cta ghost">Back to Locker</button></React.Fragment>
            : <React.Fragment>
                <div className="wf-cap" style={{ textAlign: "center" }}>Equip <b style={{ color: "var(--c-cream)" }}>Velvet Night</b>? Cosmetic only — never affects play.</div>
                <div className="wf-ctarow"><button className="wf-cta ghost" style={{ flex: "0 0 38%" }}>Cancel</button><button className="wf-cta" style={{ flex: 1 }}>Equip</button></div>
              </React.Fragment>}
        </div>
      </div>
    </React.Fragment>
  );
}

function RoomBadge({ surface = "web" }) {
  return (
    <div className={"t2 " + surface}>
      <div className="grain"></div>
      <div className="rb">
        <div className="rb-room" style={{ "--rc1": "#1f6f5c", "--rc2": "#0b241d" }}>
          <div className="rn">The Break Room</div>
          <div className="rt">Warm up. Skill only.</div>
          <div className="rm">Free · Open to all</div>
        </div>
        <div className="rb-room" style={{ "--rc1": "#5e2c7a", "--rc2": "#220e30" }}>
          <div className="rb-badge"><span className="bl">◎</span>Wagered tables</div>
          <div className="rn">The Velvet Room</div>
          <div className="rt">Smooth operators.</div>
          <div className="rm">Free + Wagered · Gold+</div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { GameSettings, CueEquip, RoomBadge });

// ===================== CHROME R2 =====================
// Round2Chrome.jsx — #27 TG launch cue, #28 splash, #29 empty/error states,
// #30 onboarding. Errors + onboarding reuse the .wf modal; splash/TG use .ch.

function Splash({ surface = "web" }) {
  return (
    <div className={"ch " + surface}>
      <div className="grain"></div>
      <div className="ch-splash">
        <span className="ch-est">Members Club · Est. 1952</span>
        <h1 className="ch-wm">Side<br /><em>Pocket</em></h1>
        <div className="ch-load"><i></i></div>
        <span className="ch-loadt">Racking the table…</span>
      </div>
    </div>
  );
}

function TGLaunch({ surface = "web" }) {
  return (
    <div className={"ch " + surface}>
      <div className="grain"></div>
      <div className="ch-tg">
        <div className="ch-tgbar">
          <span className="back">‹ Back to chat</span>
          <span className="who"><span className="av">J</span><span className="nm">jjk_55</span><span className="ch-tgico">✈</span></span>
        </div>
        <span className="ch-tgchip">✈ Launched from Telegram</span>
        <div className="ch-tgnote">Opened from the Side Pocket bot. A <b>Telegram mark</b> sits by your name, and <b>Back</b> returns you to the chat (not the arcade hub). Session is carried by the bot's signed link — no separate login.</div>
      </div>
    </div>
  );
}

// #29 — empty / error states (reuse .wf modal)
function StateModal({ kind = "no-tourney" }) {
  const M = {
    "no-tourney": { eb: "Tournaments", ti: "None Live Right Now", body: "Next tournament starts in 30:00. Want a quick match while you wait?", cta: "Quick Match", ghost: "Notify Me" },
    "no-opp": { eb: "Matchmaking", ti: "No One's Around", body: "Couldn't seat an opponent in your skill band. Switch to a practice match vs the computer?", cta: "Play VS Computer", ghost: "Keep Waiting" },
    "deposit": { eb: "Wagered · Deposit", ti: "Deposit Didn't Confirm", body: "Your SOL deposit didn't settle. Retry, or cancel and keep your balance.", cta: "Retry Deposit", ghost: "Cancel", danger: true },
    "settle": { eb: "Wagered · Settling", ti: "Settling Your Win", body: "Your payout is being settled on-chain. It'll appear within 60s — refresh if it doesn't.", cta: "Refresh", ghost: "Back to Lobby" },
  }[kind];
  return (
    <React.Fragment>
      <div className="behind"></div><div className="grain"></div>
      <div className="wf-modal">
        <div className="wf-head"><div><div className="wf-eyebrow">{M.eb}</div><div className="wf-title">{M.ti}</div></div></div>
        <div className="wf-body">
          <div className="wf-cap" style={{ textAlign: "left", fontSize: "calc(13px * var(--u))", color: "var(--c-cream)" }}>{M.body}</div>
          <div className="wf-ctarow">
            <button className="wf-cta ghost" style={{ flex: "0 0 40%" }}>{M.ghost}</button>
            <button className={"wf-cta" + (M.danger ? " danger" : "")} style={{ flex: 1 }}>{M.cta}</button>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

// #30 — onboarding (4-step), reuse .wf modal
function Onboarding({ surface = "web", step = 0 }) {
  const steps = [
    { t: "Aim", d: "Drag the felt to point the cue. The dashed line shows where the cue ball goes; the ghost ball marks contact." },
    { t: "Power", d: "Pull the rail slider to load power — the yellow pill shows how hard you'll strike." },
    { t: "Spin", d: "Tap the cue-ball node and place the contact dot to add english." },
    { t: "Shoot", d: "Release (or tap Shoot) to take the stroke. That's it — pure skill." },
  ];
  const s = steps[step];
  const illus = step === 0
    ? <React.Fragment><div className="ob-aim"></div><div className="ob-cue"></div><div className="ob-ghost"></div></React.Fragment>
    : step === 1 ? <div className="ob-bar"><div className="f"></div><div className="pill"></div></div>
    : step === 2 ? <div className="ob-cue"><div className="dot"></div></div>
    : <div className="ob-stick"></div>;
  return (
    <React.Fragment>
      <div className="behind"></div><div className="grain"></div>
      <div className="wf-modal">
        <div className="wf-head"><div><div className="wf-eyebrow">How to Play</div><div className="wf-title">{s.t}</div></div><button className="wf-cancel" style={{ display: "block" }}>Skip</button></div>
        <div className="wf-body">
          <div className="ob-illus">{illus}</div>
          <span className="ob-step">Step {step + 1} of 4</span>
          <div className="wf-cap" style={{ textAlign: "center", fontSize: "calc(13px * var(--u))", color: "var(--c-cream)" }}>{s.d}</div>
          <div className="ob-dots">{steps.map((_, i) => <i key={i} className={i === step ? "on" : ""}></i>)}</div>
          <button className="wf-cta">{step === 3 ? "Break!" : "Next"}</button>
        </div>
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { Splash, TGLaunch, StateModal, Onboarding });

// ===================== ROUND 2 CANVAS =====================
// round2_canvas.jsx — Side Pocket Round 2 screens on a design canvas.
// Web (1440×900) + Mobile (landscape) per item. Batch 1: Wagered 1v1 flow.
const PHONE = { w: 844, h: 390 };
const AB = (w, h, pad = 26) => ({ width: w + pad, height: h + pad });

// web artboard helper: fills 1440×900 with the .wf web host
function W({ children }) { return <div className="wf web">{children}</div>; }
// mobile artboard helper: device frame + .wf mob host
function M({ children }) {
  return (
    <MobileDevice w={PHONE.w} h={PHONE.h}>
      <div className="wf mob">{children}</div>
    </MobileDevice>
  );
}

function StampBoard({ mob }) {
  const stamps = [
    { t: "Break!", c: "gold", cap: "Start of rack" },
    { t: "Solids", c: "solid", cap: "Group assigned" },
    { t: "Stripes", c: "strip", cap: "Group assigned" },
    { t: "Foul!", c: "red", cap: "General foul · ball in hand" },
    { t: "Scratch", c: "red", cap: "Cue ball pocketed" },
    { t: "Re-Rack", c: "gold", cap: "8 on break · re-rack" },
    { t: "Defeat", c: "red", cap: "8 potted early · auto-loss" },
    { t: "Victory!", c: "gold", cap: "Rack won" },
    { t: "Defeat", c: "dim", cap: "Rack lost" },
  ];
  return (
    <div className={"mar " + (mob ? "mob" : "web")}>
      <div className="grain"></div>
      <div className="st-board">
        <div className="bh">In-Match Stamps</div>
        <div className="bs">~1.5s each · slam 200ms · hold 1s · fade 300ms · pub-overheard, not flashy</div>
        <div className="st-grid">{stamps.map((s, i) => <div className="st-cell" key={i}><span className={"sx " + s.c}>{s.t}</span><span className="cap">{s.cap}</span></div>)}</div>
      </div>
    </div>
  );
}

function R2App() {
  return (
    <DesignCanvas>

      <DCSection id="wager-web" title="Round 2 · Wagered 1v1 — Web (1440×900)" subtitle="SOL wagering, surgically: a deliberate sub-mode. Free = gold/lime · Wagered = brass+ink weight. 10% rake, skill-only, Elo matchmaking.">
        <DCArtboard id="w1-mode" label="#1 Mode Select — Wagered tab active, BO1" width={1440} height={900}><W><ModeSelect tab="wager" fmt={0} /></W></DCArtboard>
        <DCArtboard id="w1-free" label="#1 Mode Select — Free tab (default), BO3" width={1440} height={900}><W><ModeSelect tab="free" fmt={1} /></W></DCArtboard>
        <DCArtboard id="w1-prov" label="#1 Mode Select — provisional gate (under 25 ranked)" width={1440} height={900}><W><ModeSelect tab="wager" provisional /></W></DCArtboard>
        <DCArtboard id="w2-stake" label="#2 Stake Selector — 1 SOL selected" width={1440} height={900}><W><StakeSelector sel={4} /></W></DCArtboard>
        <DCArtboard id="w2-insuf" label="#2 Stake Selector — insufficient SOL (Top Up CTA)" width={1440} height={900}><W><StakeSelector sel={5} insufficient /></W></DCArtboard>
        <DCArtboard id="w3-topup" label="#3 Top Up SOL — Privy / paste options" width={1440} height={900}><W><TopUp /></W></DCArtboard>
        <DCArtboard id="w4-confirm" label="#4 Confirm Stake — escrow modal (treasury/ops fine print)" width={1440} height={900}><W><ConfirmStake stake="0.05" /></W></DCArtboard>
        <DCArtboard id="w6-win" label="#6 Pool Card — Victory payout (Round-1 result + payout panel)" width={1440} height={900}><WagerPayout surface="web" win stake="0.05" /></DCArtboard>
        <DCArtboard id="w6-lose" label="#6 Pool Card — Defeat (stake lost)" width={1440} height={900}><WagerPayout surface="web" win={false} stake="0.05" /></DCArtboard>
      </DCSection>

      <DCSection id="wager-mob" title="Round 2 · Wagered 1v1 — Mobile (landscape)" subtitle="Same flow, landscape. Touch targets ≥44px. Stake cards in a single row.">
        <DCArtboard id="m1-mode" label="#1 Mode Select — Wagered tab" {...AB(PHONE.w, PHONE.h)}><M><ModeSelect tab="wager" fmt={0} /></M></DCArtboard>
        <DCArtboard id="m1-prov" label="#1 Mode Select — provisional gate" {...AB(PHONE.w, PHONE.h)}><M><ModeSelect tab="wager" provisional /></M></DCArtboard>
        <DCArtboard id="m2-stake" label="#2 Stake Selector — 1 SOL selected" {...AB(PHONE.w, PHONE.h)}><M><StakeSelector sel={4} /></M></DCArtboard>
        <DCArtboard id="m2-insuf" label="#2 Stake Selector — insufficient" {...AB(PHONE.w, PHONE.h)}><M><StakeSelector sel={5} insufficient /></M></DCArtboard>
        <DCArtboard id="m3-topup" label="#3 Top Up SOL" {...AB(PHONE.w, PHONE.h)}><M><TopUp /></M></DCArtboard>
        <DCArtboard id="m4-confirm" label="#4 Confirm Stake" {...AB(PHONE.w, PHONE.h)}><M><ConfirmStake stake="0.05" /></M></DCArtboard>
        <DCArtboard id="m6-win" label="#6 Pool Card — Victory" {...AB(PHONE.w, PHONE.h)}><MobileDevice w={PHONE.w} h={PHONE.h}><WagerPayout surface="mob" win stake="0.05" /></MobileDevice></DCArtboard>
        <DCArtboard id="m6-lose" label="#6 Pool Card — Defeat" {...AB(PHONE.w, PHONE.h)}><MobileDevice w={PHONE.w} h={PHONE.h}><WagerPayout surface="mob" win={false} stake="0.05" /></MobileDevice></DCArtboard>
      </DCSection>

      <DCSection id="wager-hud" title="Round 2 · #5 Wagered In-Match HUD" subtitle="Same cobalt table + HUD as Round 1, with a brass+ink stake chip on the table (stake + live pot). Free play keeps the gold/lime chrome; wagered carries the weight here.">
        <DCArtboard id="w5-hud" label="#5 Wagered HUD — Web · Your Shot · 0.05 SOL on the table" width={1440} height={900}>
          <DesktopMatch turn="you" />
          <div className="spg-stake"><span className="ic">◎</span><span className="on"><b>0.05 SOL</b> on the table</span><span className="pot">Pot 0.1 SOL</span></div>
        </DCArtboard>
        <DCArtboard id="m5-hud" label="#5 Wagered HUD — Mobile · Your Shot" {...AB(PHONE.w, PHONE.h)}>
          <MobileDevice w={PHONE.w} h={PHONE.h}>
            <GameplayA hand="r" />
            <div className="gstake"><span className="ic">◎</span><span className="on"><b>0.05 SOL</b> on the table</span><span className="pot">Pot 0.1</span></div>
          </MobileDevice>
        </DCArtboard>
      </DCSection>

      <DCSection id="mar-web" title="Round 2 · Marathon Trick-Shots — Web (1440×900)" subtitle="Trick-shot lives mode (replaces the bot ladder). 3 lives · complete curated setups for streak + Gold · bank any time. Reuses the cobalt table + stamp + result language.">
        <DCArtboard id="me7-entry" label="#7 Mode Entry — personal best, weekly board, difficulty floor" width={1440} height={900}><MarathonEntry surface="web" /></DCArtboard>
        <DCArtboard id="me7-rec" label="#7 Mode Entry — new record banner" width={1440} height={900}><MarathonEntry surface="web" banner /></DCArtboard>
        <DCArtboard id="me8-prev" label="#8 Setup Preview — name, win condition, tier pips, reward" width={1440} height={900}><SetupPreview surface="web" /></DCArtboard>
        <DCArtboard id="me9-hud" label="#9 In-Setup HUD — 3 lives, streak, target-pocket ring, Bank Streak" width={1440} height={900}><MarathonHUD surface="web" /></DCArtboard>
        <DCArtboard id="me10-ok" label="#10 Setup Success — COMPLETED + G" width={1440} height={900}><MarathonHUD surface="web" stamp="success" /></DCArtboard>
        <DCArtboard id="me11-fail" label="#11 Setup Fail — MISSED · −1 life · Retry / Skip" width={1440} height={900}><MarathonHUD surface="web" stamp="fail" remaining={2} /></DCArtboard>
        <DCArtboard id="me12-end" label="#12 Run End — out of lives (personal best)" width={1440} height={900}><RunEnd surface="web" /></DCArtboard>
        <DCArtboard id="me12-bank" label="#12 Run End — banked (voluntary cash-out)" width={1440} height={900}><RunEnd surface="web" banked /></DCArtboard>
      </DCSection>

      <DCSection id="mar-mob" title="Round 2 · Marathon Trick-Shots — Mobile (landscape)" subtitle="Same mode, landscape. Lives + Bank top-right; rail slider for power; target pocket ringed in gold.">
        <DCArtboard id="mm7-entry" label="#7 Mode Entry" {...AB(PHONE.w, PHONE.h)}><MobileDevice w={PHONE.w} h={PHONE.h}><MarathonEntry surface="mob" /></MobileDevice></DCArtboard>
        <DCArtboard id="mm8-prev" label="#8 Setup Preview" {...AB(PHONE.w, PHONE.h)}><MobileDevice w={PHONE.w} h={PHONE.h}><SetupPreview surface="mob" /></MobileDevice></DCArtboard>
        <DCArtboard id="mm9-hud" label="#9 In-Setup HUD" {...AB(PHONE.w, PHONE.h)}><MobileDevice w={PHONE.w} h={PHONE.h}><MarathonHUD surface="mob" /></MobileDevice></DCArtboard>
        <DCArtboard id="mm10-ok" label="#10 Setup Success" {...AB(PHONE.w, PHONE.h)}><MobileDevice w={PHONE.w} h={PHONE.h}><MarathonHUD surface="mob" stamp="success" /></MobileDevice></DCArtboard>
        <DCArtboard id="mm11-fail" label="#11 Setup Fail" {...AB(PHONE.w, PHONE.h)}><MobileDevice w={PHONE.w} h={PHONE.h}><MarathonHUD surface="mob" stamp="fail" remaining={2} /></MobileDevice></DCArtboard>
        <DCArtboard id="mm12-end" label="#12 Run End — out of lives" {...AB(PHONE.w, PHONE.h)}><MobileDevice w={PHONE.w} h={PHONE.h}><RunEnd surface="mob" /></MobileDevice></DCArtboard>
        <DCArtboard id="mm12-bank" label="#12 Run End — banked" {...AB(PHONE.w, PHONE.h)}><MobileDevice w={PHONE.w} h={PHONE.h}><RunEnd surface="mob" banked /></MobileDevice></DCArtboard>
      </DCSection>

      <DCSection id="states-web" title="Round 2 · Match States — Web (1440×900)" subtitle="Referee-called fouls (#13), ball-in-hand (#14), reconnect (#19), and the locked stamp set (#20). Stamps reuse the Bowlby pub-overheard treatment.">
        <DCArtboard id="s13-foul" label="#13 Foul — ball in hand to opponent" width={1440} height={900}>
          <DesktopMatch turn="opp" />
          <div className="st-stampwrap"><span className="st-stamp foul">Foul!</span><span className="st-sub">Ball in hand to <b>@VelvetQ</b></span></div>
        </DCArtboard>
        <DCArtboard id="s13-scratch" label="#13 Scratch — cue ball pocketed" width={1440} height={900}>
          <DesktopMatch turn="opp" />
          <div className="st-stampwrap"><span className="st-stamp scratch">Scratch</span><span className="st-sub">Ball in hand to <b>@VelvetQ</b></span></div>
        </DCArtboard>
        <DCArtboard id="s14-bih" label="#14 Ball-in-hand — place the cue ball (kitchen highlighted)" width={1440} height={900}>
          <DesktopMatch turn="you" />
          <div className="st-bih"><div className="st-kitchen"></div><div className="st-ghostball" style={{ left: "12%", top: "52%" }}></div></div>
          <div className="st-bih-cap">Place the cue ball · then shoot</div>
        </DCArtboard>
        <DCArtboard id="s19-recon" label="#19 Reconnect — connection lost (30s)" width={1440} height={900}>
          <DesktopMatch turn="you" />
          <div className="st-recon"><div className="ring"></div><h2>Connection lost — reconnecting…</h2><div className="cd">0:24</div><div className="opp"><i></i>Opponent is still here</div></div>
        </DCArtboard>
        <DCArtboard id="s19-final" label="#19 Reconnect — final seconds, forfeit option" width={1440} height={900}>
          <DesktopMatch turn="you" />
          <div className="st-recon"><div className="ring"></div><h2>Connection couldn't restore</h2><div className="cd low">0:06</div><div className="opp"><i className="off"></i>Opponent also disconnected</div><div className="cta"><button className="keep">Keep Trying</button><button className="ff">Forfeit</button></div></div>
        </DCArtboard>
        <DCArtboard id="s20-stamps" label="#20 In-match stamp set (locked treatment)" width={1440} height={900}><StampBoard /></DCArtboard>
      </DCSection>

      <DCSection id="states-mob" title="Round 2 · Match States — Mobile (landscape)" subtitle="Same states, landscape.">
        <DCArtboard id="ms13-foul" label="#13 Foul" {...AB(PHONE.w, PHONE.h)}><MobileDevice w={PHONE.w} h={PHONE.h}><GameplayA hand="r" /><div className="st-stampwrap"><span className="st-stamp foul">Foul!</span><span className="st-sub">Ball in hand · @VelvetQ</span></div></MobileDevice></DCArtboard>
        <DCArtboard id="ms14-bih" label="#14 Ball-in-hand" {...AB(PHONE.w, PHONE.h)}><MobileDevice w={PHONE.w} h={PHONE.h}><GameplayA hand="r" /><div className="st-bih"><div className="st-kitchen"></div><div className="st-ghostball" style={{ left: "12%", top: "52%" }}></div></div><div className="st-bih-cap">Place cue ball · then shoot</div></MobileDevice></DCArtboard>
        <DCArtboard id="ms19-recon" label="#19 Reconnect" {...AB(PHONE.w, PHONE.h)}><MobileDevice w={PHONE.w} h={PHONE.h}><GameplayA hand="r" /><div className="st-recon"><div className="ring"></div><h2>Reconnecting…</h2><div className="cd">0:24</div><div className="opp"><i></i>Opponent still here</div></div></MobileDevice></DCArtboard>
        <DCArtboard id="ms20-stamps" label="#20 Stamp set" {...AB(PHONE.w, PHONE.h)}><MobileDevice w={PHONE.w} h={PHONE.h}><StampBoard mob /></MobileDevice></DCArtboard>
      </DCSection>

      <DCSection id="async-web" title="Round 2 · Async & Connect — Web (1440×900)" subtitle="Correspondence waiting (#15), match-expired forfeit (#16), private invite link (#17), waiting for opponent (#18).">
        <DCArtboard id="a15-wait" label="#15 Async Waiting — frozen table + 12h countdown" width={1440} height={900}><AsyncWait surface="web" /></DCArtboard>
        <DCArtboard id="a16-exp" label="#16 Match Expired — win by forfeit" width={1440} height={900}><div className="wf web"><MatchExpired surface="web" kind="turn" /></div></DCArtboard>
        <DCArtboard id="a17-invite" label="#17 Private Invite — link, Telegram, QR, TTL" width={1440} height={900}><div className="wf web"><InviteLink surface="web" /></div></DCArtboard>
        <DCArtboard id="a18-waiting" label="#18 Waiting for Opponent — link table" width={1440} height={900}><div className="wf web"><WaitingOpponent surface="web" /></div></DCArtboard>
      </DCSection>

      <DCSection id="async-mob" title="Round 2 · Async & Connect — Mobile (landscape)" subtitle="Same flow, landscape.">
        <DCArtboard id="ma15-wait" label="#15 Async Waiting" {...AB(PHONE.w, PHONE.h)}><MobileDevice w={PHONE.w} h={PHONE.h}><AsyncWait surface="mob" /></MobileDevice></DCArtboard>
        <DCArtboard id="ma16-exp" label="#16 Match Expired" {...AB(PHONE.w, PHONE.h)}><MobileDevice w={PHONE.w} h={PHONE.h}><div className="wf mob"><MatchExpired surface="mob" kind="turn" /></div></MobileDevice></DCArtboard>
        <DCArtboard id="ma17-invite" label="#17 Private Invite (QR button)" {...AB(PHONE.w, PHONE.h)}><MobileDevice w={PHONE.w} h={PHONE.h}><div className="wf mob"><InviteLink surface="mob" /></div></MobileDevice></DCArtboard>
        <DCArtboard id="ma18-waiting" label="#18 Waiting for Opponent" {...AB(PHONE.w, PHONE.h)}><MobileDevice w={PHONE.w} h={PHONE.h}><div className="wf mob"><WaitingOpponent surface="mob" /></div></MobileDevice></DCArtboard>
      </DCSection>

      <DCSection id="tour-web" title="Round 2 · Tournaments — Web (1440×900)" subtitle="Pre-round waiting room (#24), round result (#25), champion (#26). Round/champion reuse the result-screen language.">
        <DCArtboard id="t24-pre" label="#24 Pre-round — opponent, H2H, live bracket, Ready Up" width={1440} height={900}><PreRound surface="web" /></DCArtboard>
        <DCArtboard id="t25-won" label="#25 Round Result — Semifinal Won (prize-tier move)" width={1440} height={900}><RoundResult surface="web" win /></DCArtboard>
        <DCArtboard id="t25-out" label="#25 Round Result — Eliminated (3rd place)" width={1440} height={900}><RoundResult surface="web" win={false} /></DCArtboard>
        <DCArtboard id="t26-champ" label="#26 Champion — Velvet Cup winner" width={1440} height={900}><Champion surface="web" /></DCArtboard>
      </DCSection>

      <DCSection id="tour-mob" title="Round 2 · Tournaments — Mobile (landscape)" subtitle="Same screens, landscape.">
        <DCArtboard id="mt24-pre" label="#24 Pre-round" {...AB(PHONE.w, PHONE.h)}><MobileDevice w={PHONE.w} h={PHONE.h}><PreRound surface="mob" /></MobileDevice></DCArtboard>
        <DCArtboard id="mt25-won" label="#25 Round Result — Won" {...AB(PHONE.w, PHONE.h)}><MobileDevice w={PHONE.w} h={PHONE.h}><RoundResult surface="mob" win /></MobileDevice></DCArtboard>
        <DCArtboard id="mt26-champ" label="#26 Champion" {...AB(PHONE.w, PHONE.h)}><MobileDevice w={PHONE.w} h={PHONE.h}><Champion surface="mob" /></MobileDevice></DCArtboard>
      </DCSection>

      <DCSection id="meta2-web" title="Round 2 · Settings · Cue · Rooms — Web (1440×900)" subtitle="#21 Game settings, #22 cue Equip modal, #23 wagered room badge.">
        <DCArtboard id="g21-set" label="#21 Settings — new Game section (aim guideline, English physics, theme, sound)" width={1440} height={900}><GameSettings surface="web" /></DCArtboard>
        <DCArtboard id="g22-equip" label="#22 Cue Equip — confirm modal" width={1440} height={900}><div className="wf web"><CueEquip surface="web" /></div></DCArtboard>
        <DCArtboard id="g22-done" label="#22 Cue Equip — equipped stamp" width={1440} height={900}><div className="wf web"><CueEquip surface="web" equipped /></div></DCArtboard>
        <DCArtboard id="g23-badge" label="#23 Wagered room badge — Free vs Wagered-available rooms" width={1440} height={900}><RoomBadge surface="web" /></DCArtboard>
      </DCSection>

      <DCSection id="meta2-mob" title="Round 2 · Settings · Cue · Rooms — Mobile (landscape)" subtitle="Same, landscape (Game settings adds aim-assist sensitivity).">
        <DCArtboard id="mg21-set" label="#21 Game settings" {...AB(PHONE.w, PHONE.h)}><MobileDevice w={PHONE.w} h={PHONE.h}><GameSettings surface="mob" /></MobileDevice></DCArtboard>
        <DCArtboard id="mg22-equip" label="#22 Cue Equip" {...AB(PHONE.w, PHONE.h)}><MobileDevice w={PHONE.w} h={PHONE.h}><div className="wf mob"><CueEquip surface="mob" /></div></MobileDevice></DCArtboard>
        <DCArtboard id="mg23-badge" label="#23 Wagered room badge" {...AB(PHONE.w, PHONE.h)}><MobileDevice w={PHONE.w} h={PHONE.h}><RoomBadge surface="mob" /></MobileDevice></DCArtboard>
      </DCSection>

      <DCSection id="chrome-web" title="Round 2 · Chrome & States — Web (1440×900)" subtitle="#27 Telegram launch, #28 splash, #29 empty/error states, #30 onboarding.">
        <DCArtboard id="c28-splash" label="#28 Splash / loading" width={1440} height={900}><Splash surface="web" /></DCArtboard>
        <DCArtboard id="c27-tg" label="#27 Telegram launch cue (TG mark + back-to-chat)" width={1440} height={900}><TGLaunch surface="web" /></DCArtboard>
        <DCArtboard id="c29-tour" label="#29 No tournaments live" width={1440} height={900}><div className="wf web"><StateModal kind="no-tourney" /></div></DCArtboard>
        <DCArtboard id="c29-opp" label="#29 Matchmaking timeout" width={1440} height={900}><div className="wf web"><StateModal kind="no-opp" /></div></DCArtboard>
        <DCArtboard id="c29-dep" label="#29 Wagered deposit failed" width={1440} height={900}><div className="wf web"><StateModal kind="deposit" /></div></DCArtboard>
        <DCArtboard id="c29-settle" label="#29 Settlement settling/failed" width={1440} height={900}><div className="wf web"><StateModal kind="settle" /></div></DCArtboard>
        <DCArtboard id="c30-ob1" label="#30 Onboarding — Aim (1/4)" width={1440} height={900}><div className="wf web"><Onboarding surface="web" step={0} /></div></DCArtboard>
        <DCArtboard id="c30-ob2" label="#30 Onboarding — Power (2/4)" width={1440} height={900}><div className="wf web"><Onboarding surface="web" step={1} /></div></DCArtboard>
      </DCSection>

      <DCSection id="chrome-mob" title="Round 2 · Chrome & States — Mobile (landscape)" subtitle="Same, landscape.">
        <DCArtboard id="mc28-splash" label="#28 Splash" {...AB(PHONE.w, PHONE.h)}><MobileDevice w={PHONE.w} h={PHONE.h}><Splash surface="mob" /></MobileDevice></DCArtboard>
        <DCArtboard id="mc27-tg" label="#27 Telegram launch" {...AB(PHONE.w, PHONE.h)}><MobileDevice w={PHONE.w} h={PHONE.h}><TGLaunch surface="mob" /></MobileDevice></DCArtboard>
        <DCArtboard id="mc29-opp" label="#29 Matchmaking timeout" {...AB(PHONE.w, PHONE.h)}><MobileDevice w={PHONE.w} h={PHONE.h}><div className="wf mob"><StateModal kind="no-opp" /></div></MobileDevice></DCArtboard>
        <DCArtboard id="mc29-dep" label="#29 Deposit failed" {...AB(PHONE.w, PHONE.h)}><MobileDevice w={PHONE.w} h={PHONE.h}><div className="wf mob"><StateModal kind="deposit" /></div></MobileDevice></DCArtboard>
        <DCArtboard id="mc30-ob" label="#30 Onboarding — Aim" {...AB(PHONE.w, PHONE.h)}><MobileDevice w={PHONE.w} h={PHONE.h}><div className="wf mob"><Onboarding surface="mob" step={0} /></div></MobileDevice></DCArtboard>
      </DCSection>

    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<R2App />);