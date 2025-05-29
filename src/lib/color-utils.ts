
/**
 * Converts a HEX color string to its HSL components.
 * @param hex The HEX color string (e.g., "#RRGGBB" or "#RGB").
 * @returns An object { h, s, l } with HSL values (0-360, 0-100, 0-100), or null if invalid.
 */
export function hexToHslValues(hex: string): { h: number; s: number; l: number } | null {
  if (!hex || typeof hex !== 'string') return null;

  let r = 0, g = 0, b = 0;
  if (hex.length === 4) { // #RGB format
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) { // #RRGGBB format
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  } else {
    return null; // Invalid hex format
  }

  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;

  const rNormalized = r / 255;
  const gNormalized = g / 255;
  const bNormalized = b / 255;

  const cmax = Math.max(rNormalized, gNormalized, bNormalized);
  const cmin = Math.min(rNormalized, gNormalized, bNormalized);
  const delta = cmax - cmin;

  let h = 0;
  if (delta === 0) {
    h = 0;
  } else if (cmax === rNormalized) {
    h = ((gNormalized - bNormalized) / delta) % 6;
  } else if (cmax === gNormalized) {
    h = (bNormalized - rNormalized) / delta + 2;
  } else {
    h = (rNormalized - gNormalized) / delta + 4;
  }

  h = Math.round(h * 60);
  if (h < 0) h += 360;

  const l = (cmax + cmin) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return {
    h: h,
    s: parseFloat((s * 100).toFixed(1)),
    l: parseFloat((l * 100).toFixed(1)),
  };
}
