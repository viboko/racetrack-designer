export type RGB = readonly [number, number, number];

/** The only colours a game should treat as "edge of track". */
export const KERB_RED: RGB = [255, 0, 0];
export const KERB_WHITE: RGB = [255, 255, 255];

/** Start/finish chequers: deliberately neither red nor white. */
export const START_DARK: RGB = [20, 20, 20];
export const START_LIGHT: RGB = [240, 200, 0];

/** How far (Euclidean RGB distance) every non-kerb colour must stay from the kerb colours. */
export const KERB_SAFETY_DISTANCE = 120;

export function toHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

export function colourDistance(a: RGB, b: RGB): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export function isNearKerbColour(rgb: RGB, tolerance = KERB_SAFETY_DISTANCE): boolean {
  return colourDistance(rgb, KERB_RED) < tolerance || colourDistance(rgb, KERB_WHITE) < tolerance;
}
