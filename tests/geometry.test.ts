import { describe, expect, it } from 'vitest';
import {
  bezierPoint,
  closedSplineBeziers,
  distance,
  nearestPointIndex,
  nearestSegment,
  polylineLength,
  resample,
  sampleClosedSpline,
  simplifyClosed,
  simplifyRdp,
  splinePathData,
} from '../src/geometry';
import { circle } from './fixtures';

describe('resample', () => {
  it('produces evenly spaced points along a polyline', () => {
    const line = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    const out = resample(line, 2);
    expect(out).toHaveLength(11);
    for (let i = 1; i < out.length; i++) expect(distance(out[i - 1]!, out[i]!)).toBeCloseTo(2);
    expect(out[out.length - 1]).toEqual({ x: 10, y: 10 });
  });

  it('handles empty input', () => {
    expect(resample([], 5)).toEqual([]);
  });
});

describe('simplifyRdp', () => {
  it('keeps corners and drops collinear points', () => {
    const l = [
      { x: 0, y: 0 },
      { x: 5, y: 0.1 },
      { x: 10, y: 0 },
      { x: 10, y: 5 },
      { x: 10, y: 10 },
    ];
    expect(simplifyRdp(l, 1)).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ]);
  });
});

describe('simplifyClosed', () => {
  it('reduces a dense square loop to its four corners', () => {
    const square = resample(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
        { x: 0, y: 0 },
      ],
      5,
    ).slice(0, -1);
    const out = simplifyClosed(square, 1);
    expect(out).toHaveLength(4);
    expect(out).toEqual(
      expect.arrayContaining([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ]),
    );
  });
});

describe('closed Catmull-Rom spline', () => {
  const pts = circle(200, 150, 80, 8);

  it('has one segment per control point and passes through every point', () => {
    const segs = closedSplineBeziers(pts);
    expect(segs).toHaveLength(8);
    segs.forEach((s, i) => {
      expect(bezierPoint(s, 0)).toEqual(pts[i]);
      expect(bezierPoint(s, 1)).toEqual(pts[(i + 1) % 8]);
    });
  });

  it('is closed and approximates the circle', () => {
    const samples = sampleClosedSpline(pts);
    expect(samples[0]).toEqual(samples[samples.length - 1]);
    for (const p of samples) expect(distance(p, { x: 200, y: 150 })).toBeCloseTo(80, -1);
    expect(polylineLength(samples)).toBeCloseTo(2 * Math.PI * 80, -1);
  });

  it('needs at least three points', () => {
    expect(closedSplineBeziers(pts.slice(0, 2))).toEqual([]);
    expect(splinePathData(pts.slice(0, 2))).toBe('');
  });

  it('emits closed SVG path data', () => {
    const d = splinePathData(pts);
    expect(d.startsWith('M280 150 C')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(d.match(/C/g)).toHaveLength(8);
  });
});

describe('hit testing', () => {
  const pts = circle(200, 150, 80, 8);

  it('finds the nearest point within a radius', () => {
    expect(nearestPointIndex(pts, { x: 283, y: 151 }, 10)).toBe(0);
    expect(nearestPointIndex(pts, { x: 200, y: 150 }, 10)).toBe(-1);
  });

  it('finds the nearest segment', () => {
    // Midway between points 0 (angle 0) and 1 (angle 45°).
    const a = Math.PI / 8;
    const seg = nearestSegment(pts, { x: 200 + 80 * Math.cos(a), y: 150 + 80 * Math.sin(a) });
    expect(seg?.index).toBe(0);
    expect(seg!.distance).toBeLessThan(2);
  });
});
