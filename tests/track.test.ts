// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { splineLength } from '../src/geometry';
import { initialState, type TrackState } from '../src/state';
import { buildSvg } from '../src/svg';
import { kerbWidth, outerWidth, startLine, stripeLength } from '../src/track';
import { circle } from './fixtures';

const track: TrackState = {
  controlPoints: circle(240, 180, 120, 8),
  roadWidth: 40,
  showStartLine: true,
};
const tiles = { grass: 'data:image/png;base64,AAAA', asphalt: 'data:image/png;base64,BBBB' };

function parse(svg: string): Document {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  expect(doc.querySelector('parsererror')).toBeNull();
  return doc;
}

describe('track layout', () => {
  it('scales the kerb with the road', () => {
    expect(kerbWidth(40)).toBe(8);
    expect(kerbWidth(10)).toBe(5);
    expect(outerWidth(40)).toBe(56);
  });

  it('fits a whole number of stripe pairs around the loop', () => {
    const pairs = splineLength(track.controlPoints) / (2 * stripeLength(track));
    expect(pairs).toBeCloseTo(Math.round(pairs), 6);
  });

  it('places a chequered start line across the road at the first point', () => {
    const line = startLine(track)!;
    expect(line.x).toBeCloseTo(360);
    expect(line.y).toBeCloseTo(180);
    expect(line.angle).toBeCloseTo(Math.PI / 2, 1); // moving down at the rightmost point
    expect(line.squares).toHaveLength(12);
    const ys = line.squares.map((s) => s.y);
    expect(Math.min(...ys)).toBeCloseTo(-20);
    expect(Math.max(...ys) + line.squares[0]!.size).toBeCloseTo(20);
    expect(startLine({ ...track, showStartLine: false })).toBeNull();
  });
});

describe('buildSvg', () => {
  it('produces a valid SVG with red and white kerbs and a textured road', () => {
    const doc = parse(buildSvg(track, tiles));
    const svg = doc.documentElement;
    expect(svg.getAttribute('viewBox')).toBe('0 0 480 360');
    const kerbStrokes = [...doc.querySelectorAll('path.kerb')].map((p) => p.getAttribute('stroke'));
    expect(kerbStrokes).toEqual(['#ffffff', '#ff0000']);
    expect(doc.querySelector('path.road')?.getAttribute('stroke')).toBe('url(#asphalt)');
    expect(doc.querySelectorAll('pattern image')).toHaveLength(2);
    expect(doc.querySelectorAll('g.start-line rect')).toHaveLength(12);
  });

  it('omits the start line when disabled', () => {
    const doc = parse(buildSvg({ ...track, showStartLine: false }, tiles));
    expect(doc.querySelector('g.start-line')).toBeNull();
  });

  it('draws only grass when there is no track', () => {
    const doc = parse(buildSvg(initialState, tiles));
    expect(doc.querySelectorAll('path')).toHaveLength(0);
    expect(doc.querySelector('rect')?.getAttribute('fill')).toBe('url(#grass)');
  });
});
