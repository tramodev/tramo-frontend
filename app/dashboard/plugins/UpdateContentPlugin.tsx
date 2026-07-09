import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect, useRef } from 'react';
import { CLEAR_EDITOR_COMMAND } from 'lexical';

export default function UpdateContentPlugin({ content, ideaId }: { content: string; ideaId?: string }) {
    const [editor] = useLexicalComposerContext();
    const lastIdeaId = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (ideaId === lastIdeaId.current) return;
        lastIdeaId.current = ideaId;

        editor.update(() => {
            if (content) {
                const initialEditorState = editor.parseEditorState(content);
                editor.setEditorState(initialEditorState);
            } else {
                editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
            }
        });
    }, [editor, ideaId]);

    return null;
}