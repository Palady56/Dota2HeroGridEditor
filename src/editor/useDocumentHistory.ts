import { useCallback, useReducer } from "react";
import { emptyDocument, updateActiveCategories } from "../model/document";
import type { Category, GridDocument } from "../model/types";
import {
  commitHistory,
  initHistory,
  redoHistory,
  undoHistory,
  type HistoryState,
} from "./history";

type Action =
  | { type: "commit"; update: (doc: GridDocument) => GridDocument; key: string | null; now: number }
  | { type: "undo" }
  | { type: "redo" };

function reducer(state: HistoryState<GridDocument>, action: Action): HistoryState<GridDocument> {
  switch (action.type) {
    case "commit":
      return commitHistory(state, action.update(state.present), action.key, action.now);
    case "undo":
      return undoHistory(state);
    case "redo":
      return redoHistory(state);
  }
}

export type CommitDocument = (
  update: (doc: GridDocument) => GridDocument,
  key?: string | null,
) => void;

export type CommitCategories = (
  update: (categories: Category[]) => Category[],
  key?: string | null,
) => void;

export function useDocumentHistory(initial?: GridDocument) {
  const [state, dispatch] = useReducer(reducer, undefined, () => initHistory(initial ?? emptyDocument()));

  const commit = useCallback<CommitDocument>(
    (update, key = null) => dispatch({ type: "commit", update, key, now: Date.now() }),
    [],
  );
  const commitCategories = useCallback<CommitCategories>(
    (update, key = null) =>
      dispatch({
        type: "commit",
        update: (doc) => updateActiveCategories(doc, update),
        key,
        now: Date.now(),
      }),
    [],
  );
  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);

  return {
    doc: state.present,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    commit,
    commitCategories,
    undo,
    redo,
  };
}
