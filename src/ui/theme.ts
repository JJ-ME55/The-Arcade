/** Visual identity + reusable text styles. */

export const COL = {
  bg: 0x0a0a14,
  panel: 0x141426,
  panelHi: 0x1c1c34,
  border: 0x2e2e50,
  borderHi: 0x4a4a78,
  brand: 0xffcf4d,
  accent: 0x5fe0d0,
  text: 0xeaeaf2,
  dim: 0x9a9ab0,
  faint: 0x6b6b88,
  success: 0x6bff9d,
  danger: 0xff6b8a,
  warn: 0xffb347,
  cash: 0xffcf4d,
  fuel: 0x6bd66b,
  hull: 0xff6b8a,
  cargo: 0x7db7ff,
  heat: 0xff7a2a,
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
