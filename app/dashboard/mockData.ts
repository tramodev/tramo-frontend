import { Idea, Path } from './types';

export const MOCK_IDEAS: Record<string, Idea> = {
    'idea-1-1': {
        id: 'idea-1-1',
        title: 'Problem Statement',
        content: '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"People struggle to find recipes based on ingredients they already have.","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}',
        linkedIdeaIds: ['idea-1-2'],
    },
    'idea-1-2': {
        id: 'idea-1-2',
        title: 'Target Audience',
        content: '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Busy professionals, students, and home cooks wanting to reduce food waste.","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}',
        linkedIdeaIds: ['idea-1-1'],
    },
    'idea-1-3': {
        id: 'idea-1-3',
        title: 'MVP Features',
        content: '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"1. Ingredient scanner\\n2. Recipe generator\\n3. Shopping list integration","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}',
        linkedIdeaIds: [],
    },
    'idea-2-1': {
        id: 'idea-2-1',
        title: 'New Hooks',
        content: '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Research useActionState and useFormStatus.","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}',
        linkedIdeaIds: [],
    },
    'idea-2-2': {
        id: 'idea-2-2',
        title: 'Compiler',
        content: '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Understand how React Compiler auto-memoizes components.","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}',
        linkedIdeaIds: [],
    },
    // Shared between the "Learning Path: React 19" and "Personal Goals 2024" paths.
    'idea-2-3': {
        id: 'idea-2-3',
        title: 'Server Components',
        content: '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Deep dive into RSC patterns and best practices.","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}',
        linkedIdeaIds: ['idea-3-2'],
    },
    'idea-3-1': {
        id: 'idea-3-1',
        title: 'Health',
        content: '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Run a marathon. Drink more water.","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}',
        linkedIdeaIds: [],
    },
    'idea-3-2': {
        id: 'idea-3-2',
        title: 'Career',
        content: '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Get promoted to Senior Engineer.","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}',
        linkedIdeaIds: ['idea-2-3'],
    },
};

export const MOCK_PATHS: Path[] = [
    {
        id: 'path-1',
        title: 'Startup Idea: AI Chef',
        ideaIds: ['idea-1-1', 'idea-1-2', 'idea-1-3'],
    },
    {
        id: 'path-2',
        title: 'Learning Path: React 19',
        ideaIds: ['idea-2-1', 'idea-2-2', 'idea-2-3'],
    },
    {
        id: 'path-3',
        title: 'Personal Goals 2024',
        // idea-2-3 is shared with path-2, demonstrating an idea linked to two paths.
        ideaIds: ['idea-3-1', 'idea-3-2', 'idea-2-3'],
    },
];
