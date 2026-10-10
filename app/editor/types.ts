// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
export type TitleAlign = "left" | "center" | "right";

export interface Item {
    id: string;
    title: string;
    titleAlign: TitleAlign;
    unfiled: boolean;
    content: string | null;
    textStats?: { words: number; characters: number };
}

export interface TrailStep {
    itemId: string;
}

export interface Trail {
    id: string;
    title: string;
    description: string;
    itemIds: string[];
    steps: TrailStep[];
    version: number;
    forkedFrom: string | null;
}
