import { $getSelection, $isRangeSelection, $setSelection, $getRoot, $createTextNode, createEditor, CLEAR_HISTORY_COMMAND, type EditorState, type LexicalEditor, type RangeSelection } from 'lexical';
import type { HistoryState } from '@lexical/react/LexicalHistoryPlugin';
import { $createLinkNode } from '@lexical/link';
import { $generateJSONFromSelectedNodes, $generateNodesFromSerializedNodes, $insertGeneratedNodes } from '@lexical/clipboard';
import { editorConfig } from '../lexical-config';

const supported = new Set(['root', 'paragraph', 'heading', 'quote', 'list', 'listitem', 'text', 'link', 'autolink', 'linebreak', 'tab']);
export type CapturedSelection = { state: EditorState; selection: RangeSelection; content: string };

export function applyExtractedContent(editor: LexicalEditor, history: HistoryState, content: string) {
  editor.setEditorState(editor.parseEditorState(content), { tag: 'extraction' });
  editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
  history.current = { editor, editorState: editor.getEditorState() };
}

export function captureSelection(editor: LexicalEditor): { capture?: CapturedSelection; reason?: string } {
  return editor.getEditorState().read(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection) || selection.isCollapsed()) return {};
    for (const node of selection.getNodes()) {
      let current = node;
      while (current) {
        if (!supported.has(current.getType())) return { reason: 'Select text, paragraphs, headings, quotes or lists. Tables, code, images, equations and music cannot be extracted yet.' };
        const parent = current.getParent();
        if (!parent) break;
        current = parent;
      }
    }
    if (!selection.getTextContent().trim()) return { reason: 'Select some text to extract.' };
    const state = editor.getEditorState();
    return { capture: { state, selection: selection.clone(), content: JSON.stringify(state.toJSON()) } };
  }, { editor });
}

export function prepareExtraction(editor: LexicalEditor, capture: CapturedSelection, title: string, operationId: string) {
  if (JSON.stringify(editor.getEditorState().toJSON()) !== capture.content) throw new Error('The note changed. Close this dialog and select again.');
  const selected = capture.state.read(() => $generateJSONFromSelectedNodes(editor, capture.selection), { editor });
  const config = { ...editorConfig, onError: (error: Error) => { throw error; } };
  const destination = createEditor(config);
  destination.update(() => {
    const selection = $getRoot().selectStart();
    $insertGeneratedNodes(destination, $generateNodesFromSerializedNodes(selected.nodes), selection);
  }, { discrete: true });
  const source = createEditor(config);
  source.setEditorState(capture.state.clone(capture.selection.clone()));
  source.update(() => {
    const selection = capture.selection.clone();
    $setSelection(selection);
    selection.insertNodes([$createLinkNode('#', { rel: `tramo-extraction:${operationId}` }).append($createTextNode(title))]);
  }, { discrete: true });
  return { expectedContent: capture.content, extractedContent: JSON.stringify(destination.getEditorState().toJSON()), sourceContent: JSON.stringify(source.getEditorState().toJSON()) };
}
