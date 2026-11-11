type Screenshot = {
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
};

export const WIKI_SCREENSHOTS: Record<string, Record<string, Screenshot[]>> = {
  'getting-started': {
    'Example project': [{
      src: '/wiki/getting-started/01-example-project.webp',
      alt: 'On My Projects, the Try an example card, with a preview of the Memex and Vannevar Bush example, is highlighted beside Start writing.',
      caption: 'Choose Try an example to open an editable copy of the Memex and Vannevar Bush example project.',
      width: 656, height: 638,
    }],
    'Editor walkthrough': [{
      src: '/wiki/getting-started/02-editor-walkthrough.webp',
      alt: 'The editor walkthrough highlights the sidebar with a Trails & notes popover, step 1 of 5, with Previous and Next buttons.',
      caption: 'The guided tour points out each part of the editor. Use Next and Previous to move through the steps.',
      width: 776, height: 526,
    }, {
      src: '/wiki/getting-started/02b-replay-tutorial.webp',
      alt: 'The Tutorials section in Settings offers a Replay editor tutorial button.',
      caption: 'To see the tour again, open Settings and choose Replay editor tutorial. The walkthrough starts the next time you open a project.',
      width: 576, height: 220,
    }],
    'Appearance': [{
      src: '/wiki/getting-started/03-appearance.webp',
      alt: 'The account menu is open with its Theme submenu, which offers Use device theme, Light theme and Dark theme, with Dark theme selected.',
      caption: 'Open the account menu, choose Theme and pick light, dark or your device setting.',
      width: 616, height: 356,
    }],
  },
  'projects': {
    'Create a project': [{
      src: '/wiki/projects/01-create.webp',
      alt: 'The Start writing card is highlighted on My Projects, beside Try an example.',
      caption: 'Choose Start writing to open a blank project. It is saved automatically as you write.',
      width: 656, height: 638,
    }],
    'Rename a project': [{
      src: '/wiki/projects/02-rename.webp',
      alt: 'In the My Projects list, the History of jazz title is being edited inline to History of jazz, 1890–1940.',
      caption: 'Type the new title and press Enter to save it, or Escape to cancel.',
      width: 736, height: 414,
    }, {
      src: '/wiki/projects/02b-project-menu.webp',
      alt: 'The three-dot menu of the History of jazz card is open, with Rename, Open in new tab, Usage breakdown and Delete.',
      caption: 'Open the three-dot menu on a project to rename, open, check the storage of or delete it.',
      width: 526, height: 526,
    }],
    'Delete a project': [{
      src: '/wiki/projects/03-delete.webp',
      alt: 'The Delete project "History of jazz"? confirmation says This can\'t be undone, with Cancel and Delete.',
      caption: 'Check the project title before confirming. Deletion is permanent; choose Cancel to keep the project.',
      width: 736, height: 376,
    }],
  },
  'notes-and-trails': {
    'Create and rename notes': [{
      src: '/wiki/notes-and-trails/01-create-note.webp',
      alt: 'The plus beside New Orleans roots is highlighted and a new step title, Jelly Roll Morton, is being typed below Louis Armstrong.',
      caption: 'Select the plus beside a trail to add a note as its next step. Press Enter to save the title.',
      width: 360, height: 347,
    }, {
      src: '/wiki/notes-and-trails/01b-note-actions.webp',
      alt: 'The three-dot menu of Storyville in New Orleans roots lists Rename note, Move note up, Move note down, Move to another trail, Add to another trail, Remove from this trail and Delete note.',
      caption: 'Each step has a three-dot menu with the actions for that note in this trail.',
      width: 526, height: 476,
    }, {
      src: '/wiki/notes-and-trails/02-rename-note.webp',
      alt: 'Storyville is being renamed in the sidebar to Storyville, 1897–1917.',
      caption: 'Choose Rename note and type the new title. Enter saves it and Escape cancels the change.',
      width: 360, height: 315,
    }],
    'Notes outside trails': [{
      src: '/wiki/notes-and-trails/03-outside-trails.webp',
      alt: 'The Notes list shows every note in the project, with Questions to explore, a note that is in no trail, selected.',
      caption: 'Use the plus beside Notes to create a note outside any trail. The Notes list contains every note in the project.',
      width: 360, height: 697,
    }],
    'Create and rename trails': [{
      src: '/wiki/notes-and-trails/04-create-trail.webp',
      alt: 'The plus beside Trails is highlighted and a new trail named Bebop and beyond is being typed above the two existing trails.',
      caption: 'Select the plus beside Trails, enter a name and press Enter to create the trail.',
      width: 360, height: 333,
    }, {
      src: '/wiki/notes-and-trails/05-rename-trail.webp',
      alt: 'The swing era trail is being renamed in the sidebar to The swing era, 1930s.',
      caption: 'Choose Rename trail to change its name. The notes in the trail stay the same.',
      width: 360, height: 347,
    }, {
      src: '/wiki/notes-and-trails/05b-trail-actions.webp',
      alt: 'The three-dot menu of The swing era lists Rename trail, Move trail up, Move trail down, Add existing note and Delete trail.',
      caption: 'Open a trail’s three-dot menu to rename, move or delete it, or to add a note that already exists.',
      width: 526, height: 396,
    }],
    'Reuse a note': [{
      src: '/wiki/notes-and-trails/06-reuse-note.webp',
      alt: 'Louis Armstrong appears as step 3 in both New Orleans roots and The swing era, each with a link icon.',
      caption: 'Add to another trail reuses the same note. Edits appear everywhere it is used, while each trail keeps its own order.',
      width: 360, height: 450,
    }],
    'Shared-note indicators': [{
      src: '/wiki/notes-and-trails/07-shared-note.webp',
      alt: 'Under the Louis Armstrong title, a notice reads Used in 2 trails. Edits appear in both, with links to New Orleans roots and The swing era.',
      caption: 'A link icon in the sidebar and a notice under the title show that a note is used in more than one trail.',
      width: 1016, height: 616,
    }],
    'Add an existing note': [{
      src: '/wiki/notes-and-trails/08-add-existing.webp',
      alt: 'Under New Orleans roots, Questions to explore is chosen in the note dropdown, with Add note highlighted and Cancel beside it.',
      caption: 'Choose Add existing note from the trail menu, pick a note and select Add note.',
      width: 396, height: 355,
    }],
    'Remove a step': [{
      src: '/wiki/notes-and-trails/09-remove-step.webp',
      alt: 'The Remove "Louis Armstrong" from this trail? dialog says the note is kept in your Notes list, with Cancel and Remove.',
      caption: 'Removing a step takes the note out of this trail only. It stays in Notes and in any other trail.',
      width: 736, height: 386,
    }],
    'Reorder steps': [{
      src: '/wiki/notes-and-trails/10-reorder-before.webp',
      alt: 'Storyville is the first step of New Orleans roots and its menu is open with Move note down focused.',
      caption: 'Drag a step or use Move note up and Move note down to change the reading order.',
      width: 526, height: 386,
    }, {
      src: '/wiki/notes-and-trails/11-reordered-steps.webp',
      alt: 'After the move, Storyville is step 2 of New Orleans roots, after Congo Square.',
      caption: 'The step numbers update to match the new order.',
      width: 360, height: 315,
    }],
    'Delete notes and trails': [{
      src: '/wiki/notes-and-trails/12-delete-note.webp',
      alt: 'The Delete note "Count Basie"? dialog says it is removed from every trail and the project, with Cancel and Delete.',
      caption: 'Delete note removes the note from the project and from every trail that uses it.',
      width: 736, height: 386,
    }, {
      src: '/wiki/notes-and-trails/13-delete-trail.webp',
      alt: 'The Delete trail "The swing era"? dialog says its notes are kept in the Notes list, with Cancel and Delete.',
      caption: 'Delete trail removes the reading path. Its notes stay in Notes and in any other trail.',
      width: 736, height: 386,
    }],
  },
  'writing': {
    'Formatting': [{
      src: '/wiki/writing/01-formatting.webp',
      alt: 'The editor with the formatting toolbar above the note Storyville, which has bold dates, a highlighted phrase, a heading, a bulleted list and a quote.',
      caption: 'Use the toolbar, the slash menu or Markdown shortcuts to format a note.',
      width: 1236, height: 656,
    }],
    'Slash menu': [{
      src: '/wiki/writing/02-slash-menu.webp',
      alt: 'Typing /code in a note shows a menu with the Code block option.',
      caption: 'Type / and keep typing to filter the blocks you can insert.',
      width: 576, height: 226,
    }, {
      src: '/wiki/writing/02b-slash-menu-all.webp',
      alt: 'Typing / alone opens the full insert menu, starting with Text, Heading 1, Heading 2, Heading 3, Bulleted list, Numbered list and Multilevel list.',
      caption: 'Type / on its own to browse every block you can insert.',
      width: 576, height: 416,
    }],
    'Move blocks': [{
      src: '/wiki/writing/03-move-blocks.webp',
      alt: 'The drag handle beside a quote is highlighted above a code block listing three early jazz recordings from 1917 to 1925.',
      caption: 'Drag a block by its handle to move it within the note.',
      width: 756, height: 218,
    }, {
      src: '/wiki/writing/03b-block-menu.webp',
      alt: 'The block type menu in the toolbar is open with the block types, and Move block up and Move block down at the end.',
      caption: 'You can also move the current block from the block type menu.',
      width: 656, height: 544,
    }],
    'Automatic saving': [{
      src: '/wiki/writing/04-automatic-saving.webp',
      alt: 'Saving appears with a spinner next to the History of jazz title in the editor header.',
      caption: 'Changes save automatically. Saving appears beside the title while they are sent.',
      width: 536, height: 123,
    }, {
      src: '/wiki/writing/04b-not-saved.webp',
      alt: 'Not saved appears next to the title, with the red message Offline. Reconnecting; your edits stay in this tab until the connection returns.',
      caption: 'If changes cannot be saved, Not saved appears beside the title with the reason.',
      width: 616, height: 123,
    }],
  },
  'images-and-blocks': {
    'Image uploads': [{
      src: '/wiki/images-and-blocks/01-insert-image.webp',
      alt: 'The insert menu in the toolbar is open with Image focused, between Table and Inline equation.',
      caption: 'Open the insert menu and choose Image to upload a picture into the note.',
      width: 676, height: 386,
    }],
    'Resize images': [{
      src: '/wiki/images-and-blocks/02-resize-image.webp',
      alt: 'A photo of Louis Armstrong playing trumpet is selected in a note, with resize handles on its corners and edges and an Alt text badge.',
      caption: 'Select an image and drag its handles to change its displayed size.',
      width: 616, height: 490,
    }],
    'Captions and alt text': [{
      src: '/wiki/images-and-blocks/03-caption-alt-text.webp',
      alt: 'The alt text field reads Louis Armstrong smiling, holding his trumpet, and the caption below the photo reads Louis Armstrong, 1953.',
      caption: 'Add a visible caption below the image and alt text that describes it for screen readers.',
      width: 616, height: 438,
    }],
    'Equations': [{
      src: '/wiki/images-and-blocks/04-equation-editor.webp',
      alt: 'The equation editor shows the LaTeX for the swing ratio, a row of symbol buttons and the rendered fraction r = t long over t short ≈ 2.',
      caption: 'Write LaTeX in the equation editor. The preview updates as you type.',
      width: 656, height: 352,
    }, {
      src: '/wiki/images-and-blocks/04b-equation-rendered.webp',
      alt: 'In the note, the swing ratio equation appears as a centred block and r = 1 appears inline in the next sentence.',
      caption: 'Equations can sit on their own line or inline in a sentence.',
      width: 656, height: 273,
    }],
    'Music notation': [{
      src: '/wiki/images-and-blocks/05-music-editor.webp',
      alt: 'A music block shows the ABC notation for When the Saints Go Marching In and, below it, the rendered score.',
      caption: 'Write the tune in ABC notation. The score is rendered below the source.',
      width: 656, height: 540,
    }],
    'Embeds': [{
      src: '/wiki/images-and-blocks/06-embed-dialog.webp',
      alt: 'The Embed a tweet or video dialog contains a YouTube URL, with Cancel and Embed.',
      caption: 'Paste the URL of a public YouTube video or X / Twitter post and choose Embed.',
      width: 568, height: 295,
    }],
  },
  'connections-and-map': {
    'Note mentions': [{
      src: '/wiki/connections-and-map/01-note-mentions.webp',
      alt: 'Typing @ in a note opens a list of notes: Congo Square, Louis Armstrong, Duke Ellington, Count Basie and Questions to explore.',
      caption: 'Type @ and choose a note to link to it.',
      width: 656, height: 346,
    }],
    'Wiki-style links': [{
      src: '/wiki/connections-and-map/02-wiki-links.webp',
      alt: 'Typing [[Lou in a note suggests Louis Armstrong.',
      caption: 'Type [[ and the start of a title to insert the same kind of note reference.',
      width: 656, height: 236,
    }],
    'Follow a reference': [{
      src: '/wiki/connections-and-map/03-reference.webp',
      alt: 'Selecting the Storyville reference in Congo Square opens a preview of the note with an Open note button.',
      caption: 'Select a reference to preview the note, then choose Open note to go there.',
      width: 656, height: 436,
    }],
    'Connections panel': [{
      src: '/wiki/connections-and-map/04-connections-panel.webp',
      alt: 'The Connections (2) panel for Storyville lists mentions from Congo Square and Louis Armstrong, above a small map preview with Open map.',
      caption: 'The connections panel lists the mentions to and from the selected note.',
      width: 344, height: 616,
    }],
    'Extract to a new note': [{
      src: '/wiki/connections-and-map/05a-extract-button.webp',
      alt: 'A paragraph about the Great Migration is selected in Storyville, and an Extract to new note button appears above the selection.',
      caption: 'Select the text you want to move and choose Extract to new note.',
      width: 676, height: 317,
    }, {
      src: '/wiki/connections-and-map/05-extract-note.webp',
      alt: 'The Extract to new note dialog has the title The Great Migration, Leave a link in the original note checked and Create as Next step in this trail.',
      caption: 'Name the new note and choose where to create it. A reference replaces the selected text.',
      width: 568, height: 454,
    }, {
      src: '/wiki/connections-and-map/05b-extraction-placement.webp',
      alt: 'The Create as menu is set to Note outside trails.',
      caption: 'Create the note as the next or last step of the current trail, or outside trails. Extraction cannot be undone with normal Undo.',
      width: 544, height: 199,
    }],
    'Project map': [{
      src: '/wiki/connections-and-map/06-project-map.webp',
      alt: 'The project map shows New Orleans roots, The swing era and Notes without a trail as columns, with the shared Louis Armstrong note and lines for each mention.',
      caption: 'The map shows trails side by side, shared notes and the connections between them.',
      width: 1156, height: 658,
    }, {
      src: '/wiki/connections-and-map/06b-map-preview.webp',
      alt: 'Beside the note Storyville, the connections panel shows a highlighted map preview with Open map.',
      caption: 'The connections panel keeps a small map preview beside your writing.',
      width: 916, height: 616,
    }],
    'Navigate and customize the map': [{
      src: '/wiki/connections-and-map/07-map-navigation.webp',
      alt: 'The map zoom in, zoom out and fit view controls are highlighted in the corner of the map.',
      caption: 'Drag to pan, use the controls to zoom or fit the view, and open a note from its card.',
      width: 616, height: 358,
    }, {
      src: '/wiki/connections-and-map/07b-map-colors.webp',
      alt: 'Right-clicking Storyville on the map opens Background color, with orange selected and the card tinted orange.',
      caption: 'Right-click a note or trail to choose its background color.',
      width: 696, height: 388,
    }],
  },
  'navigation': {
    'Project note search': [{
      src: '/wiki/navigation/01-project-search.webp',
      alt: 'Searching or in the sidebar finds the trail New Orleans roots and the notes Storyville and Questions to explore.',
      caption: 'Search from the sidebar or press Cmd/Ctrl+P to find notes and trails in the project.',
      width: 360, height: 306,
    }],
    'Continuous trail reading': [{
      src: '/wiki/navigation/02-continuous-reading.webp',
      alt: 'Congo Square and Storyville, steps 1 and 2 of the trail, follow each other in one continuous editor view.',
      caption: 'Scroll through a trail’s notes one after another in a single view.',
      width: 776, height: 486,
    }, {
      src: '/wiki/navigation/02b-next-trail.webp',
      alt: 'At the end of the trail, after Louis Armstrong, a Next trail: The swing era button shows its keyboard shortcut.',
      caption: 'At the end of a trail, continue to the next trail.',
      width: 736, height: 393,
    }],
    'Keyboard navigation': [{
      src: '/wiki/navigation/03-keyboard-navigation.webp',
      alt: 'The Navigate shortcuts list, with Previous / next note, continuing across trails at the first / last note highlighted.',
      caption: 'Use the keyboard to move between titles, content, steps and trails.',
      width: 576, height: 360,
    }],
    'Shortcut reference': [{
      src: '/wiki/navigation/04-shortcut-reference.webp',
      alt: 'The Keyboard shortcuts dialog lists Navigate and Insert shortcuts, and explains that Cmd/ opens and closes it.',
      caption: 'Press Cmd/Ctrl+/ to open the shortcut reference.',
      width: 568, height: 696,
    }, {
      src: '/wiki/navigation/05-writing-shortcuts.webp',
      alt: 'The Write section of the shortcut reference lists bold, italic, underline, moving blocks, indent, undo, headings and lists.',
      caption: 'The reference also lists the writing shortcuts.',
      width: 576, height: 285,
    }],
  },
  'publishing': {
    'Visibility': [{
      src: '/wiki/publishing/01-visibility.webp',
      alt: 'Published is selected in the Visibility settings and marked unsaved. Private, the other option, reads Only you and the people you share it with.',
      caption: 'Choose Private to keep the project to you and the people you share it with, or Published to list it on Explore. Then confirm with Save or Publish.',
      width: 436, height: 310,
    }],
    'Project descriptions': [{
      src: '/wiki/publishing/02-description.webp',
      alt: 'The Description field introduces History of jazz, a trail from Congo Square and Storyville to the swing bands, with a 127 of 255 character counter.',
      caption: 'Write a short introduction that helps readers understand the project. The description also appears in its preview card.',
      width: 436, height: 253,
    }],
    'Tags': [{
      src: '/wiki/publishing/03-tags.webp',
      alt: 'Typing jaz after music and history in Tags suggests jazz, jazz-age and jazz-piano, each with its usage count.',
      caption: 'Separate tags with commas. Start typing to choose an existing topic from the suggestions.',
      width: 436, height: 300,
    }],
    'Public thumbnails': [{
      src: '/wiki/publishing/04-thumbnail.webp',
      alt: 'The Thumbnail section shows a snapshot of the project map with two trails, the notice that thumbnails are public, and the Map snapshot and Upload buttons.',
      caption: 'Use Map snapshot to create a cover from the project map, or Upload to choose an image. Thumbnails are public, so keep confidential information out of them.',
      width: 436, height: 426,
    }],
    'Publication preview': [{
      src: '/wiki/publishing/05-publication-preview.webp',
      alt: 'Explore preview shows History of jazz as Your project, with its author, description, music, history and jazz tags and a map thumbnail, below a faded neighbouring project.',
      caption: 'Review the highlighted card before publishing. It reflects the description, tags and thumbnail you choose on the Publish screen.',
      width: 696, height: 580,
    }],
    'Copy a sharing link': [{
      src: '/wiki/publishing/06-copy-link.webp',
      alt: 'The Publish screen footer shows Open public link, a checked Copied button and Update.',
      caption: 'After publishing, choose Copy to copy the reader-facing link. Open public link opens the same reading view.',
      width: 436, height: 125,
    }],
    'Published snapshots and history': [{
      src: '/wiki/publishing/07a-publish-update.webp',
      alt: 'For an already published project, the Publish screen offers Update beside Open public link and Copy.',
      caption: 'Later edits stay in the draft until you choose Update. Updating publishes a new snapshot for readers.',
      width: 436, height: 125,
    }, {
      src: '/wiki/publishing/07b-publish-history.webp',
      alt: 'Version history with Published selected lists Version 3, Version 2 and Version 1 with their publication dates and an open-in-new-tab icon.',
      caption: 'In the editor, open Version history and choose Published. Each publication has its own link to that version.',
      width: 376, height: 347,
    }],
    'Reader view': [{
      src: '/wiki/publishing/08-reader-view.webp',
      alt: 'The public reading view of History of jazz shows the trails in the sidebar, the project description, the New Orleans roots trail and its first note, Congo Square, with reader actions and map controls.',
      caption: 'Readers can follow trails, open notes and explore connections in the public reading view. The shared content is presented without the editing toolbar.',
      width: 936, height: 616,
    }],
    'Export a project': [{
      src: '/wiki/publishing/09-export.webp',
      alt: 'The Export menu in the editor header offers Markdown, HTML, PDF and Word, with HTML highlighted.',
      caption: 'Choose Export, the download icon in the editor header, then pick a format. Tramo saves pending changes before preparing the download.',
      width: 656, height: 413,
    }],
  },
  'collaboration': {
    'Invite people': [{
      src: '/wiki/collaboration/01a-invite-find-user.webp',
      alt: 'In the Share History of jazz dialog, bruno is typed under Add people by username and @bruno appears with Invite.',
      caption: 'Type a username under Add people by username, then choose Invite on the matching person.',
      width: 568, height: 526,
    }, {
      src: '/wiki/collaboration/01b-invite-pick-role.webp',
      alt: 'The invite step shows @bruno with the Can edit role selected, and Cancel and Send buttons.',
      caption: 'Pick Can edit or Can view, then Send. The project appears in their My Projects, even while it is private.',
      width: 568, height: 317,
    }],
    'Roles': [{
      src: '/wiki/collaboration/02-roles-menu.webp',
      alt: 'People with access lists ana as Owner, bruno with Can edit and a remove button, and carla with her role menu open on Can view.',
      caption: 'Change a role from the menu beside a name, or remove someone with the X. Only the owner can manage access.',
      width: 568, height: 489,
    }],
    'Share with a link': [{
      src: '/wiki/collaboration/03-share-with-link.webp',
      alt: 'General access is set to Anyone with the link with the Can edit role, used 2 times. diego appears in People with access marked via link.',
      caption: 'Under General access, choose Anyone with the link and pick a role. People who join through the link are marked via link.',
      width: 568, height: 534,
    }],
    'Edit together in real time': [{
      src: '/wiki/collaboration/04-edit-together.webp',
      alt: 'In the note Storyville, carla has selected red-light district of New Orleans and bruno is typing at the end of the last paragraph. Each cursor carries a colored name label.',
      caption: 'Everyone with edit access can write in the same note at once. Each cursor shows the person’s name and color.',
      width: 648, height: 383,
    }],
    'See who is here': [{
      src: '/wiki/collaboration/05a-presence-avatars.webp',
      alt: 'Four avatars in the editor header: you, bruno writing, carla viewing and diego idle and faded. A tooltip on bruno reads bruno · Editor, Writing in Storyville.',
      caption: 'Avatars show who has the project open and whether they are viewing, writing or idle. Select one to jump to that person’s note.',
      width: 648, height: 179,
    }, {
      src: '/wiki/collaboration/05b-sidebar-presence-dots.webp',
      alt: 'In the sidebar, Storyville has two colored dots for bruno and carla, and Duke Ellington has a faded dot for an idle collaborator.',
      caption: 'A colored dot beside a note shows that someone else is there.',
      width: 346, height: 448,
    }, {
      src: '/wiki/collaboration/05c-everyone-here.webp',
      alt: 'The People in this project dialog lists seven people here now, each with a role and a status such as Writing in Storyville or Idle for 6 min.',
      caption: 'With more than five people, or on a phone, select +N or the avatars to see everyone.',
      width: 440, height: 546,
    }],
    'Working offline': [{
      src: '/wiki/collaboration/06-offline.webp',
      alt: 'Not saved appears next to the project title, with the message Offline. Reconnecting; your edits stay in this tab until the connection returns.',
      caption: 'If the connection drops, your edits stay in the tab and are sent when the connection returns.',
      width: 568, height: 301,
    }],
    'Restoring a version': [{
      src: '/wiki/collaboration/07-restore-version.webp',
      alt: 'The Restore this version? dialog explains that the current project is kept as a safety version, with Cancel and Restore version.',
      caption: 'Restoring a version updates the project for everyone who has it open.',
      width: 648, height: 438,
    }],
    'Losing access or leaving': [{
      src: '/wiki/collaboration/08a-access-removed.webp',
      alt: 'A dialog over the editor says You no longer have access to this project and offers Back to projects.',
      caption: 'If the owner removes you or turns off the link you joined with, Tramo explains it and takes you back to your projects.',
      width: 648, height: 438,
    }, {
      src: '/wiki/collaboration/08b-leave-project.webp',
      alt: 'On My Projects, the menu for History of jazz, shared by @ana with Can edit, is open with Leave project highlighted.',
      caption: 'To leave a shared project, open its menu on My Projects and choose Leave project.',
      width: 616, height: 312,
    }],
  },
  'community': {
    'Explore search': [{
      src: '/wiki/community/01-explore-search.webp',
      alt: 'Searching jazz on Explore returns The road to bebop and History of jazz.',
      caption: 'Search Explore for projects published by the community.',
      width: 1096, height: 800,
    }],
    'Explore feeds': [{
      src: '/wiki/community/02-explore-feeds.webp',
      alt: 'The Explore feed selector shows Recent, Hot and Following, with Recent selected.',
      caption: 'Choose Recent, Hot or Following. Following appears when you are logged in.',
      width: 400, height: 131,
    }],
    'Featured projects and topics': [{
      src: '/wiki/community/03-featured.webp',
      alt: 'Kansas City swing by carla appears under Featured today, with its description, tags, votes, views and comments.',
      caption: 'Featured projects are highlighted at the top of Explore.',
      width: 1136, height: 445,
    }, {
      src: '/wiki/community/03b-topics-authors.webp',
      alt: 'The Explore side panel lists Trending projects, Popular topics with jazz highlighted, and Popular authors.',
      caption: 'Browse trending projects, popular topics and active authors.',
      width: 328, height: 722,
    }],
    'Upvotes': [{
      src: '/wiki/community/04-upvote.webp',
      alt: 'The upvote button on The road to bebop is selected and shows 25 votes.',
      caption: 'Upvote a project you find useful. Select it again to remove your vote.',
      width: 816, height: 318,
    }],
    'Bookmarks': [{
      src: '/wiki/community/05-bookmark.webp',
      alt: 'The bookmark icon on the featured project Kansas City swing is filled and highlighted.',
      caption: 'Bookmark a project to find it later under Bookmarks on your profile.',
      width: 1136, height: 445,
    }],
    'Comments and replies': [{
      src: '/wiki/community/06-comments-replies.webp',
      alt: 'The Comments thread on History of jazz shows comments from carla and bruno, a reply from ana and an open reply box.',
      caption: 'Comment on a project and reply to others when the author allows comments.',
      width: 736, height: 581,
    }, {
      src: '/wiki/community/06b-delete-comment.webp',
      alt: 'The Delete this comment? dialog says it can\'t be undone and that the thread stays intact if it has replies.',
      caption: 'You can delete your own comments. Deletion is permanent; replies are kept.',
      width: 736, height: 476,
    }],
    'Follow authors': [{
      src: '/wiki/community/07-follow-author.webp',
      alt: 'On carla’s profile, the Following button is highlighted next to her name, with her location, join date and follower counts.',
      caption: 'Select Follow on an author’s profile. Select Following to unfollow.',
      width: 1056, height: 311,
    }, {
      src: '/wiki/community/07b-followers.webp',
      alt: 'carla’s follower list shows 128 Followers and 41 Following, with ana, bruno and elena and their Follow buttons.',
      caption: 'Open the follower counts to browse who follows an author and whom they follow.',
      width: 736, height: 443,
    }],
    'Share with followers': [{
      src: '/wiki/community/08-share-followers.webp',
      alt: 'The share button on Kansas City swing is highlighted with the tooltip Share with your followers.',
      caption: 'Share a project to your followers’ activity feed.',
      width: 1136, height: 445,
    }],
    'Fork a project': [{
      src: '/wiki/community/09-fork-project.webp',
      alt: 'The project menu shows Following, Fork this project, Report post and Block carla, with Fork this project focused.',
      caption: 'Choose Fork this project to create your own editable copy when the author allows forks.',
      width: 386, height: 256,
    }, {
      src: '/wiki/community/09b-fork-attribution.webp',
      alt: 'Swing and the Count by ana carries the label Forked from Kansas City swing by @carla.',
      caption: 'A fork links back to the source project and its author.',
      width: 816, height: 302,
    }],
  },
  'profile-and-account': {
    'Profile details': [{
      src: '/wiki/profile-and-account/01-bio.webp',
      alt: 'In Edit profile, the Bio field reads Notes on the history of jazz, from Congo Square to the swing era, with a 65 of 255 character counter.',
      caption: 'Open Edit profile to write a short bio. Choose Save when you finish editing your details.',
      width: 672, height: 319,
    }, {
      src: '/wiki/profile-and-account/01b-profile-details.webp',
      alt: 'Location is set to Buenos Aires and Website to ana-jazz-notes.example.com.',
      caption: 'Location and Website are optional. Use them to add context and a link to your profile.',
      width: 672, height: 273,
    }],
    'Profile images': [{
      src: '/wiki/profile-and-account/02-profile-images.webp',
      alt: 'Edit profile shows Add banner, the notice that avatars and banners are public, and the avatar, both highlighted.',
      caption: 'Select your avatar to choose a photo, then reposition and zoom it before choosing Use photo. Save applies the change. Avatars are public.',
      width: 672, height: 391,
    }],
    'Age visibility': [{
      src: '/wiki/profile-and-account/03-age-visibility.webp',
      alt: 'The date of birth is locked with the note that it can\'t be changed once set, and the Show my age on my public profile switch is off.',
      caption: 'Your birth date cannot be changed once set. Use the switch to choose whether your public profile shows your age, then save.',
      width: 672, height: 249,
    }],
    'Public profiles': [{
      src: '/wiki/profile-and-account/04-public-profile.webp',
      alt: 'carla’s public profile shows her bio, Following and block buttons, follower counts, badges, project statistics and her published project Kansas City swing.',
      caption: 'Open an author name to browse their public profile, published projects and any activity they make visible.',
      width: 1120, height: 590,
    }],
    'Personal collections': [{
      src: '/wiki/profile-and-account/05-collections.webp',
      alt: 'On your profile, the Bookmarks tab is selected among Activity, Published, Bookmarks, Forks and Upvoted, listing The road to bebop and Kansas City swing.',
      caption: 'Choose a tab to revisit your published projects, bookmarks, forks or upvotes. Open a project from its row.',
      width: 1120, height: 346,
    }],
    'Activity history': [{
      src: '/wiki/profile-and-account/06-activity.webp',
      alt: 'The Activity tab lists You published History of jazz, You bookmarked The road to bebop, You forked Swing and the Count from carla and bruno upvoted History of jazz, each with a date.',
      caption: 'Activity brings your recent actions and interactions with your work into one list. Each row opens the project.',
      width: 1120, height: 443,
    }],
    'Badges': [{
      src: '/wiki/profile-and-account/07-badges.webp',
      alt: 'The Badges dialog shows Supporter and First publication as earned, and Explorer locked with progress of 4 out of 10.',
      caption: 'Choose View all beside your profile badges to see earned badges and progress toward others.',
      width: 720, height: 422,
    }, {
      src: '/wiki/profile-and-account/07b-showcase-badge.webp',
      alt: 'The Showcase badge section in Edit profile has Supporter selected beside None and First publication.',
      caption: 'In Edit profile, choose an earned badge to display beside your name. Choose None to hide it, then Save.',
      width: 672, height: 303,
    }],
    'Password and recovery': [{
      src: '/wiki/profile-and-account/08-change-password.webp',
      alt: 'The Password section has Current password, New password rated Strong and a matching Confirm new password, with the requirements and a Change password button.',
      caption: 'Open Settings, then Account. Enter your current password and the new one twice. The form shows the required length and character types.',
      width: 620, height: 506,
    }, {
      src: '/wiki/profile-and-account/08b-password-recovery.webp',
      alt: 'The Forgot password? form has ana@example.com in the Email field, a Send reset link button and a Log in link.',
      caption: 'Choose Forgot your password? on Log in, enter your account email and request a reset link.',
      width: 460, height: 439,
    }],
    'Delete your account': [{
      src: '/wiki/profile-and-account/09a-danger-zone.webp',
      alt: 'The Danger zone section in Settings, Account warns that deleting your account removes your projects, votes, bookmarks and follows, with a Delete account button.',
      caption: 'In Settings, open Account and choose Delete account in the Danger zone.',
      width: 620, height: 240,
    }, {
      src: '/wiki/profile-and-account/09-delete-account.webp',
      alt: 'The Delete your account? confirmation warns that the account, projects and data will be permanently deleted, with DELETE typed in the confirmation field.',
      caption: 'Type DELETE to confirm. Cancel keeps the account and its projects.',
      width: 1000, height: 556,
    }],
    'Privacy and notifications': [{
      src: '/wiki/profile-and-account/10-privacy.webp',
      alt: 'Settings, Privacy shows Public and Private profile visibility, switches for showing upvotes and allowing forks, the Everyone, People I follow and No one comment options and a blocked user.',
      caption: 'Open Settings > Privacy to manage visibility and permissions, choose who can comment and unblock people.',
      width: 1000, height: 964,
    }, {
      src: '/wiki/profile-and-account/10b-notifications.webp',
      alt: 'Settings, Notifications has Enable notifications on and switches for each category, with New followers turned off and highlighted.',
      caption: 'Open Settings > Notifications to turn notifications off or mute individual categories.',
      width: 1000, height: 807,
    }],
  },
  'storage-and-supporter': {
    'Storage usage': [{
      src: '/wiki/storage-and-supporter/01-workspace-storage.webp',
      alt: 'Settings has Plan selected and shows the free plan with 32.0MB used of 500.0MB, split into project images, thumbnails, profile images and text.',
      caption: 'Open Settings, then Plan to see your account storage, your quota and what uses it.',
      width: 1000, height: 385,
    }, {
      src: '/wiki/storage-and-supporter/02-project-usage.webp',
      alt: 'The Project usage dialog for History of jazz shows 6.4MB, split into 5.1MB of project images, 0.4MB of thumbnails and 0.9MB of text.',
      caption: 'Choose Usage breakdown from a project’s menu on My Projects to see the storage that project uses.',
      width: 512, height: 230,
    }],
    'Unused image cleanup': [],
    'Support through Patreon': [{
      src: '/wiki/storage-and-supporter/03-patreon.webp',
      alt: 'The Tramo Supporter card has a Become a supporter button, an Already a supporter? Link your account link, and the message to complete the steps in Patreon.',
      caption: 'Choose Become a supporter to connect through Patreon, or Link your account if you already support Tramo there. Your benefits update when you return.',
      width: 520, height: 404,
    }],
    'Supporter benefits': [{
      src: '/wiki/storage-and-supporter/04-supporter-benefits.webp',
      alt: 'Below the free plan storage, the Tramo Supporter card lists 10GB storage, Animated GIF avatar, Profile banner and Supporter badge on your profile.',
      caption: 'The Supporter card in Settings, Plan lists the benefits available with Tramo Supporter.',
      width: 1000, height: 619,
    }],
    'Cancel a subscription': [{
      src: '/wiki/storage-and-supporter/05a-supporter-plan.webp',
      alt: 'With Supporter active, Settings, Plan shows 443.4MB used of 10.0GB and a highlighted Cancel subscription button.',
      caption: 'From Settings, open Plan and choose Cancel subscription.',
      width: 1000, height: 385,
    }, {
      src: '/wiki/storage-and-supporter/05-cancel-subscription.webp',
      alt: 'The Cancel subscription? confirmation says you keep everything you have made and go back to free-plan limits for new uploads, with Cancel and Cancel subscription.',
      caption: 'Review the confirmation before continuing. Cancel leaves the subscription unchanged.',
      width: 1000, height: 376,
    }],
  },
};
