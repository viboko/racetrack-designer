import { describe, expect, it } from 'vitest';
import { History } from '../src/history';

describe('History', () => {
  it('pushes and undoes snapshots in order', () => {
    const h = new History({ n: 0 });
    expect(h.canUndo).toBe(false);
    h.push({ n: 1 });
    h.push({ n: 2 });
    expect(h.present).toEqual({ n: 2 });
    expect(h.undo()).toEqual({ n: 1 });
    expect(h.undo()).toEqual({ n: 0 });
    expect(h.canUndo).toBe(false);
    expect(h.undo()).toEqual({ n: 0 });
  });

  it('freezes snapshots deeply', () => {
    const h = new History({ points: [{ x: 1 }] });
    expect(Object.isFrozen(h.present)).toBe(true);
    expect(Object.isFrozen(h.present.points)).toBe(true);
    expect(Object.isFrozen(h.present.points[0])).toBe(true);
  });
});
