"use client"

import { useEffect, useRef, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $insertNodeToNearestRoot, mergeRegister } from '@lexical/utils';
import { $createParagraphNode, $getSelection, $setSelection, COMMAND_PRIORITY_EDITOR, createCommand, type BaseSelection } from 'lexical';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { $createEmbedNode, EmbedNode } from '@/app/editor/nodes/EmbedNode';
import { parseEmbedUrl, validateEmbed, type Embed } from '@/app/editor/plugins/embed';
import { $isSelectionInCode } from '@/app/editor/plugins/codeBlockGuard';

export const OPEN_EMBED_DIALOG_COMMAND = createCommand<void>('OPEN_EMBED_DIALOG_COMMAND');
export const INSERT_EMBED_COMMAND = createCommand<Embed>('INSERT_EMBED_COMMAND');

export default function EmbedsPlugin() {
  const [editor] = useLexicalComposerContext();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const selection = useRef<BaseSelection | null>(null);

  useEffect(() => {
    if (!editor.hasNodes([EmbedNode])) throw new Error('EmbedsPlugin: EmbedNode not registered on editor');
    return mergeRegister(
      editor.registerCommand(OPEN_EMBED_DIALOG_COMMAND, () => {
        if (!editor.isEditable() || $isSelectionInCode()) return true;
        selection.current = $getSelection()?.clone() ?? null;
        setUrl('');
        setError('');
        setOpen(true);
        return true;
      }, COMMAND_PRIORITY_EDITOR),
      editor.registerCommand(INSERT_EMBED_COMMAND, payload => {
        const embed = validateEmbed(payload?.provider, payload?.id);
        if (!editor.isEditable() || $isSelectionInCode() || !embed) return true;
        const node = $insertNodeToNearestRoot($createEmbedNode(embed));
        if (node.getNextSibling() === null) node.insertAfter($createParagraphNode());
        node.selectNext(0, 0);
        return true;
      }, COMMAND_PRIORITY_EDITOR),
    );
  }, [editor]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent onCloseAutoFocus={event => {
        event.preventDefault();
        requestAnimationFrame(() => {
          editor.getRootElement()?.focus({ preventScroll: true });
          editor.focus();
        });
      }}>
        <DialogHeader>
          <DialogTitle>Embed a tweet or video</DialogTitle>
          <DialogDescription>Paste a public X / Twitter post or YouTube video URL. Embedded content loads from the provider.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={event => {
          event.preventDefault();
          const embed = parseEmbedUrl(url);
          if (!embed) {
            setError('Enter a valid HTTPS link to a tweet or YouTube video.');
            return;
          }
          editor.update(() => {
            $setSelection(selection.current?.clone() ?? null);
            editor.dispatchCommand(INSERT_EMBED_COMMAND, embed);
          }, { discrete: true });
          setOpen(false);
        }}>
          <Input aria-label="Tweet or YouTube URL" type="url" required value={url} onChange={event => setUrl(event.target.value)} />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Embed</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
