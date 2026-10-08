import { drawTrack, textureTile } from './render';
import { STAGE_HEIGHT, STAGE_WIDTH, type TrackState } from './state';
import { buildSvg } from './svg';

/** Texture tiles in the SVG are embedded at 2×, matching Scratch's bitmap resolution. */
const SVG_TEXTURE_SCALE = 2;

export function renderPng(state: TrackState, scale: number): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = STAGE_WIDTH * scale;
  canvas.height = STAGE_HEIGHT * scale;
  drawTrack(canvas.getContext('2d')!, state, scale);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('PNG export failed'))),
      'image/png',
    ),
  );
}

export function renderSvg(state: TrackState): Blob {
  const svg = buildSvg(state, {
    grass: textureTile('grass', SVG_TEXTURE_SCALE).toDataURL('image/png'),
    asphalt: textureTile('asphalt', SVG_TEXTURE_SCALE).toDataURL('image/png'),
  });
  return new Blob([svg], { type: 'image/svg+xml' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
