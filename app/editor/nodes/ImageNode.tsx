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
import ImageComponent from '../plugins/ImageComponent';


const IMAGE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ImagePayload {
  altText: string;
  src?: string;
  imageId?: string;
  width?: number;
  height?: number;
  caption?: string;
  key?: NodeKey;
}

function convertImageElement(domNode: Node): null | DOMConversionOutput {
  if (domNode instanceof HTMLImageElement) {
    const imageId = domNode.getAttribute('data-tramo-image-id');
    if (!imageId || !IMAGE_ID.test(imageId)) return null;
    const { alt: altText, width, height } = domNode;
    const node = $createImageNode({ altText, imageId, width, height });
    return { node };
  }
  return null;
}

export type SerializedImageNode = Spread<
  {
    altText: string;
    imageId: string;
    width?: number;
    height?: number;
    caption?: string;
  },
  SerializedLexicalNode
>;

export class ImageNode extends DecoratorNode<React.ReactElement> {
  __src: string;
  __imageId: string;
  __altText: string;
  __width: 'inherit' | number;
  __height: 'inherit' | number;
  __caption: string;

  static getType(): string {
    return 'image';
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__width,
      node.__height,
      node.__caption,
      node.__key,
      node.__imageId,
    );
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { altText, height, width, imageId, caption } = serializedNode;
    return $createImageNode({
      imageId: typeof imageId === 'string' && IMAGE_ID.test(imageId) ? imageId : '',
      altText: typeof altText === 'string' ? altText : '',
      height: typeof height === 'number' && height > 0 ? height : undefined,
      width: typeof width === 'number' && width > 0 ? width : undefined,
      caption: typeof caption === 'string' ? caption : '',
    });
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('img');
    element.setAttribute('data-tramo-image-id', this.__imageId);
    element.setAttribute('alt', this.__altText);
    if (this.__width !== 'inherit') {
      element.setAttribute('width', this.__width.toString());
    }
    if (this.__height !== 'inherit') {
      element.setAttribute('height', this.__height.toString());
    }
    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: () => ({
        conversion: convertImageElement,
        priority: 0,
      }),
    };
  }

  constructor(
    src: string,
    altText: string,
    width?: 'inherit' | number,
    height?: 'inherit' | number,
    caption?: string,
    key?: NodeKey,
    imageId = '',
  ) {
    super(key);
    this.__src = src.startsWith('blob:') ? src : '';
    this.__imageId = imageId;
    this.__altText = altText;
    this.__width = width || 'inherit';
    this.__height = height || 'inherit';
    this.__caption = caption || '';
  }

  exportJSON(): SerializedImageNode {
    return {
      altText: this.getAltText(),
      height: this.__height === 'inherit' ? undefined : this.__height,
      imageId: this.__imageId,
      width: this.__width === 'inherit' ? undefined : this.__width,
      caption: this.getCaption(),
      type: 'image',
      version: 2,
    };
  }

  setWidthAndHeight(
    width: 'inherit' | number,
    height: 'inherit' | number,
  ): void {
    const writable = this.getWritable();
    writable.__width = width;
    writable.__height = height;
  }

  setImageId(imageId: string): void {
    const writable = this.getWritable();
    writable.__imageId = imageId;
    writable.__src = '';
  }

  setAltText(altText: string): void {
    const writable = this.getWritable();
    writable.__altText = altText;
  }

  setCaption(caption: string): void {
    const writable = this.getWritable();
    writable.__caption = caption;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement('span');
    const className = config.theme.image;
    if (className !== undefined) {
      span.className = className;
    }
    return span;
  }

  updateDOM(): false {
    return false;
  }

  getAltText(): string {
    return this.__altText;
  }

  getCaption(): string {
    return this.__caption;
  }

  decorate(): React.ReactElement {
    return (
      <ImageComponent
        src={this.__src}
        imageId={this.__imageId}
        altText={this.__altText}
        width={this.__width}
        height={this.__height}
        caption={this.__caption}
        nodeKey={this.getKey()}
        resizable={true}
      />
    );
  }
}

export function $createImageNode({
  altText,
  height,
  src = '',
  imageId = '',
  width,
  caption,
  key,
}: ImagePayload): ImageNode {
  return $applyNodeReplacement(new ImageNode(src, altText, width, height, caption, key, imageId));
}

export function $isImageNode(
  node: LexicalNode | null | undefined,
): node is ImageNode {
  return node instanceof ImageNode;
}
