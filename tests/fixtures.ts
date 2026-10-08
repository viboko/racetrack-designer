import type { Point } from '../src/geometry';

/** Points evenly spaced around a circle (no repeated end point). */
export function circle(cx: number, cy: number, r: number, n: number): Point[] {
  return Array.from({ length: n }, (_, i) => ({
    x: cx + r * Math.cos((i / n) * Math.PI * 2),
    y: cy + r * Math.sin((i / n) * Math.PI * 2),
  }));
}
