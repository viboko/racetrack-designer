import { closedSplineBeziers, type Point } from './geometry';
import { KERB_RED, KERB_WHITE, toHex } from './palette';
import { STAGE_HEIGHT, STAGE_WIDTH, hasTrack, type TrackState } from './state';
import { TEXTURE_TILE, generateTexture, type TextureKind } from './textures';
import { outerWidth, startLine, stripeLength } from './track';

const tileCache = new Map<string, HTMLCanvasElement>();

/** A canvas holding one texture tile at `scale` pixels per stage unit (cached). */
export function textureTile(kind: TextureKind, scale: number): HTMLCanvasElement {
  const key = `${kind}@${scale}`;
  let tile = tileCache.get(key);
  if (!tile) {
    const size = Math.round(TEXTURE_TILE * scale);
    const pixels = generateTexture(kind, size);
    tile = document.createElement('canvas');
    tile.width = size;
    tile.height = size;
    tile.getContext('2d')!.putImageData(new ImageData(pixels.data, size, size), 0, 0);
    tileCache.set(key, tile);
  }
  return tile;
}

function texturePattern(
  ctx: CanvasRenderingContext2D,
  kind: TextureKind,
  scale: number,
): CanvasPattern {
  const pattern = ctx.createPattern(textureTile(kind, scale), 'repeat')!;
  // The context is scaled to stage units; undo that so tile pixels map 1:1 to canvas pixels.
  pattern.setTransform(new DOMMatrix().scale(1 / scale));
  return pattern;
}

export function traceSpline(ctx: CanvasRenderingContext2D, points: readonly Point[]): void {
  const segments = closedSplineBeziers(points);
  ctx.beginPath();
  ctx.moveTo(segments[0]!.p0.x, segments[0]!.p0.y);
  for (const s of segments) ctx.bezierCurveTo(s.c1.x, s.c1.y, s.c2.x, s.c2.y, s.p3.x, s.p3.y);
  ctx.closePath();
}

/**
 * Draw the finished track (no editing handles) onto a canvas that is `scale` pixels per stage
 * unit. Layer order matters: kerbs first, road on top, so crossings become clean junctions.
 */
export function drawTrack(ctx: CanvasRenderingContext2D, state: TrackState, scale: number): void {
  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = texturePattern(ctx, 'grass', scale);
  ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);

  if (hasTrack(state)) {
    const outer = outerWidth(state.roadWidth);
    traceSpline(ctx, state.controlPoints);
    ctx.lineJoin = 'round';

    ctx.lineCap = 'round';
    ctx.lineWidth = outer;
    ctx.strokeStyle = toHex(KERB_WHITE);
    ctx.stroke();

    const stripe = stripeLength(state);
    ctx.lineCap = 'butt';
    ctx.setLineDash([stripe, stripe]);
    ctx.strokeStyle = toHex(KERB_RED);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.lineCap = 'round';
    ctx.lineWidth = state.roadWidth;
    ctx.strokeStyle = texturePattern(ctx, 'asphalt', scale);
    ctx.stroke();

    const line = startLine(state);
    if (line) {
      ctx.translate(line.x, line.y);
      ctx.rotate(line.angle);
      for (const s of line.squares) {
        ctx.fillStyle = toHex(s.colour);
        ctx.fillRect(s.x, s.y, s.size, s.size);
      }
    }
  }
  ctx.restore();
}
