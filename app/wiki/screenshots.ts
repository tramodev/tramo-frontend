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
};
