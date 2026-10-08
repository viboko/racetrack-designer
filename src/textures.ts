import { mulberry32 } from './prng';

export type TextureKind = 'grass' | 'asphalt';

/** Size of one texture tile in canvas units. Textures tile seamlessly at this period. */
export const TEXTURE_TILE = 120;

export const TEXTURE_SEEDS: Record<TextureKind, number> = { grass: 1337, asphalt: 4242 };

export interface PixelBuffer {
  readonly width: number;
  readonly height: number;
  /** RGBA, row-major, like ImageData.data. */
  readonly data: Uint8ClampedArray<ArrayBuffer>;
}

/** Colour ranges, chosen to stay far from the red/white kerb colours (see palette tests). */
const GRASS = { r: [30, 110], g: [80, 170], b: [15, 70] } as const;
const ASPHALT = [62, 125] as const;

const clamp = (v: number, [lo, hi]: readonly [number, number]): number =>
  Math.min(hi, Math.max(lo, Math.round(v)));

/** Cell counts across (x) and down (y) the tile for one noise layer. */
type Cells = readonly [number, number];

/** Value noise that wraps with period 1 in both u and v, so tiles join seamlessly. */
function periodicNoise(rand: () => number, [cx, cy]: Cells): (u: number, v: number) => number {
  const grid = Float32Array.from({ length: cx * cy }, () => rand());
  const at = (ix: number, iy: number): number => grid[(iy % cy) * cx + (ix % cx)]!;
  const smooth = (t: number): number => t * t * (3 - 2 * t);
  return (u, v) => {
    const x = u * cx;
    const y = v * cy;
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = smooth(x - ix);
    const fy = smooth(y - iy);
    const top = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * fx;
    const bottom = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * fx;
    return top + (bottom - top) * fy;
  };
}

/** Fractal noise in [0, 1], periodic over the tile. */
function fractalNoise(rand: () => number, layerCells: readonly Cells[]) {
  const layers = layerCells.map((c) => periodicNoise(rand, c));
  const weights = layerCells.map((_, i) => 1 / 2 ** i);
  const total = weights.reduce((a, b) => a + b, 0);
  return (u: number, v: number): number =>
    layers.reduce((sum, layer, i) => sum + layer(u, v) * weights[i]!, 0) / total;
}

/** Generate a square, seamlessly tiling texture `size` pixels across. */
export function generateTexture(
  kind: TextureKind,
  size: number,
  seed = TEXTURE_SEEDS[kind],
): PixelBuffer {
  const rand = mulberry32(seed);
  const data = new Uint8ClampedArray(size * size * 4);
  const patches = fractalNoise(rand, [
    [3, 3],
    [6, 6],
    [12, 12],
  ]);
  // Grass gets tall, narrow noise cells for a hint of blades; asphalt gets fine round grain.
  const detail =
    kind === 'grass'
      ? fractalNoise(rand, [
          [40, 10],
          [80, 20],
        ])
      : fractalNoise(rand, [
          [30, 30],
          [60, 60],
        ]);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const low = patches(u, v);
      const mid = detail(u, v);
      const grain = rand() - 0.5;
      const i = (y * size + x) * 4;
      if (kind === 'grass') {
        const shade = (low - 0.5) * 50 + (mid - 0.5) * 40 + grain * 24;
        data[i] = clamp(68 + shade * 0.6, GRASS.r);
        data[i + 1] = clamp(128 + shade, GRASS.g);
        data[i + 2] = clamp(40 + shade * 0.3, GRASS.b);
      } else {
        const speckle = rand() < 0.03 ? 14 : 0;
        const value = 92 + (low - 0.5) * 22 + (mid - 0.5) * 16 + grain * 26 + speckle;
        data[i] = clamp(value, ASPHALT);
        data[i + 1] = clamp(value, ASPHALT);
        data[i + 2] = clamp(value + 3, ASPHALT);
      }
      data[i + 3] = 255;
    }
  }
  return { width: size, height: size, data };
}
