/** Immutable history stack for undo/redo of floor layout drafts. */

export interface HistoryState<T> {
  past: T[]
  present: T
  future: T[]
}

export function createHistory<T>(initial: T): HistoryState<T> {
  return { past: [], present: initial, future: [] }
}

export function pushHistory<T>(state: HistoryState<T>, next: T, limit = 50): HistoryState<T> {
  if (Object.is(state.present, next)) return state
  const past = [...state.past, state.present]
  if (past.length > limit) past.splice(0, past.length - limit)
  return { past, present: next, future: [] }
}

export function undoHistory<T>(state: HistoryState<T>): HistoryState<T> {
  if (state.past.length === 0) return state
  const previous = state.past[state.past.length - 1]
  return {
    past: state.past.slice(0, -1),
    present: previous,
    future: [state.present, ...state.future],
  }
}

export function redoHistory<T>(state: HistoryState<T>): HistoryState<T> {
  if (state.future.length === 0) return state
  const [next, ...rest] = state.future
  return {
    past: [...state.past, state.present],
    present: next,
    future: rest,
  }
}

export function canUndo<T>(state: HistoryState<T>): boolean {
  return state.past.length > 0
}

export function canRedo<T>(state: HistoryState<T>): boolean {
  return state.future.length > 0
}
