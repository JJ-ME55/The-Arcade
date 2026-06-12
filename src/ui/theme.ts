/** Visual identity + reusable text styles. */

export const COL = {
  // ── DEEPER core palette (warm, earthy, arcade) — matches the DesignHandoff tokens ──
  // Backgrounds are warm near-black (NOT navy). UI steel is brown-bronze, not blue-grey.
  bg: 0x060403, // page background  (handoff --bg #060403)
  panel: 0x1c1812, // riveted-steel panel face  (handoff button low stop)
  panelHi: 0x3b352a, // raised steel highlight    (handoff button high stop)
  border: 0x0c0a07, // near-black hairline edge   (handoff button border)
  borderHi: 0x6e4d12, // gold-brown active border   (handoff gold button border)
  brand: 0xffcf57, // treasure gold              (handoff --gold #ffcf57)
  accent: 0x6fe88a, // phosphor green accent      (handoff --crt) — was teal
  text: 0xe9ddc4, // warm cream body text       (handoff --txt #e9ddc4)
  dim: 0x9b8f76, // warm taupe secondary       (handoff --muted #9b8f76)
  faint: 0x6b6256, // warm faint label           (was cool #6b6b88)
  success: 0x6fe88a, // phosphor green
  danger: 0xff5d48, // breach red                 (handoff --red #ff5d48)
  warn: 0xe0a72a, // amber-gold caution
  cash: 0xffcf57, // gold readouts
  // HUD gauges — match the Dig view exactly: FUEL is orange, HULL is blue.
  fuel: 0xffb24a, // orange fuel gauge          (was green)
  hull: 0x7fd2ff, // blue hull gauge            (was pink)
  cargo: 0x8fe04a, // green cargo count
  heat: 0xff7a2a,
  // CRT phosphor (green screen text on the CGI shells)
  crt: 0x6fe88a,
  crtDim: 0x3f9e52,
} as const;

// DesignHandoff type system: Oxanium for display/UI, Share Tech Mono for numeric readouts.
export const FONT = 'Oxanium, "Segoe UI", system-ui, -apple-system, Arial, sans-serif';
export const MONO = '"Share Tech Mono", "Courier New", ui-monospace, monospace';

export function css(c: number): string {
  return '#' + c.toString(16).padStart(6, '0');
}

/** Monospaced readout style (depth, cash, fuel) — the CRT/instrument numerals. */
export function monoStyle(
  size: number,
  color: number = COL.text,
  opts: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {},
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: MONO,
    fontSize: `${size}px`,
    color: css(color),
    ...opts,
  };
}

export function textStyle(
  size: number,
  color: number = COL.text,
  opts: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {},
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color: css(color),
    fontStyle: 'bold',
    ...opts,
  };
}

export function title(
  size: number,
  color: number = COL.brand,
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color: css(color),
    fontStyle: '900',
  };
}
