import { $getSelection, $isRangeSelection, $setSelection, $getRoot, $createTextNode, createEditor, type EditorState, type LexicalEditor, type RangeSelection } from 'lexical';
import { $createLinkNode } from '@lexical/link';
import { $generateJSONFromSelectedNodes, $generateNodesFromSerializedNodes, $insertGeneratedNodes } from '@lexical/clipboard';
import { editorConfig } from '../lexical-config';

const supported = new Set(['root', 'paragraph', 'heading', 'quote', 'list', 'listitem', 'text', 'link', 'autolink', 'linebreak', 'tab']);
export type CapturedSelection = { state: EditorState; selection: RangeSelection; text: string };

export function captureSelection(editor: LexicalEditor): { capture?: CapturedSelection; reason?: string } {
  return editor.getEditorState().read(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection) || selection.isCollapsed()) return {};
    for (const node of selection.getNodes()) {
      let current = node;
      while (current) {
        if (!supported.has(current.getType())) return { reason: 'Select text, paragraphs, headings, quotes or lists. Tables, code, images, equations, music and embeds cannot be extracted yet.' };
        const parent = current.getParent();
        if (!parent) break;
        current = parent;
      }
    }
    if (!selection.getTextContent().trim()) return { reason: 'Select some text to extract.' };
    const state = editor.getEditorState();
    return { capture: { state, selection: selection.clone(), text: selection.getTextContent() } };
  }, { editor });
}

export function prepareExtraction(editor: LexicalEditor, capture: CapturedSelection): string {
  const selected = capture.state.read(() => $generateJSONFromSelectedNodes(editor, capture.selection), { editor });
  const destination = createEditor({ ...editorConfig, onError: (error: Error) => { throw error; } });
  destination.update(() => {
    const selection = $getRoot().selectStart();
    $insertGeneratedNodes(destination, $generateNodesFromSerializedNodes(selected.nodes), selection);
  }, { discrete: true });
  return JSON.stringify(destination.getEditorState().toJSON());
}

export function replaceExtractedSelection(editor: LexicalEditor, capture: CapturedSelection, itemId: string, title: string, leaveLink: boolean): boolean {
  let replaced = false;
  editor.update(() => {
    const selection = capture.selection.clone();
    if (!selection.getNodes().every(node => node.isAttached()) || selection.getTextContent() !== capture.text) return;
    $setSelection(selection);
    if (leaveLink) selection.insertNodes([$createLinkNode('#', { rel: `tramo-idea:${itemId}` }).append($createTextNode(title))]);
    else selection.removeText();
    replaced = true;
  }, { discrete: true });
  return replaced;
}
