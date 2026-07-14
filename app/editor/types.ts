export interface Idea {
    id: string;
    title: string;
    content: string;
    linkedIdeaIds: string[];
}

export interface Path {
    id: string;
    title: string;
    ideaIds: string[];
}
