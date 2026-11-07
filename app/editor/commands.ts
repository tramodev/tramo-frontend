// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { createCommand, type LexicalCommand } from 'lexical';
import type { ImagePayload } from '@/app/editor/nodes/ImageNode';
import type { Embed } from '@/app/editor/plugins/embed';

export type InsertEquationPayload = Readonly<{
  equation: string;
  inline: boolean;
}>;

export type InsertImagePayload = Readonly<ImagePayload>;

export const INSERT_EQUATION_COMMAND: LexicalCommand<InsertEquationPayload> = createCommand('INSERT_EQUATION_COMMAND');
export const INSERT_MUSIC_COMMAND: LexicalCommand<void> = createCommand('INSERT_MUSIC_COMMAND');
export const INSERT_IMAGE_COMMAND: LexicalCommand<InsertImagePayload> = createCommand('INSERT_IMAGE_COMMAND');
export const OPEN_EMBED_DIALOG_COMMAND: LexicalCommand<void> = createCommand('OPEN_EMBED_DIALOG_COMMAND');
export const INSERT_EMBED_COMMAND: LexicalCommand<Embed> = createCommand('INSERT_EMBED_COMMAND');
export const OPEN_LINK_EDITOR_COMMAND: LexicalCommand<void> = createCommand('OPEN_LINK_EDITOR_COMMAND');
export const OPEN_FIND_REPLACE_COMMAND: LexicalCommand<void> = createCommand('OPEN_FIND_REPLACE_COMMAND');
