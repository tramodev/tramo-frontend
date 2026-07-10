export interface Idea {
    id: string;
    title: string;
    content: string; // Serialized Lexical state or HTML
    linkedIdeaIds: string[]; // ids of other ideas linked to this one
}

export interface Path {
    id: string;
    title: string;
    ideaIds: string[]; // ordered ids of ideas belonging to this path (an idea can belong to more than one path)
}
