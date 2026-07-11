/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
"use client"
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister, $getNearestNodeOfType } from '@lexical/utils';
import {
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
  LexicalEditor,
  $createParagraphNode,
} from 'lexical';
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  HeadingTagType,
} from '@lexical/rich-text';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_CHECK_LIST_COMMAND,
  $isListNode,
  ListNode,
} from '@lexical/list';
import {
  $createCodeNode,
  $isCodeNode,
  getDefaultCodeLanguage,
  getCodeLanguages,
} from '@lexical/code';
import {
  $isLinkNode,
  TOGGLE_LINK_COMMAND,
} from '@lexical/link';
import {
  $setBlocksType,
  $patchStyleText,
  $getSelectionStyleValueForProperty,
} from '@lexical/selection';

import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3,
  List as ListIcon,
  ListOrdered,
  CheckSquare,
  Code,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { INSERT_IMAGE_COMMAND } from './ImagesPlugin';

const blockTypeToBlockName = {
  bullet: 'Bulleted List',
  check: 'Check List',
  code: 'Code Block',
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
  h4: 'Heading 4',
  h5: 'Heading 5',
  h6: 'Heading 6',
  number: 'Numbered List',
  paragraph: 'Normal',
  quote: 'Quote',
};

const FONT_FAMILY_OPTIONS: Array<[string, string]> = [
  ['Arial', 'Arial'],
  ['Courier New', 'Courier New'],
  ['Georgia', 'Georgia'],
  ['Times New Roman', 'Times New Roman'],
  ['Trebuchet MS', 'Trebuchet MS'],
  ['Verdana', 'Verdana'],
];

const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 72;

function Divider() {
  return <div className="divider" />;
}

