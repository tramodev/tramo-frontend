export type TitleAlign = "left" | "center" | "right";

export type AssociationType =
    | "REQUIRES"
    | "ELABORATES"
    | "CONTRADICTS"
    | "EXAMPLE_OF"
    | "RELATED";

export type AssociationTargetType = "ITEM" | "TRAIL";

export interface Association {
    // The association's own id — lets a TrailStep.associationId resolve back to it.
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
    content: string | null;
    // Outgoing typed associations (item→item or item→trail).
    associations: Association[];
    // Convenience view of ITEM-target associations, kept for the graph/panel.
    linkedItemIds: string[];
}

export interface TrailStep {
    itemId: string;
    // Human note linking this step to the next; null = none yet.
    annotation: string | null;
    // Which association was used to jump here; null = deliberate jump.
    associationId: string | null;
}

export interface Trail {
    id: string;
    title: string;
    itemIds: string[];
    // Per-step metadata (annotation + association), aligned with itemIds order.
    steps: TrailStep[];
    version: number;
    forkedFrom: string | null;
}
