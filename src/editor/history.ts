export type HistoryState<T> = {
  past: T[];
  present: T;
  future: T[];
  lastKey: string | null;
  lastTime: number;
};

export const HISTORY_LIMIT = 200;

/** Commits with the same key closer than this merge into one undo step (slider drags, typing). */
export const COALESCE_MS = 1000;

export function initHistory<T>(present: T): HistoryState<T> {
  return { past: [], present, future: [], lastKey: null, lastTime: 0 };
}

export function commitHistory<T>(
  h: HistoryState<T>,
  next: T,
  key: string | null,
  now: number,
): HistoryState<T> {
  if (next === h.present) return h;
  if (key !== null && key === h.lastKey && now - h.lastTime < COALESCE_MS) {
    return { ...h, present: next, future: [], lastTime: now };
  }
  return {
    past: [...h.past, h.present].slice(-HISTORY_LIMIT),
    present: next,
    future: [],
    lastKey: key,
    lastTime: now,
  };
}

export function undoHistory<T>(h: HistoryState<T>): HistoryState<T> {
  if (h.past.length === 0) return h;
  return {
    past: h.past.slice(0, -1),
    present: h.past[h.past.length - 1],
    future: [h.present, ...h.future],
    lastKey: null,
    lastTime: 0,
  };
}

export function redoHistory<T>(h: HistoryState<T>): HistoryState<T> {
  if (h.future.length === 0) return h;
  return {
    past: [...h.past, h.present],
    present: h.future[0],
    future: h.future.slice(1),
    lastKey: null,
    lastTime: 0,
  };
}
