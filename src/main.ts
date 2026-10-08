import './style.css';
import { nearestPointIndex, nearestSegment, type Point } from './geometry';
import { downloadBlob, renderPng, renderSvg } from './download';
import { History } from './history';
import { drawTrack } from './render';
import { sketchToControlPoints } from './sketch';
import {
  MAX_ROAD_WIDTH,
  MIN_ROAD_WIDTH,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  clampToStage,
  hasTrack,
  initialState,
  type TrackState,
} from './state';
import { outerWidth } from './track';

/** On-screen canvas resolution, in pixels per stage unit. */
const DISPLAY_SCALE = 2;
const MIN_POINTS_AFTER_DELETE = 4;

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('stage');
const ctx = canvas.getContext('2d')!;
const hint = $('hint');
const widthInput = $<HTMLInputElement>('width');
const startInput = $<HTMLInputElement>('start-line');
const handlesInput = $<HTMLInputElement>('show-points');
const undoButton = $<HTMLButtonElement>('undo');
const clearButton = $<HTMLButtonElement>('clear');
const downloadButtons = document.querySelectorAll<HTMLButtonElement>('[data-download]');

canvas.width = STAGE_WIDTH * DISPLAY_SCALE;
canvas.height = STAGE_HEIGHT * DISPLAY_SCALE;
widthInput.min = String(MIN_ROAD_WIDTH);
widthInput.max = String(MAX_ROAD_WIDTH);

const history = new History<TrackState>(initialState);
/** What is on screen: the committed state, or a live preview during a drag or slider move. */
let draft: TrackState = history.present;

type Gesture =
  { kind: 'sketch'; points: Point[] } | { kind: 'drag'; index: number; moved: boolean } | null;
let gesture: Gesture = null;
let hoverIndex = -1;

function commit(next: TrackState): void {
  if (next !== history.present) history.push(next);
  draft = history.present;
  syncControls();
  render();
}

function syncControls(): void {
  widthInput.value = String(draft.roadWidth);
  startInput.checked = draft.showStartLine;
  undoButton.disabled = !history.canUndo;
  clearButton.disabled = !hasTrack(history.present);
  downloadButtons.forEach((b) => (b.disabled = !hasTrack(history.present)));
  hint.hidden = hasTrack(draft) || gesture?.kind === 'sketch';
}

function render(): void {
  drawTrack(ctx, draft, DISPLAY_SCALE);
  ctx.save();
  ctx.setTransform(DISPLAY_SCALE, 0, 0, DISPLAY_SCALE, 0, 0);

  if (gesture?.kind === 'sketch' && gesture.points.length > 1) {
    ctx.beginPath();
    gesture.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = draft.roadWidth;
    ctx.strokeStyle = 'rgba(70, 70, 70, 0.6)';
    ctx.stroke();
  }

  if (handlesInput.checked && hasTrack(draft)) {
    draft.controlPoints.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, i === hoverIndex ? 6.5 : 5, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#3b82f6' : 'rgba(30, 30, 30, 0.85)';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#facc15';
      ctx.stroke();
    });
  }
  ctx.restore();
}

function toStage(e: MouseEvent): Point {
  const rect = canvas.getBoundingClientRect();
  return clampToStage({
    x: ((e.clientX - rect.left) / rect.width) * STAGE_WIDTH,
    y: ((e.clientY - rect.top) / rect.height) * STAGE_HEIGHT,
  });
}

function hitRadius(e: PointerEvent | MouseEvent): number {
  return 'pointerType' in e && e.pointerType === 'touch' ? 18 : 10;
}

canvas.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  const p = toStage(e);
  if (!hasTrack(draft)) {
    gesture = { kind: 'sketch', points: [p] };
  } else {
    const index = nearestPointIndex(draft.controlPoints, p, hitRadius(e));
    if (index < 0) return;
    gesture = { kind: 'drag', index, moved: false };
  }
  canvas.setPointerCapture(e.pointerId);
  syncControls();
  render();
});

canvas.addEventListener('pointermove', (e) => {
  const p = toStage(e);
  if (gesture?.kind === 'sketch') {
    gesture.points.push(p);
  } else if (gesture?.kind === 'drag') {
    const points = [...draft.controlPoints];
    points[gesture.index] = p;
    draft = { ...draft, controlPoints: points };
    gesture.moved = true;
  } else {
    const index = hasTrack(draft) ? nearestPointIndex(draft.controlPoints, p, hitRadius(e)) : -1;
    canvas.style.cursor = index >= 0 ? 'grab' : hasTrack(draft) ? 'default' : 'crosshair';
    if (index === hoverIndex) return;
    hoverIndex = index;
  }
  render();
});

function endGesture(): void {
  const done = gesture;
  gesture = null;
  if (done?.kind === 'sketch') {
    const controlPoints = sketchToControlPoints(done.points);
    if (controlPoints) {
      commit({ ...draft, controlPoints });
    } else {
      hint.textContent = 'That was a bit small. Draw a bigger loop!';
      syncControls();
      render();
    }
  } else if (done?.kind === 'drag' && done.moved) {
    commit(draft);
  }
}

canvas.addEventListener('pointerup', endGesture);
canvas.addEventListener('pointercancel', () => {
  gesture = null;
  draft = history.present;
  syncControls();
  render();
});

canvas.addEventListener('dblclick', (e) => {
  if (!hasTrack(draft)) return;
  const p = toStage(e);
  const points = [...draft.controlPoints];
  const index = nearestPointIndex(points, p, hitRadius(e));
  if (index >= 0) {
    if (points.length <= MIN_POINTS_AFTER_DELETE) return;
    points.splice(index, 1);
    hoverIndex = -1;
  } else {
    const seg = nearestSegment(points, p);
    if (!seg || seg.distance > outerWidth(draft.roadWidth) / 2 + 6) return;
    points.splice(seg.index + 1, 0, p);
  }
  commit({ ...draft, controlPoints: points });
});

widthInput.addEventListener('input', () => {
  draft = { ...history.present, roadWidth: Number(widthInput.value) };
  render();
});
widthInput.addEventListener('change', () => commit(draft));
startInput.addEventListener('change', () =>
  commit({ ...history.present, showStartLine: startInput.checked }),
);
handlesInput.addEventListener('change', render);

function undo(): void {
  if (gesture) return;
  draft = history.undo();
  hint.textContent = 'Draw a loop';
  syncControls();
  render();
}

undoButton.addEventListener('click', undo);
clearButton.addEventListener('click', () => {
  hint.textContent = 'Draw a loop';
  commit({ ...history.present, controlPoints: [] });
});
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    undo();
  }
});

downloadButtons.forEach((button) =>
  button.addEventListener('click', async () => {
    const state = history.present;
    const kind = button.dataset.download;
    if (kind === 'svg') {
      downloadBlob(renderSvg(state), 'track.svg');
    } else {
      const scale = kind === 'png2x' ? 2 : 1;
      downloadBlob(await renderPng(state, scale), scale === 2 ? 'track@2x.png' : 'track.png');
    }
  }),
);

syncControls();
render();
