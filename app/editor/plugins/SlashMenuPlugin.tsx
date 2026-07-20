"use client"

import { ChangeEvent, useCallback, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { $createParagraphNode, $getSelection, $isRangeSelection, ElementNode, LexicalEditor, TextNode } from 'lexical';
import { $createHeadingNode, $createQuoteNode, HeadingTagType } from '@lexical/rich-text';
import { $createCodeNode } from '@lexical/code';
import { $setBlocksType } from '@lexical/selection';
import {
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from '@lexical/list';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';
import {
  CheckSquare,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  List as ListIcon,
  ListOrdered,
  Minus,
  Quote,
  SquareCode,
  Type,
} from 'lucide-react';
import { insertImageWithUpload } from './ImagesPlugin';

class SlashOption extends MenuOption {
  label: string;
  Icon: typeof Type;
  keywords: string;
  run: ((editor: LexicalEditor) => void) | null;

  constructor(label: string, Icon: typeof Type, keywords: string, run: ((editor: LexicalEditor) => void) | null) {
    super(label);
    this.label = label;
    this.Icon = Icon;
    this.keywords = keywords;
    this.run = run;
  }
}

function setBlock(editor: LexicalEditor, createNode: () => ElementNode) {
  editor.update(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      $setBlocksType(selection, createNode);
    }
  });
}

function headingOption(label: string, Icon: typeof Type, tag: HeadingTagType): SlashOption {
  return new SlashOption(label, Icon, `heading ${tag} title`, (editor) =>
    setBlock(editor, () => $createHeadingNode(tag)),
  );
}

export default function SlashMenuPlugin() {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch('/', { minLength: 0 });

  const allOptions = useMemo(
    () => [
      new SlashOption('Text', Type, 'text paragraph normal plain', (e) =>
        setBlock(e, () => $createParagraphNode()),
      ),
      headingOption('Heading 1', Heading1, 'h1'),
      headingOption('Heading 2', Heading2, 'h2'),
      headingOption('Heading 3', Heading3, 'h3'),
      new SlashOption('Bulleted list', ListIcon, 'bullet unordered list ul', (e) =>
        e.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined),
      ),
      new SlashOption('Numbered list', ListOrdered, 'number ordered list ol', (e) =>
        e.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined),
      ),
      new SlashOption('Check list', CheckSquare, 'check todo task list', (e) =>
        e.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined),
      ),
      new SlashOption('Quote', Quote, 'quote blockquote cite', (e) =>
        setBlock(e, () => $createQuoteNode()),
      ),
      new SlashOption('Code block', SquareCode, 'code snippet pre', (e) =>
        setBlock(e, () => $createCodeNode()),
      ),
      new SlashOption('Divider', Minus, 'divider horizontal rule hr separator', (e) =>
        e.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined),
      ),
      new SlashOption('Image', ImageIcon, 'image photo picture upload', null),
    ],
    [],
  );

  const options = useMemo(() => {
    const query = (queryString ?? '').toLowerCase();
    if (!query) return allOptions;
    return allOptions.filter(
      (option) => option.label.toLowerCase().includes(query) || option.keywords.includes(query),
    );
  }, [allOptions, queryString]);

  const onSelectOption = useCallback(
    (option: SlashOption, textNodeContainingQuery: TextNode | null, closeMenu: () => void) => {
      editor.update(() => {
        textNodeContainingQuery?.remove();
      });
      if (option.run) {
        option.run(editor);
      } else {
        fileInputRef.current?.click();
      }
      closeMenu();
    },
    [editor],
  );

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    insertImageWithUpload(editor, file);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFileChange}
        className="hidden"
      />
      <LexicalTypeaheadMenuPlugin<SlashOption>
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
                      ref={(el) => {
                        if (selectedIndex === index) el?.scrollIntoView({ block: 'nearest' });
                      }}
                      className={'idea-mention-menu-item slash-menu-item' + (selectedIndex === index ? ' selected' : '')}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onClick={() => selectOptionAndCleanUp(option)}
                    >
                      <option.Icon size={15} />
                      {option.label}
                    </li>
                  ))}
                </ul>,
                anchorElementRef.current,
              )
            : null
        }
      />
    </>
  );
}
