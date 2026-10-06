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
import EquationComponent from '../plugins/EquationComponent';

export interface EquationPayload {
  equation: string;
  inline?: boolean;
  key?: NodeKey;
}

export type SerializedEquationNode = Spread<
  {
    equation: string;
    inline: boolean;
  },
  SerializedLexicalNode
>;

export class EquationNode extends DecoratorNode<React.ReactElement> {
  __equation: string;
  __inline: boolean;

  static getType(): string {
    return 'equation';
  }

  static clone(node: EquationNode): EquationNode {
    return new EquationNode(node.__equation, node.__inline, node.__key);
  }

  static importJSON(serializedNode: SerializedEquationNode): EquationNode {
    const { equation, inline } = serializedNode;
    return $createEquationNode({
      equation: typeof equation === 'string' ? equation : '',
      inline: inline === true,
    });
  }

  constructor(equation: string, inline?: boolean, key?: NodeKey) {
    super(key);
    this.__equation = equation;
    this.__inline = inline === true;
  }

  exportJSON(): SerializedEquationNode {
    return {
      equation: this.getEquation(),
      inline: this.__inline,
      type: 'equation',
      version: 1,
    };
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement(this.__inline ? 'span' : 'div');
    const delimiter = this.__inline ? '$' : '$$';
    element.setAttribute('data-lexical-equation', this.__equation);
    element.setAttribute('data-lexical-equation-inline', String(this.__inline));
    element.textContent = `${delimiter}${this.__equation}${delimiter}`;
    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    const convert = (domNode: HTMLElement): DOMConversionOutput | null => {
      const equation = domNode.getAttribute('data-lexical-equation');
      if (equation === null) return null;
      return {
        node: $createEquationNode({
          equation,
          inline: domNode.getAttribute('data-lexical-equation-inline') === 'true',
        }),
      };
    };
    return {
      div: (domNode: HTMLElement) =>
        domNode.hasAttribute('data-lexical-equation') ? { conversion: convert, priority: 2 } : null,
      span: (domNode: HTMLElement) =>
        domNode.hasAttribute('data-lexical-equation') ? { conversion: convert, priority: 2 } : null,
    };
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement(this.__inline ? 'span' : 'div');
    const className = config.theme.equation;
    if (className !== undefined) {
      element.className = className;
    }
    return element;
  }

  updateDOM(prevNode: EquationNode): boolean {
    return prevNode.__inline !== this.__inline;
  }

  isInline(): boolean {
    return this.__inline;
  }

  getEquation(): string {
    return this.__equation;
  }

  setEquation(equation: string): void {
    const writable = this.getWritable();
    writable.__equation = equation;
  }

  getTextContent(): string {
    const delimiter = this.__inline ? '$' : '$$';
    return `${delimiter}${this.__equation}${delimiter}`;
  }

  decorate(): React.ReactElement {
    return (
      <EquationComponent
        equation={this.__equation}
        inline={this.__inline}
        nodeKey={this.getKey()}
      />
    );
  }
}

export function $createEquationNode({
  equation,
  inline,
  key,
}: EquationPayload): EquationNode {
  return $applyNodeReplacement(new EquationNode(equation, inline, key));
}

export function $isEquationNode(
  node: LexicalNode | null | undefined,
): node is EquationNode {
  return node instanceof EquationNode;
}
