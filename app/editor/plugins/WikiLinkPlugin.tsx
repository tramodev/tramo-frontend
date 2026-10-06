// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
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
import { Item } from '../types';
import { itemLinkRel } from './itemLink';

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
  item: Item;
  constructor(item: Item) {
    super(item.id);
    this.item = item;
  }
}

export default function WikiLinkPlugin({
  items,
  currentItemId,
}: {
  items: Record<string, Item>;
  currentItemId: string;
}) {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState<string | null>(null);

  const options = useMemo(() => {
    const query = (queryString ?? '').toLowerCase();
    return Object.values(items)
      .filter((item) => item.id !== currentItemId && item.title.toLowerCase().includes(query))
      .slice(0, 8)
      .map((item) => new WikiLinkOption(item));
  }, [items, currentItemId, queryString]);

  const onSelectOption = useCallback(
    (option: WikiLinkOption, textNodeContainingQuery: TextNode | null, closeMenu: () => void) => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        const linkNode = $createLinkNode('#', { rel: itemLinkRel(option.item.id) });
        linkNode.append($createTextNode(option.item.title));
        if (textNodeContainingQuery) {
          textNodeContainingQuery.replace(linkNode);
        } else {
          selection.insertNodes([linkNode]);
        }
        linkNode.selectEnd();
      });
      closeMenu();
    },
    [editor],
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
              <ul className="item-mention-menu">
                {options.map((option, index) => (
                  <li
                    key={option.key}
                    ref={(el) => {
                      if (selectedIndex === index) el?.scrollIntoView({ block: 'nearest' });
                    }}
                    className={'item-mention-menu-item' + (selectedIndex === index ? ' selected' : '')}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => selectOptionAndCleanUp(option)}
                  >
                    {option.item.title}
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
