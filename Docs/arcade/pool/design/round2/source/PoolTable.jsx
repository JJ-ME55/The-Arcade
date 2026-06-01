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
