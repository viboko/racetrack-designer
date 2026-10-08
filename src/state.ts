import type { Point } from './geometry';

/** Image size; all track geometry is in these units. */
export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 360;

export const MIN_ROAD_WIDTH = 24;
export const MAX_ROAD_WIDTH = 70;
export const DEFAULT_ROAD_WIDTH = 40;

export interface TrackState {
  readonly controlPoints: readonly Point[];
  readonly roadWidth: number;
  readonly showStartLine: boolean;
}

export const initialState: TrackState = {
  controlPoints: [],
  roadWidth: DEFAULT_ROAD_WIDTH,
  showStartLine: true,
};

export function hasTrack(state: TrackState): boolean {
  return state.controlPoints.length >= 3;
}

export function clampToCanvas(p: Point): Point {
  return {
    x: Math.min(CANVAS_WIDTH, Math.max(0, p.x)),
    y: Math.min(CANVAS_HEIGHT, Math.max(0, p.y)),
  };
}
