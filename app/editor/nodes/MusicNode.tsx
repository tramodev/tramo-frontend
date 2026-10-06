// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical';

import { $applyNodeReplacement, DecoratorNode } from 'lexical';
import * as React from 'react';
import MusicComponent from '../plugins/MusicComponent';

export interface MusicPayload {
  abc: string;
  key?: NodeKey;
}

export type SerializedMusicNode = Spread<{ abc: string }, SerializedLexicalNode>;

export class MusicNode extends DecoratorNode<React.ReactElement> {
  __abc: string;

  static getType(): string {
    return 'music';
  }

  static clone(node: MusicNode): MusicNode {
    return new MusicNode(node.__abc, node.__key);
  }

  static importJSON(serializedNode: SerializedMusicNode): MusicNode {
    const { abc } = serializedNode;
    return $createMusicNode({ abc: typeof abc === 'string' ? abc : '' });
  }

  constructor(abc: string, key?: NodeKey) {
    super(key);
    this.__abc = abc;
  }

  exportJSON(): SerializedMusicNode {
    return {
      abc: this.getAbc(),
      type: 'music',
      version: 1,
    };
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('div');
    element.setAttribute('data-lexical-music', this.__abc);
    element.textContent = this.__abc;
    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    const convert = (domNode: HTMLElement): DOMConversionOutput | null => {
      const abc = domNode.getAttribute('data-lexical-music');
      if (abc === null) return null;
      return { node: $createMusicNode({ abc }) };
    };
    return {
      div: (domNode: HTMLElement) =>
        domNode.hasAttribute('data-lexical-music') ? { conversion: convert, priority: 2 } : null,
    };
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement('div');
    const className = config.theme.music;
    if (className !== undefined) {
      element.className = className;
    }
    return element;
  }

  updateDOM(): boolean {
    return false;
  }

  isInline(): boolean {
    return false;
  }

  getAbc(): string {
    return this.__abc;
  }

  setAbc(abc: string): void {
    const writable = this.getWritable();
    writable.__abc = abc;
  }

  getTextContent(): string {
    return this.__abc;
  }

  decorate(): React.ReactElement {
    return <MusicComponent abc={this.__abc} nodeKey={this.getKey()} />;
  }
}

export function $createMusicNode({ abc, key }: MusicPayload): MusicNode {
  return $applyNodeReplacement(new MusicNode(abc, key));
}

export function $isMusicNode(node: LexicalNode | null | undefined): node is MusicNode {
  return node instanceof MusicNode;
}
