import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect, useRef } from 'react';
import { CLEAR_EDITOR_COMMAND, CLEAR_HISTORY_COMMAND } from 'lexical';

export default function UpdateContentPlugin({
    content,
    itemId,
    onContentApplied,
}: {
    content: string | null;
    itemId?: string;
    onContentApplied?: (itemId: string) => void;
}) {
    const [editor] = useLexicalComposerContext();
    const lastItemId = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (itemId === lastItemId.current) return;
        if (content === null) return;
        lastItemId.current = itemId;

        editor.update(() => {
            if (content) {
                const initialEditorState = editor.parseEditorState(content);
                editor.setEditorState(initialEditorState);
            } else {
                editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
            }
        });
        editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);

        if (itemId) onContentApplied?.(itemId);
    }, [editor, itemId, content, onContentApplied]);

    return null;
}
