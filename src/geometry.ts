export interface Point {
  readonly x: number;
  readonly y: number;
}

/** A cubic Bézier segment: start, two control points, end. */
export interface Bezier {
  readonly p0: Point;
  readonly c1: Point;
  readonly c2: Point;
  readonly p3: Point;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function polylineLength(points: readonly Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += distance(points[i - 1]!, points[i]!);
  }
  return total;
}

function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Resample a polyline so consecutive points are `spacing` apart (the last point is always kept). */
export function resample(points: readonly Point[], spacing: number): Point[] {
  if (points.length === 0) return [];
  const first = points[0]!;
  const out: Point[] = [first];
  let prev = first;
  let carried = 0; // distance travelled since the last emitted point
  for (let i = 1; i < points.length; i++) {
    const next = points[i]!;
    let segStart = prev;
    let segLen = distance(segStart, next);
    while (carried + segLen >= spacing && segLen > 0) {
      const t = (spacing - carried) / segLen;
      const p = lerp(segStart, next, t);
      out.push(p);
      segStart = p;
      segLen = distance(segStart, next);
      carried = 0;
    }
    carried += segLen;
    prev = next;
  }
  const last = points[points.length - 1]!;
  if (distance(out[out.length - 1]!, last) > 1e-9) out.push(last);
  return out;
}

function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const len = distance(a, b);
  if (len === 0) return distance(p, a);
  return Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / len;
}

/** Ramer–Douglas–Peucker simplification of an open polyline. */
export function simplifyRdp(points: readonly Point[], epsilon: number): Point[] {
  if (points.length < 3) return [...points];
  const first = points[0]!;
  const last = points[points.length - 1]!;
  let maxDist = -1;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i]!, first, last);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }
  if (maxDist <= epsilon) return [first, last];
  const left = simplifyRdp(points.slice(0, index + 1), epsilon);
  const right = simplifyRdp(points.slice(index), epsilon);
  return [...left.slice(0, -1), ...right];
}

/**
 * Simplify a closed loop (given without a repeated end point). The loop is split at the point
 * farthest from the first so RDP has two well-defined open halves to work on.
 */
export function simplifyClosed(points: readonly Point[], epsilon: number): Point[] {
  if (points.length < 4) return [...points];
  const first = points[0]!;
  let far = 1;
  for (let i = 2; i < points.length; i++) {
    if (distance(points[i]!, first) > distance(points[far]!, first)) far = i;
  }
  const a = simplifyRdp(points.slice(0, far + 1), epsilon);
  const b = simplifyRdp([...points.slice(far), first], epsilon);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

/**
 * Convert a closed loop of control points into Bézier segments forming a uniform Catmull-Rom
 * spline that passes through every control point. Segment i runs from point i to point i+1.
 */
export function closedSplineBeziers(points: readonly Point[]): Bezier[] {
  const n = points.length;
  if (n < 3) return [];
  const at = (i: number): Point => points[((i % n) + n) % n]!;
  const out: Bezier[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    out.push({
      p0: p1,
      c1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      c2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
      p3: p2,
    });
  }
  return out;
}

export function bezierPoint(b: Bezier, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const c = 3 * u * u * t;
  const d = 3 * u * t * t;
  const e = t * t * t;
  return {
    x: a * b.p0.x + c * b.c1.x + d * b.c2.x + e * b.p3.x,
    y: a * b.p0.y + c * b.c1.y + d * b.c2.y + e * b.p3.y,
  };
}

/** Unnormalised derivative of a Bézier segment at t. */
export function bezierTangent(b: Bezier, t: number): Point {
  const u = 1 - t;
  return {
    x:
      3 * u * u * (b.c1.x - b.p0.x) + 6 * u * t * (b.c2.x - b.c1.x) + 3 * t * t * (b.p3.x - b.c2.x),
    y:
      3 * u * u * (b.c1.y - b.p0.y) + 6 * u * t * (b.c2.y - b.c1.y) + 3 * t * t * (b.p3.y - b.c2.y),
  };
}

/** Sample a closed spline as a polyline; the first point is repeated at the end. */
export function sampleClosedSpline(points: readonly Point[], samplesPerSegment = 16): Point[] {
  const segments = closedSplineBeziers(points);
  if (segments.length === 0) return [];
  const out: Point[] = [];
  for (const seg of segments) {
    for (let s = 0; s < samplesPerSegment; s++) out.push(bezierPoint(seg, s / samplesPerSegment));
  }
  out.push(out[0]!);
  return out;
}

export function splineLength(points: readonly Point[]): number {
  return polylineLength(sampleClosedSpline(points, 32));
}

/** SVG path data for the closed spline through `points`. */
export function splinePathData(points: readonly Point[]): string {
  const segments = closedSplineBeziers(points);
  if (segments.length === 0) return '';
  const f = (v: number): string => String(Math.round(v * 100) / 100);
  const parts = [`M${f(segments[0]!.p0.x)} ${f(segments[0]!.p0.y)}`];
  for (const s of segments) {
    parts.push(`C${f(s.c1.x)} ${f(s.c1.y)} ${f(s.c2.x)} ${f(s.c2.y)} ${f(s.p3.x)} ${f(s.p3.y)}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

/** Index of the nearest point within `radius` of `target`, or -1. */
export function nearestPointIndex(points: readonly Point[], target: Point, radius: number): number {
  let best = -1;
  let bestDist = radius;
  points.forEach((p, i) => {
    const d = distance(p, target);
    if (d <= bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}

/**
 * Find the spline segment nearest `target`. Returns the segment index (a new point belongs after
 * control point `index`) and the distance, or null when the spline is empty.
 */
export function nearestSegment(
  points: readonly Point[],
  target: Point,
): { index: number; distance: number } | null {
  const segments = closedSplineBeziers(points);
  let best: { index: number; distance: number } | null = null;
  segments.forEach((seg, index) => {
    for (let s = 0; s <= 24; s++) {
      const d = distance(bezierPoint(seg, s / 24), target);
      if (best === null || d < best.distance) best = { index, distance: d };
    }
  });
  return best;
}
