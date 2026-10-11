"use client"

import type { DOMConversionMap, DOMExportOutput, ElementFormatType, NodeKey, Spread } from 'lexical';
import type { ReactElement } from 'react';
import { $applyNodeReplacement } from 'lexical';
import { DecoratorBlockNode, type SerializedDecoratorBlockNode } from '@lexical/react/LexicalDecoratorBlockNode';
import { BlockWithAlignableContents } from '@lexical/react/LexicalBlockWithAlignableContents';
import { validateEmbed, type Embed } from '@/app/editor/plugins/embed';

type SerializedEmbedNode = Spread<Embed, SerializedDecoratorBlockNode>;

export class EmbedNode extends DecoratorBlockNode {
  __provider: Embed['provider'];
  __id: string;

  static getType(): string {
    return 'embed';
  }

  static clone(node: EmbedNode): EmbedNode {
    return new EmbedNode({ provider: node.__provider, id: node.__id }, node.__format, node.__key);
  }

  constructor(embed: Embed, format?: ElementFormatType, key?: NodeKey) {
    super(format, key);
    const valid = validateEmbed(embed.provider, embed.id);
    this.__provider = valid?.provider ?? 'youtube';
    this.__id = valid?.id ?? '';
  }

  static importJSON(serializedNode: SerializedEmbedNode): EmbedNode {
    return $createEmbedNode(serializedNode).updateFromJSON(serializedNode);
  }

  exportJSON(): SerializedEmbedNode {
    return { ...super.exportJSON(), provider: this.__provider, id: this.__id };
  }

  static importDOM(): DOMConversionMap {
    return {
      div: element => {
        const embed = validateEmbed(element.getAttribute('data-tramo-embed'), element.getAttribute('data-tramo-embed-id'));
        return embed ? { conversion: () => ({ node: $createEmbedNode(embed) }), priority: 2 } : null;
      },
    };
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('div');
    element.setAttribute('data-tramo-embed', this.__provider);
    element.setAttribute('data-tramo-embed-id', this.__id);
    element.textContent = this.getTextContent();
    return { element };
  }

  getTextContent(): string {
    if (!this.__id) return '';
    return this.__provider === 'youtube'
      ? `https://www.youtube.com/watch?v=${this.__id}`
      : `https://x.com/i/web/status/${this.__id}`;
  }

  decorate(): ReactElement {
    if (!this.__id) return <p>Unavailable embed</p>;
    const youtube = this.__provider === 'youtube';
    return (
      <BlockWithAlignableContents nodeKey={this.getKey()} format={this.__format}
        className={{ base: 'editor-embed', focus: 'editor-embed-selected' }}>
        <iframe
          className={youtube ? 'editor-embed-video' : 'editor-embed-tweet'}
          src={youtube ? `https://www.youtube-nocookie.com/embed/${this.__id}` : `https://platform.twitter.com/embed/Tweet.html?id=${this.__id}&dnt=true`}
          title={youtube ? 'YouTube video' : 'Tweet'}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
          allow="encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
        <a href={this.getTextContent()} target="_blank" rel="noopener noreferrer" className="editor-link">
          {youtube ? 'Watch on YouTube' : 'View on X'}
        </a>
      </BlockWithAlignableContents>
    );
  }
}

export function $createEmbedNode(embed: Embed): EmbedNode {
  return $applyNodeReplacement(new EmbedNode(embed));
}
