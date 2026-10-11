import type { EditorState, LexicalEditor } from 'lexical';
import type { HistoryState } from '@lexical/react/LexicalHistoryPlugin';

export interface ItemEditorSession {
  state?: EditorState;
  undo: EditorState[];
  redo: EditorState[];
  previewUrls: Set<string>;
}

export function restoreItemHistory(session: ItemEditorSession, editor: LexicalEditor): HistoryState {
  return {
    current: session.state ? { editor, editorState: session.state.clone(null) } : null,
    undoStack: session.undo.map(editorState => ({ editor, editorState })),
    redoStack: session.redo.map(editorState => ({ editor, editorState })),
  };
}

export function saveItemSession(session: ItemEditorSession, editor: LexicalEditor, history: HistoryState) {
  session.state = editor.getEditorState();
  session.undo = history.undoStack.map(entry => entry.editorState);
  session.redo = history.redoStack.map(entry => entry.editorState);
}
