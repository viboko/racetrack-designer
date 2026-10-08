import { describe, expect, it } from 'vitest';
import { distance } from '../src/geometry';
import { MAX_CONTROL_POINTS, MIN_CONTROL_POINTS, sketchToControlPoints } from '../src/sketch';
import { circle } from './fixtures';

describe('sketchToControlPoints', () => {
  it('rejects tiny or degenerate sketches', () => {
    expect(sketchToControlPoints([])).toBeNull();
    expect(sketchToControlPoints([{ x: 1, y: 1 }])).toBeNull();
    expect(sketchToControlPoints(circle(100, 100, 5, 50))).toBeNull();
  });

  it('turns a smooth circle into a bounded set of points on the circle', () => {
    const out = sketchToControlPoints(circle(240, 180, 120, 400))!;
    expect(out.length).toBeGreaterThanOrEqual(MIN_CONTROL_POINTS);
    expect(out.length).toBeLessThanOrEqual(MAX_CONTROL_POINTS);
    for (const p of out) expect(distance(p, { x: 240, y: 180 })).toBeCloseTo(120, -1);
  });

  it('caps the point count for a very wiggly sketch', () => {
    const wiggly = Array.from({ length: 2000 }, (_, i) => {
      const a = (i / 2000) * Math.PI * 2;
      const r = 120 + 30 * Math.sin(a * 40);
      return { x: 240 + r * Math.cos(a), y: 180 + r * Math.sin(a) };
    });
    expect(sketchToControlPoints(wiggly)!.length).toBeLessThanOrEqual(MAX_CONTROL_POINTS);
  });

  it('closes an open sketch (a "C" shape) without duplicating the start point', () => {
    const open = circle(240, 180, 120, 400).slice(0, 300);
    const out = sketchToControlPoints(open)!;
    expect(out.length).toBeGreaterThanOrEqual(MIN_CONTROL_POINTS);
    expect(distance(out[0]!, out[out.length - 1]!)).toBeGreaterThan(1);
  });

  it('clamps points to the stage', () => {
    const out = sketchToControlPoints(circle(240, 180, 400, 400))!;
    for (const p of out) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(480);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(360);
    }
  });
});
