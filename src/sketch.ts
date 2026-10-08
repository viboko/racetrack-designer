import { distance, polylineLength, resample, simplifyClosed, type Point } from './geometry';
import { clampToCanvas } from './state';

export const MIN_CONTROL_POINTS = 6;
export const MAX_CONTROL_POINTS = 24;
const MIN_SKETCH_LENGTH = 120;
const MIN_SKETCH_SPAN = 30;

/**
 * Turn a freehand sketch into control points for a closed spline. The sketch is closed by joining
 * its end back to its start. Returns null when the sketch is too small to make a track from.
 */
export function sketchToControlPoints(raw: readonly Point[]): Point[] | null {
  const points = raw.map(clampToCanvas);
  if (points.length < 3 || polylineLength(points) < MIN_SKETCH_LENGTH) return null;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  if (span < MIN_SKETCH_SPAN) return null;

  // Close the loop, then resample so RDP sees evenly spaced input.
  const closed = [...points, points[0]!];
  const even = resample(closed, 3);
  if (distance(even[0]!, even[even.length - 1]!) < 1e-6) even.pop();

  let epsilon = 10;
  let simplified = simplifyClosed(even, epsilon);
  while (simplified.length > MAX_CONTROL_POINTS) {
    epsilon *= 1.25;
    simplified = simplifyClosed(even, epsilon);
  }
  if (simplified.length >= MIN_CONTROL_POINTS) return simplified;

  // Too few corners (e.g. a smooth oval): space points evenly around the loop instead.
  const loop = [...even, even[0]!];
  const spacing = polylineLength(loop) / MIN_CONTROL_POINTS;
  return resample(loop, spacing).slice(0, MIN_CONTROL_POINTS);
}
