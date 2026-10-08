import { describe, expect, it } from 'vitest';
import {
  KERB_RED,
  KERB_WHITE,
  START_DARK,
  START_LIGHT,
  isNearKerbColour,
  toHex,
  type RGB,
} from '../src/palette';
import { generateTexture, type TextureKind } from '../src/textures';

const kinds: TextureKind[] = ['grass', 'asphalt'];

function pixels(kind: TextureKind, size: number, seed?: number): RGB[] {
  const { data } = generateTexture(kind, size, seed);
  const out: RGB[] = [];
  for (let i = 0; i < data.length; i += 4) out.push([data[i]!, data[i + 1]!, data[i + 2]!]);
  return out;
}

describe('palette', () => {
  it('formats hex colours', () => {
    expect(toHex(KERB_RED)).toBe('#ff0000');
    expect(toHex(KERB_WHITE)).toBe('#ffffff');
  });

  it('flags the kerb colours and leaves the start-line colours alone', () => {
    expect(isNearKerbColour(KERB_RED)).toBe(true);
    expect(isNearKerbColour(KERB_WHITE)).toBe(true);
    expect(isNearKerbColour([240, 240, 240])).toBe(true);
    expect(isNearKerbColour(START_DARK)).toBe(false);
    expect(isNearKerbColour(START_LIGHT)).toBe(false);
  });
});

describe('generateTexture', () => {
  it.each(kinds)('%s never contains colours close to the kerb red or white', (kind) => {
    for (const seed of [1, 2, 3, 99, undefined]) {
      const bad = pixels(kind, 120, seed).filter((c) => isNearKerbColour(c));
      expect(bad).toEqual([]);
    }
  });

  it.each(kinds)('%s is opaque and deterministic for a given seed', (kind) => {
    const a = generateTexture(kind, 64, 7);
    const b = generateTexture(kind, 64, 7);
    expect(a.data).toEqual(b.data);
    for (let i = 3; i < a.data.length; i += 4) expect(a.data[i]).toBe(255);
  });

  it('grass is green-dominant and asphalt is grey', () => {
    for (const [r, g, b] of pixels('grass', 64)) {
      expect(g).toBeGreaterThan(r);
      expect(g).toBeGreaterThan(b);
    }
    for (const [r, g, b] of pixels('asphalt', 64)) {
      expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThanOrEqual(3);
    }
  });

  it.each(kinds)('%s tiles seamlessly in both directions', (kind) => {
    const size = 120;
    for (const seed of [1, 2, 3, 5]) {
      const { data } = generateTexture(kind, size, seed);
      const green = (x: number, y: number): number => data[(y * size + x) * 4 + 1]!;
      // Total change between two neighbouring rows (or columns) of pixels.
      const rowStep = (a: number, b: number): number =>
        Array.from({ length: size }, (_, x) => Math.abs(green(x, a) - green(x, b))).reduce(
          (s, v) => s + v,
        );
      const colStep = (a: number, b: number): number =>
        Array.from({ length: size }, (_, y) => Math.abs(green(a, y) - green(b, y))).reduce(
          (s, v) => s + v,
        );
      // The step across the wrap should be no bigger than the steps inside the tile.
      for (const step of [rowStep, colStep]) {
        const inner = Array.from({ length: size - 1 }, (_, i) => step(i, i + 1));
        expect(step(size - 1, 0)).toBeLessThanOrEqual(Math.max(...inner));
      }
    }
  });
});
