export type TitleAlign = "left" | "center" | "right";

export interface Idea {
    id: string;
    title: string;
    titleAlign: TitleAlign;
    content: string | null;
    linkedIdeaIds: string[];
}

export interface Path {
    id: string;
    title: string;
    ideaIds: string[];
}
