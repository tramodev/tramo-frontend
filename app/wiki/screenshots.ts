type Screenshot = {
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
};

export const WIKI_SCREENSHOTS: Record<string, Record<string, Screenshot[]>> = {
  projects: {
    'Create a project': [{
      src: '/wiki/projects/create.jpg',
      alt: 'The Start writing card beside Try an example on My Projects.',
      caption: 'Start writing opens a blank project. Try an example gives you a project to explore and edit.',
      width: 600, height: 488,
    }],
    'Rename a project': [{
      src: '/wiki/projects/rename.jpg',
      alt: 'A project title being edited in the projects list.',
      caption: 'Choose Rename from the project menu, enter a title, then press Enter.',
      width: 640, height: 206,
    }],
    'Grid and list views': [{
      src: '/wiki/projects/grid.jpg',
      alt: 'Demonstration projects displayed as cards with Grid view selected.',
      caption: 'Grid view gives each project its own card.',
      width: 1168, height: 398,
    }, {
      src: '/wiki/projects/list.jpg',
      alt: 'The same demonstration projects displayed in List view.',
      caption: 'List view keeps project titles, visibility and edit dates in compact rows.',
      width: 1168, height: 354,
    }],
    'Sort projects': [{
      src: '/wiki/projects/sort.jpg',
      alt: 'The sorting menu with Last modified and Title options.',
      caption: 'Sort by your latest edits or by project title.',
      width: 280, height: 190,
    }],
    'Open in a new tab': [{
      src: '/wiki/projects/project-menu.jpg',
      alt: 'The project menu showing Rename, Open in new tab, Usage breakdown and Delete.',
      caption: 'Open in new tab keeps your current project available.',
      width: 280, height: 246,
    }],
    'Delete a project': [{
      src: '/wiki/projects/delete.jpg',
      alt: 'A confirmation dialog naming the demonstration project, with Cancel and Delete buttons.',
      caption: 'Check the project name before confirming. Cancel leaves the project untouched.',
      width: 560, height: 206,
    }],
    'Project text statistics': [{
      src: '/wiki/projects/statistics.jpg',
      alt: 'The editor header showing 1248 words and 7892 characters beside the export and sharing controls.',
      caption: 'The editor header shows totals for the whole project on wide screens.',
      width: 520, height: 80,
    }],
  },
  'notes-and-trails': {
    'Create and rename notes': [{
      src: '/wiki/notes-and-trails/create-note.jpg',
      alt: 'A new note titled Associative trails being added beneath the steps of Bush’s vision.',
      caption: 'The plus beside a trail creates a new note in that trail. A title is optional.',
      width: 304, height: 290,
    }, {
      src: '/wiki/notes-and-trails/rename-note.jpg',
      alt: 'The title Vannevar Bush being edited directly in the sidebar.',
      caption: 'Rename note opens the title field. Press Enter to keep the new name.',
      width: 304, height: 220,
    }],
    'Notes outside trails': [{
      src: '/wiki/notes-and-trails/outside-trails.jpg',
      alt: 'Questions to explore selected in Notes, with neither trail containing that note.',
      caption: 'Questions to explore belongs to the project without being a step in either trail. Notes lists every note in the project.',
      width: 304, height: 610,
    }],
    'Create and rename trails': [{
      src: '/wiki/notes-and-trails/create-trail.jpg',
      alt: 'A new trail title, Reading paths, being entered under the Trails heading.',
      caption: 'Use the plus beside Trails, enter a name, then press Enter.',
      width: 304, height: 300,
    }, {
      src: '/wiki/notes-and-trails/rename-trail.jpg',
      alt: 'The trail title Bush’s vision being changed to Bush’s associative trails.',
      caption: 'Rename trail changes the path’s name while keeping its notes and their order.',
      width: 304, height: 220,
    }],
    'Reuse a note': [{
      src: '/wiki/notes-and-trails/reuse-note.jpg',
      alt: 'Vannevar Bush appearing as step 2 in Bush’s vision and step 3 in Thinking in trails, with shared-note icons.',
      caption: 'One note, two trails: Vannevar Bush appears in both paths, at different positions.',
      width: 304, height: 354,
    }],
    'Shared-note indicators': [{
      src: '/wiki/notes-and-trails/shared-note.jpg',
      alt: 'Memex in both trails, with link icons in the sidebar and an editor notice saying edits appear in both.',
      caption: 'The link icon marks a shared note. The notice beneath its title names the trails that use it.',
      width: 960, height: 550,
    }],
    'Add an existing note': [{
      src: '/wiki/notes-and-trails/add-existing.jpg',
      alt: 'Questions to explore selected beneath Bush’s vision, beside the Add note button.',
      caption: 'Choose an existing note, then select Add note to include it in the trail.',
      width: 224, height: 190,
    }],
    'Remove a step': [{
      src: '/wiki/notes-and-trails/remove-step.jpg',
      alt: 'The Remove Vannevar Bush from this trail confirmation, explaining that the note stays in Notes.',
      caption: 'Remove affects this trail only. The note remains in the project and in any other trails that use it.',
      width: 560, height: 208,
    }],
    'Reorder steps': [{
      src: '/wiki/notes-and-trails/reorder-before.jpg',
      alt: 'Before reordering: Vannevar Bush is step 1 and As We May Think is step 2.',
      caption: 'Before: Vannevar Bush is the first step in the trail.',
      width: 304, height: 220,
    }, {
      src: '/wiki/notes-and-trails/reordered-steps.jpg',
      alt: 'After reordering: As We May Think is step 1 and Vannevar Bush is step 2.',
      caption: 'After moving the note down, the step numbers reflect the new reading order.',
      width: 304, height: 220,
    }],
    'Delete notes and trails': [{
      src: '/wiki/notes-and-trails/delete-note.jpg',
      alt: 'Delete note confirmation warning that Vannevar Bush will be removed from every trail and the project.',
      caption: 'Delete note permanently removes the note from the whole project.',
      width: 560, height: 208,
    }, {
      src: '/wiki/notes-and-trails/delete-trail.jpg',
      alt: 'Delete trail confirmation explaining that Bush’s vision will be deleted but its notes will stay in Notes.',
      caption: 'Delete trail removes the path. Its notes stay in the project.',
      width: 560, height: 208,
    }],
  },
  writing: {
    'Rich-text formatting': [{
      src: '/wiki/writing/rich-text.jpg',
      alt: 'The formatting toolbar above a note containing bold, italic, underlined, highlighted and inline-code text.',
      caption: 'Select text, then use the formatting buttons in the toolbar. You can combine formats on the same selection.',
      width: 890, height: 235,
    }],
    'Headings': [{
      src: '/wiki/writing/headings.jpg',
      alt: 'Look closely, Collect observations and Make connections displayed at three heading levels.',
      caption: 'Three heading levels give a note a clear hierarchy.',
      width: 660, height: 180,
    }],
    'Lists and checklists': [{
      src: '/wiki/writing/lists.jpg',
      alt: 'Bulleted observations, numbered instructions and a checklist with one completed task.',
      caption: 'Use bullets for collections, numbers for sequences and checklists for tasks. Select a checkbox to mark a task complete.',
      width: 650, height: 188,
    }],
    'Quotes': [{
      src: '/wiki/writing/quotes.jpg',
      alt: 'An italic quotation with a vertical line separating it from the surrounding note.',
      caption: 'Quote gives a passage its own block and a visual marker.',
      width: 690, height: 50,
    }],
    'Code blocks': [{
      src: '/wiki/writing/code.jpg',
      alt: 'A JavaScript code block with line numbers and highlighted strings and keywords.',
      caption: 'Code blocks preserve line breaks and highlight the selected language. This example uses JavaScript.',
      width: 675, height: 74,
    }],
    'Fonts and text size': [{
      src: '/wiki/writing/fonts.jpg',
      alt: 'The Arial font selector and the font-size control showing 15.',
      caption: 'Select text, choose a font and adjust its size with the number field or arrows.',
      width: 240, height: 53,
    }, {
      src: '/wiki/writing/font-example.jpg',
      alt: 'A larger line of text reading A larger idea deserves room.',
      caption: 'A larger text size can emphasize a passage without turning it into a heading.',
      width: 650, height: 50,
    }],
    'Text colors': [{
      src: '/wiki/writing/colors.jpg',
      alt: 'The text-color menu offering Default, Red, Orange, Green, Blue, Purple and Gray.',
      caption: 'Choose a palette color for selected text. Default returns it to the normal text color.',
      width: 200, height: 280,
    }],
    'Alignment': [{
      src: '/wiki/writing/alignment.jpg',
      alt: 'The alignment menu with Align left, Align center, Align right and Justify.',
      caption: 'Place the cursor in a paragraph, then choose its alignment.',
      width: 185, height: 195,
    }],
    'Web links': [{
      src: '/wiki/writing/web-links.jpg',
      alt: 'Explore the botanical collection displayed as a web link in the note.',
      caption: 'Give a link meaningful text so readers can understand its destination.',
      width: 650, height: 42,
    }],
    'Slash menu': [{
      src: '/wiki/writing/slash-menu.jpg',
      alt: 'Typing slash code filters the insertion menu to Code block.',
      caption: 'Type / at the start of a paragraph, then a block name to narrow the menu. Choose the matching result to insert it.',
      width: 265, height: 67,
    }],
    'Markdown shortcuts': [{
      src: '/wiki/writing/markdown-shortcuts.jpg',
      alt: 'Follow a new path shown as a level-two heading created with a Markdown shortcut.',
      caption: 'Type ## followed by a space to create Heading 2, then write your heading. The prefix becomes formatting.',
      width: 650, height: 55,
    }],
    'Move blocks': [{
      src: '/wiki/writing/move-blocks.jpg',
      alt: 'A six-dot drag handle beside a quote, directly above a code block.',
      caption: 'Move the pointer beside a block to reveal its drag handle, then drag it to a new position.',
      width: 690, height: 118,
    }, {
      src: '/wiki/writing/block-menu.jpg',
      alt: 'The Text Styles menu including Move block up and Move block down.',
      caption: 'You can also move the current block up or down from the Text Styles menu.',
      width: 220, height: 415,
    }],
    'Undo and redo': [{
      src: '/wiki/writing/undo-redo.jpg',
      alt: 'Undo and Redo arrow buttons at the start of the formatting toolbar.',
      caption: 'Undo reverses an edit. Redo reapplies an edit you have undone; unavailable actions appear dimmed.',
      width: 320, height: 50,
    }],
    'Automatic saving': [{
      src: '/wiki/writing/automatic-saving.jpg',
      alt: 'The project title Writing field notes followed by a checkmark and Saved.',
      caption: 'Saved confirms that changes reached the server. If saving fails, check the error and keep the tab open until the draft is safe.',
      width: 410, height: 48,
    }],
  },
};
