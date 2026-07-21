"use client"
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister, $getNearestNodeOfType } from '@lexical/utils';
import {
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  KEY_MODIFIER_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
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
import { $createCodeNode } from '@lexical/code';
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
  Baseline,
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
  Type,
  List as ListIcon,
  ListOrdered,
  CheckSquare,
  Code,
  SquareCode,
  Minus,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  ChevronUp,
  ChevronDown,
  Search,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { insertImageWithUpload } from './ImagesPlugin';
import { OPEN_LINK_EDITOR_COMMAND } from './FloatingLinkEditorPlugin';
import { OPEN_FIND_REPLACE_COMMAND } from './FindReplacePlugin';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';

const COLOR_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Default' },
  { value: 'var(--ed-red)', label: 'Red' },
  { value: 'var(--ed-orange)', label: 'Orange' },
  { value: 'var(--ed-green)', label: 'Green' },
  { value: 'var(--ed-blue)', label: 'Blue' },
  { value: 'var(--ed-purple)', label: 'Purple' },
  { value: 'var(--ed-gray)', label: 'Gray' },
];

type ElementFormat = 'left' | 'center' | 'right' | 'justify';

const ALIGN_OPTIONS: { value: ElementFormat; label: string; Icon: typeof AlignLeft }[] = [
  { value: 'left', label: 'Align left', Icon: AlignLeft },
  { value: 'center', label: 'Align center', Icon: AlignCenter },
  { value: 'right', label: 'Align right', Icon: AlignRight },
  { value: 'justify', label: 'Justify', Icon: AlignJustify },
];

type HeadingOption = 'paragraph' | 'h1' | 'h2' | 'h3' | 'code';

const HEADING_OPTIONS: { value: HeadingOption; label: string; Icon: typeof Type }[] = [
  { value: 'paragraph', label: 'Normal', Icon: Type },
  { value: 'h1', label: 'Heading 1', Icon: Heading1 },
  { value: 'h2', label: 'Heading 2', Icon: Heading2 },
  { value: 'h3', label: 'Heading 3', Icon: Heading3 },
  { value: 'code', label: 'Code Block', Icon: SquareCode },
];

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

