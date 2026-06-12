/* DEEPER — core: seeded RNG, palettes, scene generation
   Shared by the painterly and pixel renderers.
   Palettes taken from the Art Brief (Topsoil band + ore core/glow). */
(function (global) {
  'use strict';

  /* ---- seeded RNG (mulberry32) ---- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---- Topsoil band palette (Art Brief §3.1, band 1) ---- */
  const TOPSOIL = {
    dirt:      '#7a5230',
    dirtLo:    '#5e3f24',
    dirtHi:    '#946a44',
    stone:     '#6a6258',
    stoneLo:   '#4d473f',
    stoneHi:   '#8a8275',
    hard:      '#4f4a44',
    hardLo:    '#34302b',
    hardHi:    '#6c655c',
    grass:     '#9be36b',
    grassLo:   '#5fa83f',
    pebble:    '#8d7a5f',
    // sky / surface (dusk -> night, like the reference)
    skyTop:    '#0d1233',
    skyMid:    '#1b1f4a',
    skyHorizon:'#3a2f53',
    caveDark:  '#1c130c',
  };

  /* ---- Ore core + glow (Art Brief §4.1, ores.ts) ---- */
  const ORES = {
    coal:   { core: '#26262b', edge: '#3a3a42', glow: null,       name: 'Coal'   },
    copper: { core: '#c0703a', edge: '#8a4d26', glow: '#ff9d54',  name: 'Copper' },
    gold:   { core: '#f2c33d', edge: '#c9962a', glow: '#ffe27a',  name: 'Gold'   },
  };

  /* ---- Scene authoring ----
     A vertical cross-section: 9 cols x 14 rows of 48px tiles.
     Rows 0-2 sky, row 3 grass cap, below = Topsoil underground.
     A dug tunnel runs down the middle to the pod. Coal/Copper/Gold
     are embedded near the shaft so they read at a glance. */
  const COLS = 9, ROWS = 14, SURFACE_ROW = 3;
  const POD = { col: 4, row: 8 };

  // stone clusters (organic rock pockets) — lists of [col,row]
  const STONE = [
    [6,5],[7,5],[6,6],[7,6],          // right mass
    [1,9],[2,9],[1,10],               // left mass
    [7,10],[7,11],[8,11],             // lower-right
    [3,12],[4,12],[5,12],             // a band lower down
  ];
  const HARD = [[0,13],[1,13],[7,13],[8,13],[4,13]];
  const ORE_PLACE = [
    { col: 3, row: 5, type: 'copper' },
    { col: 5, row: 6, type: 'copper' },
    { col: 2, row: 7, type: 'coal'   },
    { col: 6, row: 9, type: 'coal'   },
    { col: 5, row: 9, type: 'gold'   }, // desire object near the pod
    { col: 3, row: 10, type: 'gold'  },
  ];

  function keyOf(c, r) { return c + ',' + r; }

  function generateScene() {
    const stoneSet = new Set(STONE.map(p => keyOf(p[0], p[1])));
    const hardSet  = new Set(HARD.map(p => keyOf(p[0], p[1])));
    const oreMap   = {};
    ORE_PLACE.forEach(o => { oreMap[keyOf(o.col, o.row)] = o.type; });

    const grid = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        let type;
        if (r < SURFACE_ROW) type = 'sky';
        else if (c === POD.col && r >= SURFACE_ROW && r <= POD.row) type = 'empty'; // dug shaft
        else if (r === SURFACE_ROW) type = 'grass';
        else if (hardSet.has(keyOf(c, r))) type = 'hard';
        else if (stoneSet.has(keyOf(c, r))) type = 'stone';
        else type = 'dirt';
        row.push({ type, ore: oreMap[keyOf(c, r)] || null, c, r });
      }
      grid.push(row);
    }
    return { grid, cols: COLS, rows: ROWS, surfaceRow: SURFACE_ROW, pod: POD };
  }

  /* neighbour-is-rock test for fusing pockets (orthogonal) */
  function isRock(grid, c, r) {
    if (r < 0 || c < 0 || r >= ROWS || c >= COLS) return false;
    const t = grid[r][c].type;
    return t === 'stone' || t === 'hard';
  }

  global.DEEPER = global.DEEPER || {};
  Object.assign(global.DEEPER, {
    mulberry32, TOPSOIL, ORES, generateScene, isRock,
    COLS, ROWS, SURFACE_ROW, POD,
  });
})(window);
