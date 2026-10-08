/** Linear undo history of immutable snapshots. */
export class History<T> {
  private past: T[] = [];
  private current: T;

  constructor(initial: T) {
    this.current = deepFreeze(initial);
  }

  get present(): T {
    return this.current;
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  push(next: T): void {
    this.past.push(this.current);
    this.current = deepFreeze(next);
  }

  undo(): T {
    const prev = this.past.pop();
    if (prev !== undefined) this.current = prev;
    return this.current;
  }
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