export default function ToolbarPlugin({
  titleFocused,
  titleAlign,
  onSetTitleAlign,
}: {
  titleFocused?: boolean;
  titleAlign?: 'left' | 'center' | 'right';
  onSetTitleAlign?: (align: 'left' | 'center' | 'right') => void;
} = {}) {
  const [editor] = useLexicalComposerContext();
  const toolbarRef = useRef(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [blockType, setBlockType] = useState('paragraph');
  const [isLink, setIsLink] = useState(false);

  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fontSize, setFontSize] = useState('15');
  const [textColor, setTextColor] = useState('');
  const [elementFormat, setElementFormat] = useState<ElementFormat>('left');

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
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType<ListNode>(anchorNode, ListNode);
          const type = parentList ? parentList.getListType() : element.getListType();
          setBlockType(type);
        } else {
          const type = $isHeadingNode(element)
            ? element.getTag()
            : element.getType();
          setBlockType(type);
        }
        if ($isElementNode(element)) {
          const format = element.getFormatType();
          setElementFormat(format === 'center' || format === 'right' || format === 'justify' ? format : 'left');
        }
      }

      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
      setIsCode(selection.hasFormat('code'));

      const node = selection.anchor.getNode();
      const parent = node.getParent();
      if ($isLinkNode(parent) || $isLinkNode(node)) {
        setIsLink(true);
      } else {
        setIsLink(false);
      }

      setTextColor($getSelectionStyleValueForProperty(selection, 'color', ''));
      setFontFamily($getSelectionStyleValueForProperty(selection, 'font-family', 'Arial'));
      setFontSize(
        $getSelectionStyleValueForProperty(selection, 'font-size', `${MIN_FONT_SIZE + 7}px`).replace('px', ''),
      );
    }
  }, [editor]);

  const applyStyleText = useCallback(
    (styles: Record<string, string | null>) => {
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

  const insertLink = useCallback(() => {
    if (!isLink) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, 'https://');
      editor.dispatchCommand(OPEN_LINK_EDITOR_COMMAND, undefined);
    } else {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  }, [editor, isLink]);

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
      editor.registerCommand(
        KEY_MODIFIER_COMMAND,
        (event) => {
          if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            insertLink();
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, updateToolbar, insertLink]);

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

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    insertImageWithUpload(editor, file);
  };

  return (
    <div className="toolbar" ref={toolbarRef}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            disabled={!canUndo}
            onClick={() => {
              editor.dispatchCommand(UNDO_COMMAND, undefined);
            }}
            className="toolbar-item spaced"
            aria-label="Undo">
            <Undo size={18} />
          </button>
        </TooltipTrigger>
        <TooltipContent>Undo</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            disabled={!canRedo}
            onClick={() => {
              editor.dispatchCommand(REDO_COMMAND, undefined);
            }}
            className="toolbar-item"
            aria-label="Redo">
            <Redo size={18} />
          </button>
        </TooltipTrigger>
        <TooltipContent>Redo</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => editor.dispatchCommand(OPEN_FIND_REPLACE_COMMAND, undefined)}
            className="toolbar-item spaced"
            aria-label="Find and replace">
            <Search size={18} />
          </button>
        </TooltipTrigger>
        <TooltipContent>Find and replace</TooltipContent>
      </Tooltip>
      <Divider />
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
      <Divider />
      <div className="font-size-control">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => updateFontSizeByStep(-1)}
              className="toolbar-item"
              aria-label="Decrease font size">
              <ChevronDown size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Decrease font size</TooltipContent>
        </Tooltip>
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
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => updateFontSizeByStep(1)}
              className="toolbar-item"
              aria-label="Increase font size">
              <ChevronUp size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Increase font size</TooltipContent>
        </Tooltip>
      </div>

      <Divider />
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button className="toolbar-item align-dropdown-trigger spaced" aria-label="Text style">
                {(() => {
                  const Active =
                    HEADING_OPTIONS.find((option) => option.value === blockType)?.Icon ?? Type;
                  return <Active size={18} />;
                })()}
                <ChevronDown size={12} />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Text style</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start">
          {HEADING_OPTIONS.map(({ value, label, Icon }) => (
            <DropdownMenuItem
              key={value}
              onSelect={() =>
                value === 'paragraph'
                  ? formatParagraph()
                  : value === 'code'
                    ? formatCode()
                    : formatHeading(value)
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button className="toolbar-item align-dropdown-trigger spaced" aria-label="Align text">
                {(() => {
                  const activeValue = titleFocused ? titleAlign ?? 'left' : elementFormat;
                  const Active = ALIGN_OPTIONS.find((option) => option.value === activeValue)?.Icon ?? AlignLeft;
                  return <Active size={18} />;
                })()}
                <ChevronDown size={12} />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Align text</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start">
          {(titleFocused ? ALIGN_OPTIONS.filter((option) => option.value !== 'justify') : ALIGN_OPTIONS).map(({ value, label, Icon }) => (
            <DropdownMenuItem
              key={value}
              onSelect={() =>
                titleFocused
                  ? onSetTitleAlign?.(value as 'left' | 'center' | 'right')
                  : editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, value)
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Divider />
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => {
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
            }}
            className={'toolbar-item spaced ' + (isBold ? 'active' : '')}
            aria-pressed={isBold}
            aria-label="Format Bold">
            <Bold size={18} />
          </button>
        </TooltipTrigger>
        <TooltipContent>Bold</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => {
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
            }}
            className={'toolbar-item spaced ' + (isItalic ? 'active' : '')}
            aria-pressed={isItalic}
            aria-label="Format Italics">
            <Italic size={18} />
          </button>
        </TooltipTrigger>
        <TooltipContent>Italic</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => {
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
            }}
            className={'toolbar-item spaced ' + (isUnderline ? 'active' : '')}
            aria-pressed={isUnderline}
            aria-label="Format Underline">
            <Underline size={18} />
          </button>
        </TooltipTrigger>
        <TooltipContent>Underline</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => {
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
            }}
            className={'toolbar-item spaced ' + (isStrikethrough ? 'active' : '')}
            aria-pressed={isStrikethrough}
            aria-label="Format Strikethrough">
            <Strikethrough size={18} />
          </button>
        </TooltipTrigger>
        <TooltipContent>Strikethrough</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => {
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code');
            }}
            className={'toolbar-item spaced ' + (isCode ? 'active' : '')}
            aria-pressed={isCode}
            aria-label="Format Code">
            <Code size={18} />
          </button>
        </TooltipTrigger>
        <TooltipContent>Inline code</TooltipContent>
      </Tooltip>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button className="toolbar-item spaced" aria-label="Text color">
                <Baseline size={18} style={textColor ? { color: textColor } : undefined} />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Text color</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start">
          {COLOR_OPTIONS.map(({ value, label }) => (
            <DropdownMenuItem key={label} onSelect={() => applyStyleText({ color: value || null })}>
              <span
                className="toolbar-color-swatch"
                style={{ background: value || 'var(--foreground)' }}
              />
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={insertLink}
            className={'toolbar-item spaced ' + (isLink ? 'active' : '')}
            aria-pressed={isLink}
            aria-label="Insert Link">
            <LinkIcon size={18} />
          </button>
        </TooltipTrigger>
        <TooltipContent>Link</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="toolbar-item spaced"
            aria-label="Insert Image">
            <ImageIcon size={18} />
          </button>
        </TooltipTrigger>
        <TooltipContent>Insert image</TooltipContent>
      </Tooltip>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFileChange}
        className="hidden"
      />

      <Divider />
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={formatBulletList}
            className={'toolbar-item spaced ' + (blockType === 'bullet' ? 'active' : '')}
            aria-pressed={blockType === 'bullet'}
            aria-label="Bullet List">
            <ListIcon size={18} />
          </button>
        </TooltipTrigger>
        <TooltipContent>Bulleted list</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={formatNumberedList}
            className={'toolbar-item spaced ' + (blockType === 'number' ? 'active' : '')}
            aria-pressed={blockType === 'number'}
            aria-label="Numbered List">
            <ListOrdered size={18} />
          </button>
        </TooltipTrigger>
        <TooltipContent>Numbered list</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={formatCheckList}
            className={'toolbar-item spaced ' + (blockType === 'check' ? 'active' : '')}
            aria-pressed={blockType === 'check'}
            aria-label="Check List">
            <CheckSquare size={18} />
          </button>
        </TooltipTrigger>
        <TooltipContent>Check list</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={formatQuote}
            className={'toolbar-item spaced ' + (blockType === 'quote' ? 'active' : '')}
            aria-pressed={blockType === 'quote'}
            aria-label="Quote">
            <Quote size={18} />
          </button>
        </TooltipTrigger>
        <TooltipContent>Quote</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)}
            className="toolbar-item spaced"
            aria-label="Insert Divider">
            <Minus size={18} />
          </button>
        </TooltipTrigger>
        <TooltipContent>Divider</TooltipContent>
      </Tooltip>
    </div>
  );
}

