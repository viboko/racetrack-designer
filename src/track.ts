import { bezierTangent, closedSplineBeziers, splineLength } from './geometry';
import { START_DARK, START_LIGHT, type RGB } from './palette';
import { hasTrack, type TrackState } from './state';

/** Width of the red/white kerb on each side of the road. */
export function kerbWidth(roadWidth: number): number {
  return Math.max(5, Math.round(roadWidth * 0.2));
}

/** Total stroke width of road plus kerbs. */
export function outerWidth(roadWidth: number): number {
  return roadWidth + 2 * kerbWidth(roadWidth);
}

/**
 * Length of each kerb stripe, adjusted so a whole number of red/white pairs fits around the loop
 * (so there is no odd-sized stripe where the loop joins).
 */
export function stripeLength(state: TrackState): number {
  const target = kerbWidth(state.roadWidth) * 1.8;
  const length = splineLength(state.controlPoints);
  const pairs = Math.max(2, Math.round(length / (2 * target)));
  return length / (2 * pairs);
}

export interface StartLine {
  /** Centre of the line, in stage units. */
  readonly x: number;
  readonly y: number;
  /** Direction of travel, in radians. */
  readonly angle: number;
  /** Squares in local coordinates: x along the track, y across it. */
  readonly squares: readonly { x: number; y: number; size: number; colour: RGB }[];
}

const START_ROWS = 6;

/** A two-column chequered start/finish line across the road at the first control point. */
export function startLine(state: TrackState): StartLine | null {
  if (!state.showStartLine || !hasTrack(state)) return null;
  const first = closedSplineBeziers(state.controlPoints)[0]!;
  const tangent = bezierTangent(first, 0);
  const size = state.roadWidth / START_ROWS;
  const squares = [];
  for (let col = 0; col < 2; col++) {
    for (let row = 0; row < START_ROWS; row++) {
      squares.push({
        x: (col - 1) * size,
        y: -state.roadWidth / 2 + row * size,
        size,
        colour: (row + col) % 2 === 0 ? START_DARK : START_LIGHT,
      });
    }
  }
  return {
    x: first.p0.x,
    y: first.p0.y,
    angle: Math.atan2(tangent.y, tangent.x),
    squares,
  };
}
