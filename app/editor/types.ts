export type TitleAlign = "left" | "center" | "right";

export interface Item {
    id: string;
    title: string;
    titleAlign: TitleAlign;
    content: string | null;
    linkedItemIds: string[];
}

export interface Trail {
    id: string;
    title: string;
    itemIds: string[];
}