export default function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const toolbarRef = useRef(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [blockType, setBlockType] = useState('paragraph');
  const [selectedElementKey, setSelectedElementKey] = useState<string | null>(null);
  const [isLink, setIsLink] = useState(false);

  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fontSize, setFontSize] = useState('15');

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const anchorNode = selection.anchor.getNode();
      const element =
        anchorNode.getKey() === 'root'
          ? anchorNode
          : anchorNode.getTopLevelElementOrThrow();
      const elementKey = element.getKey();
      const elementDOM = editor.getElementByKey(elementKey);
      if (elementDOM !== null) {
        setSelectedElementKey(elementKey);
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType<ListNode>(anchorNode, ListNode);
          const type = parentList ? parentList.getListType() : element.getListType();
          setBlockType(type);
        } else {
          const type = $isHeadingNode(element)
            ? element.getTag()
            : element.getType();
          setBlockType(type);

          if ($isCodeNode(element)) {
            setIsCode(true);
          } else {
            setIsCode(false);
          }
        }
      }

      // Update text format
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
      setIsCode(selection.hasFormat('code'));

      // Update links
      const node = selection.anchor.getNode();
      const parent = node.getParent();
      if ($isLinkNode(parent) || $isLinkNode(node)) {
        setIsLink(true);
      } else {
        setIsLink(false);
      }

      // Update font family & size
      setFontFamily($getSelectionStyleValueForProperty(selection, 'font-family', 'Arial'));
      setFontSize(
        $getSelectionStyleValueForProperty(selection, 'font-size', `${MIN_FONT_SIZE + 7}px`).replace('px', ''),
      );
    }
  }, [editor]);

  const applyStyleText = useCallback(
    (styles: Record<string, string>) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $patchStyleText(selection, styles);
        }
      });
    },
    [editor],
  );

  const onFontFamilySelect = useCallback(
    (value: string) => {
      setFontFamily(value);
      applyStyleText({ 'font-family': value });
    },
    [applyStyleText],
  );

  const onFontSizeCommit = useCallback(
    (value: string) => {
      const clamped = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Number(value) || MIN_FONT_SIZE));
      setFontSize(String(clamped));
      applyStyleText({ 'font-size': `${clamped}px` });
    },
    [applyStyleText],
  );

  const updateFontSizeByStep = useCallback(
    (step: number) => {
      const next = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, (Number(fontSize) || MIN_FONT_SIZE) + step));
      setFontSize(String(next));
      applyStyleText({ 'font-size': `${next}px` });
    },
    [applyStyleText, fontSize],
  );

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        (_payload, _newEditor) => {
          updateToolbar();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, updateToolbar]);

  const formatParagraph = () => {
    if (blockType !== 'paragraph') {
      editor.update(() => {
        const selection = $getSelection();

        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createParagraphNode());
        }
      });
    }
  };

  const formatHeading = (headingSize: HeadingTagType) => {
    editor.update(() => {
      const selection = $getSelection();

      if ($isRangeSelection(selection)) {
        if (blockType === headingSize) {
          $setBlocksType(selection, () => $createParagraphNode());
        } else {
          $setBlocksType(selection, () => $createHeadingNode(headingSize));
        }
      }
    });
  };

  const formatBulletList = () => {
    if (blockType !== 'bullet') {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    } else {
      formatParagraph();
    }
  };

  const formatNumberedList = () => {
    if (blockType !== 'number') {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    } else {
      formatParagraph();
    }
  };

  const formatCheckList = () => {
    if (blockType !== 'check') {
      editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
    } else {
      formatParagraph();
    }
  };

  const formatQuote = () => {
    if (blockType !== 'quote') {
      editor.update(() => {
        const selection = $getSelection();

        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createQuoteNode());
        }
      });
    }
  };

  const formatCode = () => {
    if (blockType !== 'code') {
      editor.update(() => {
        const selection = $getSelection();

        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createCodeNode());
        }
      });
    }
  };

  const insertLink = useCallback(() => {
    if (!isLink) {
      const url = window.prompt('Enter URL');
      if (!url) return;
      const normalizedUrl = /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, normalizedUrl);
    } else {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  }, [editor, isLink]);

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
        altText: file.name,
        src: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="toolbar" ref={toolbarRef}>
      <button
        disabled={!canUndo}
        onClick={() => {
          editor.dispatchCommand(UNDO_COMMAND, undefined);
        }}
        className="toolbar-item spaced"
        aria-label="Undo">
        <Undo size={18} />
      </button>
      <button
        disabled={!canRedo}
        onClick={() => {
          editor.dispatchCommand(REDO_COMMAND, undefined);
        }}
        className="toolbar-item"
        aria-label="Redo">
        <Redo size={18} />
      </button>
      <Divider />
      {/* Font family & size */}
      <select
        className="toolbar-item font-family-select"
        value={fontFamily}
        onChange={(e) => onFontFamilySelect(e.target.value)}
        aria-label="Font Family"
        style={{ fontFamily }}
      >
        {FONT_FAMILY_OPTIONS.map(([value, label]) => (
          <option key={value} value={value} style={{ fontFamily: value }}>
            {label}
          </option>
        ))}
      </select>
      <div className="font-size-control">
        <button
          onClick={() => updateFontSizeByStep(-1)}
          className="toolbar-item"
          aria-label="Decrease font size">
          <ChevronDown size={14} />
        </button>
        <input
          type="number"
          className="font-size-input"
          value={fontSize}
          min={MIN_FONT_SIZE}
          max={MAX_FONT_SIZE}
          onChange={(e) => setFontSize(e.target.value)}
          onBlur={(e) => onFontSizeCommit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onFontSizeCommit((e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).blur();
            }
          }}
          aria-label="Font Size"
        />
        <button
          onClick={() => updateFontSizeByStep(1)}
          className="toolbar-item"
          aria-label="Increase font size">
          <ChevronUp size={14} />
        </button>
      </div>

      <Divider />
      {/* Headings */}
      <button
        onClick={() => formatHeading('h1')}
        className={'toolbar-item spaced ' + (blockType === 'h1' ? 'active' : '')}
        aria-label="Heading 1">
        <Heading1 size={18} />
      </button>
      <button
        onClick={() => formatHeading('h2')}
        className={'toolbar-item spaced ' + (blockType === 'h2' ? 'active' : '')}
        aria-label="Heading 2">
        <Heading2 size={18} />
      </button>
      <button
        onClick={() => formatHeading('h3')}
        className={'toolbar-item spaced ' + (blockType === 'h3' ? 'active' : '')}
        aria-label="Heading 3">
        <Heading3 size={18} />
      </button>

      <Divider />
      {/* Functionality */}
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
        }}
        className={'toolbar-item spaced ' + (isBold ? 'active' : '')}
        aria-label="Format Bold">
        <Bold size={18} />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
        }}
        className={'toolbar-item spaced ' + (isItalic ? 'active' : '')}
        aria-label="Format Italics">
        <Italic size={18} />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
        }}
        className={'toolbar-item spaced ' + (isUnderline ? 'active' : '')}
        aria-label="Format Underline">
        <Underline size={18} />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
        }}
        className={'toolbar-item spaced ' + (isStrikethrough ? 'active' : '')}
        aria-label="Format Strikethrough">
        <Strikethrough size={18} />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code');
        }}
        className={'toolbar-item spaced ' + (isCode ? 'active' : '')}
        aria-label="Format Code">
        <Code size={18} />
      </button>
      <button
        onClick={insertLink}
        className={'toolbar-item spaced ' + (isLink ? 'active' : '')}
        aria-label="Insert Link">
        <LinkIcon size={18} />
      </button>
      <button
        onClick={() => fileInputRef.current?.click()}
        className="toolbar-item spaced"
        aria-label="Insert Image">
        <ImageIcon size={18} />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFileChange}
        style={{ display: 'none' }}
      />

      <Divider />
      {/* Lists & Quotes */}
      <button
        onClick={formatBulletList}
        className={'toolbar-item spaced ' + (blockType === 'bullet' ? 'active' : '')}
        aria-label="Bullet List">
        <ListIcon size={18} />
      </button>
      <button
        onClick={formatNumberedList}
        className={'toolbar-item spaced ' + (blockType === 'number' ? 'active' : '')}
        aria-label="Numbered List">
        <ListOrdered size={18} />
      </button>
      <button
        onClick={formatCheckList}
        className={'toolbar-item spaced ' + (blockType === 'check' ? 'active' : '')}
        aria-label="Check List">
        <CheckSquare size={18} />
      </button>
      <button
        onClick={formatQuote}
        className={'toolbar-item spaced ' + (blockType === 'quote' ? 'active' : '')}
        aria-label="Quote">
        <Quote size={18} />
      </button>

      <Divider />
      {/* Alignment */}
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left');
        }}
        className="toolbar-item spaced"
        aria-label="Left Align">
        <AlignLeft size={18} />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
        }}
        className="toolbar-item spaced"
        aria-label="Center Align">
        <AlignCenter size={18} />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right');
        }}
        className="toolbar-item spaced"
        aria-label="Right Align">
        <AlignRight size={18} />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify');
        }}
        className="toolbar-item"
        aria-label="Justify Align">
        <AlignJustify size={18} />
      </button>{' '}
    </div>
  );
}


