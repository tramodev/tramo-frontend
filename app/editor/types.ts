// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
export type TitleAlign = "left" | "center" | "right";

export type AssociationType =
    | "REQUIRES"
    | "ELABORATES"
    | "CONTRADICTS"
    | "EXAMPLE_OF"
    | "RELATED";

export type AssociationTargetType = "ITEM" | "TRAIL";

export interface Association {
    id: string;
    type: AssociationType;
    targetType: AssociationTargetType;
    targetId: string;
    targetTitle: string;
}

export interface Item {
    id: string;
    title: string;
    titleAlign: TitleAlign;
    unfiled: boolean;
    content: string | null;
    textStats?: { words: number; characters: number };
    associations: Association[];
    linkedItemIds: string[];
}

export interface TrailStep {
    itemId: string;
    annotation: string | null;
    associationId: string | null;
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
