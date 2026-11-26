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
import GraphComponent from '../plugins/GraphComponent';

export interface GraphPayload {
  equation: string;
  key?: NodeKey;
}

export type SerializedGraphNode = Spread<{ equation: unknown }, SerializedLexicalNode>;

export class GraphNode extends DecoratorNode<React.ReactElement> {
  __equation: unknown;

  static getType(): string {
    return 'graph';
  }

  static clone(node: GraphNode): GraphNode {
    return new GraphNode(node.__equation, node.__key);
  }

  static importJSON(serializedNode: SerializedGraphNode): GraphNode {
    const { equation } = serializedNode;
    return $applyNodeReplacement(new GraphNode(equation));
  }

  constructor(equation: unknown, key?: NodeKey) {
    super(key);
    this.__equation = equation;
  }

  exportJSON(): SerializedGraphNode {
    return {
      equation: this.__equation,
      type: 'graph',
      version: 1,
    };
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('div');
    element.setAttribute('data-lexical-graph', this.getEquation());
    element.textContent = this.getEquation();
    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    const convert = (domNode: HTMLElement): DOMConversionOutput | null => {
      const equation = domNode.getAttribute('data-lexical-graph');
      if (equation === null) return null;
      return { node: $createGraphNode({ equation: equation.slice(0, 10000) }) };
    };
    return {
      div: (domNode: HTMLElement) =>
        domNode.hasAttribute('data-lexical-graph') ? { conversion: convert, priority: 2 } : null,
    };
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement('div');
    const className = config.theme.graph;
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

  getEquation(): string {
    return typeof this.__equation === 'string' ? this.__equation : '';
  }

  setEquation(equation: string): void {
    const writable = this.getWritable();
    writable.__equation = equation;
  }

  getTextContent(): string {
    return this.getEquation();
  }

  decorate(): React.ReactElement {
    return <GraphComponent equation={typeof this.__equation === 'string' ? this.__equation : JSON.stringify(this.__equation) ?? ''} invalidSource={typeof this.__equation !== 'string'} nodeKey={this.getKey()} />;
  }
}

export function $createGraphNode({ equation, key }: GraphPayload): GraphNode {
  return $applyNodeReplacement(new GraphNode(equation, key));
}

export function $isGraphNode(node: LexicalNode | null | undefined): node is GraphNode {
  return node instanceof GraphNode;
}
