"use client"

import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { $createTextNode, $getSelection, $isRangeSelection, TextNode } from 'lexical';
import { $createLinkNode } from '@lexical/link';
import { Idea } from '../types';
import { ideaLinkRel } from './ideaLink';

class IdeaMentionOption extends MenuOption {
  idea: Idea;
  constructor(idea: Idea) {
    super(idea.id);
    this.idea = idea;
  }
}

export default function IdeaMentionPlugin({
  ideas,
  currentIdeaId,
  onLinkIdea,
}: {
  ideas: Record<string, Idea>;
  currentIdeaId: string;
  onLinkIdea: (ideaId: string, otherIdeaId: string) => void;
}) {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState<string | null>(null);

  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch('@', { minLength: 0 });

  const options = useMemo(() => {
    const query = (queryString ?? '').toLowerCase();
    return Object.values(ideas)
      .filter((idea) => idea.id !== currentIdeaId && idea.title.toLowerCase().includes(query))
      .slice(0, 8)
      .map((idea) => new IdeaMentionOption(idea));
  }, [ideas, currentIdeaId, queryString]);

  const onSelectOption = useCallback(
    (option: IdeaMentionOption, textNodeContainingQuery: TextNode | null, closeMenu: () => void) => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        const linkNode = $createLinkNode('#', { rel: ideaLinkRel(option.idea.id) });
        linkNode.append($createTextNode(option.idea.title));
        if (textNodeContainingQuery) {
          textNodeContainingQuery.replace(linkNode);
        } else {
          selection.insertNodes([linkNode]);
        }
        linkNode.selectEnd();
      });
      onLinkIdea(currentIdeaId, option.idea.id);
      closeMenu();
    },
    [editor, currentIdeaId, onLinkIdea],
  );

  return (
    <LexicalTypeaheadMenuPlugin<IdeaMentionOption>
      onQueryChange={setQueryString}
      onSelectOption={onSelectOption}
      triggerFn={checkForTriggerMatch}
      options={options}
      menuRenderFn={(anchorElementRef, { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }) =>
        anchorElementRef.current && options.length > 0
          ? createPortal(
              <ul className="idea-mention-menu">
                {options.map((option, index) => (
                  <li
                    key={option.key}
                    className={'idea-mention-menu-item' + (selectedIndex === index ? ' selected' : '')}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => selectOptionAndCleanUp(option)}
                  >
                    {option.idea.title}
                  </li>
                ))}
              </ul>,
              anchorElementRef.current,
            )
          : null
      }
    />
  );
}
