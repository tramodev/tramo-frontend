"use client"

import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  MenuTextMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { $createTextNode, $getSelection, $isRangeSelection, TextNode } from 'lexical';
import { $createLinkNode } from '@lexical/link';
import { Idea } from '../types';
import { ideaLinkRel } from './ideaLink';

// `[[` isn't a single character, so the built-in useBasicTypeaheadTriggerMatch
// (which only matches a one-char trigger) doesn't apply — match it directly.
const WIKI_LINK_TRIGGER_REGEX = /(^|\s|\()(\[\[([^[\]]{0,75}))$/;

function checkForWikiLinkTriggerMatch(text: string): MenuTextMatch | null {
  const match = WIKI_LINK_TRIGGER_REGEX.exec(text);
  if (match === null) return null;
  const leadingWhitespace = match[1];
  return {
    leadOffset: match.index + leadingWhitespace.length,
    matchingString: match[3],
    replaceableString: match[2],
  };
}

class WikiLinkOption extends MenuOption {
  idea: Idea;
  constructor(idea: Idea) {
    super(idea.id);
    this.idea = idea;
  }
}

export default function WikiLinkPlugin({
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

  const options = useMemo(() => {
    const query = (queryString ?? '').toLowerCase();
    return Object.values(ideas)
      .filter((idea) => idea.id !== currentIdeaId && idea.title.toLowerCase().includes(query))
      .slice(0, 8)
      .map((idea) => new WikiLinkOption(idea));
  }, [ideas, currentIdeaId, queryString]);

  const onSelectOption = useCallback(
    (option: WikiLinkOption, textNodeContainingQuery: TextNode | null, closeMenu: () => void) => {
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
    <LexicalTypeaheadMenuPlugin<WikiLinkOption>
      onQueryChange={setQueryString}
      onSelectOption={onSelectOption}
      triggerFn={checkForWikiLinkTriggerMatch}
      options={options}
      menuRenderFn={(anchorElementRef, { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }) =>
        anchorElementRef.current && options.length > 0
          ? createPortal(
              <ul className="idea-mention-menu">
                {options.map((option, index) => (
                  <li
                    key={option.key}
                    ref={(el) => {
                      if (selectedIndex === index) el?.scrollIntoView({ block: 'nearest' });
                    }}
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
