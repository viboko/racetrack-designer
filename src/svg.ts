import { splinePathData } from './geometry';
import { KERB_RED, KERB_WHITE, toHex } from './palette';
import { STAGE_HEIGHT, STAGE_WIDTH, hasTrack, type TrackState } from './state';
import { TEXTURE_TILE, type TextureKind } from './textures';
import { outerWidth, startLine, stripeLength } from './track';

const round = (v: number): number => Math.round(v * 1000) / 1000;

function patternDef(id: TextureKind, href: string): string {
  const t = TEXTURE_TILE;
  return (
    `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${t}" height="${t}">` +
    `<image width="${t}" height="${t}" href="${href}" xlink:href="${href}"/>` +
    `</pattern>`
  );
}

/**
 * Build an SVG of the track. Kerbs and road are vector paths; the grass and asphalt textures are
 * embedded as tiling image patterns (`tiles` holds a data URL for each).
 */
export function buildSvg(state: TrackState, tiles: Record<TextureKind, string>): string {
  const body: string[] = [
    `<rect width="${STAGE_WIDTH}" height="${STAGE_HEIGHT}" fill="url(#grass)"/>`,
  ];

  if (hasTrack(state)) {
    const d = splinePathData(state.controlPoints);
    const stroke = `fill="none" stroke-linejoin="round"`;
    const outer = outerWidth(state.roadWidth);
    const stripe = round(stripeLength(state));
    body.push(
      `<path class="kerb" d="${d}" ${stroke} stroke="${toHex(KERB_WHITE)}" stroke-width="${outer}" stroke-linecap="round"/>`,
      `<path class="kerb" d="${d}" ${stroke} stroke="${toHex(KERB_RED)}" stroke-width="${outer}" ` +
        `stroke-linecap="butt" stroke-dasharray="${stripe} ${stripe}"/>`,
      `<path class="road" d="${d}" ${stroke} stroke="url(#asphalt)" stroke-width="${state.roadWidth}" stroke-linecap="round"/>`,
    );
    const line = startLine(state);
    if (line) {
      const deg = round((line.angle * 180) / Math.PI);
      const rects = line.squares
        .map(
          (s) =>
            `<rect x="${round(s.x)}" y="${round(s.y)}" width="${round(s.size)}" ` +
            `height="${round(s.size)}" fill="${toHex(s.colour)}"/>`,
        )
        .join('');
      body.push(
        `<g class="start-line" transform="translate(${round(line.x)} ${round(line.y)}) rotate(${deg})">${rects}</g>`,
      );
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `width="${STAGE_WIDTH}" height="${STAGE_HEIGHT}" viewBox="0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}">` +
    `<defs>${patternDef('grass', tiles.grass)}${patternDef('asphalt', tiles.asphalt)}</defs>` +
    body.join('') +
    `</svg>`
  );
}
