export const SECTIONS = [
  {
    id: 'getting-started', title: 'Getting started', features: [
      ['Example project', 'Start with an editable copy of the Memex and Vannevar Bush example.'],
      ['Editor walkthrough', 'Follow the guided editor tour and replay it from Settings or Help.'],
      ['Appearance', 'Choose a light, dark or device-matched theme from the account menu.'],
    ],
  },
  {
    id: 'projects', title: 'Projects', features: [
      ['Create a project', 'On My Projects, choose Start writing to open a blank workspace for your notes and trails. Your project is saved automatically as you write. Choose Try an example if you would rather start with an editable copy of the Memex project.'],
      ['Rename a project', 'Open the three-dot menu on a project and choose Rename. Type a title and press Enter to save it, or Escape to cancel. You can also click the project title in the editor to rename it.'],
      ['Delete a project', 'Open the project’s three-dot menu and choose Delete. Check the project title in the confirmation dialog before continuing. Deletion is permanent; choose Cancel to keep the project.'],
    ],
  },
  {
    id: 'notes-and-trails', title: 'Notes and trails', features: [
      ['Create and rename notes', 'Select the plus beside a trail to add a note as its next step. Enter a title or leave it blank to start with Untitled note. To rename a note, open its three-dot menu and choose Rename note, or edit its title in the editor. In the sidebar title field, Enter saves the name and Escape cancels the change.'],
      ['Notes outside trails', 'Use the plus beside Notes to create a note without assigning it to a trail. This is useful for open questions, drafts or ideas you want to organize later. The Notes list contains every note in the project, including notes that already belong to trails.'],
      ['Create and rename trails', 'A trail is a named reading order through your notes. Select the plus beside Trails, enter a name and press Enter to create one. Open a trail’s three-dot menu and choose Rename trail to change its name without changing its notes. Escape cancels the title edit.'],
      ['Reuse a note', 'Open a note’s three-dot menu inside a trail and choose Add to another trail, then select the destination. From the Notes list, the same action is called Add to a trail. This reuses the original note: edits appear everywhere it is used, while each trail keeps its own reading order. Move to another trail is a different action that takes the step out of its current trail.'],
      ['Shared-note indicators', 'A link icon beside a note title means the note is used in more than one trail. The editor also shows a notice beneath the title, naming the trails that use it. Check this notice before editing: your changes update the same note in every trail.'],
      ['Add an existing note', 'Open the destination trail’s three-dot menu and choose Add existing note. Select a note from the dropdown, then choose Add note. The dropdown only offers notes that are not already in that trail. Adding a note here keeps its existing content.'],
      ['Remove a step', 'Open the note’s three-dot menu within a trail and choose Remove from this trail. The confirmation names the note and explains that it stays in Notes. Confirm with Remove to take it out of this reading path, or Cancel to leave it in place. Other trails that use the note are unchanged.'],
      ['Reorder steps', 'Drag a note to a new position within its trail. You can also open its three-dot menu and choose Move note up or Move note down. The step numbers update to match the new reading order. Reordering a shared note in one trail does not change its position in another.'],
      ['Delete notes and trails', 'Delete note removes the note from the project and every trail that uses it. Delete trail removes the reading path while keeping its notes in the Notes list and in any other trails. Both actions show a confirmation and cannot be undone. Check the name and description before confirming, or choose Cancel to keep everything.'],
    ],
  },
  {
    id: 'writing', title: 'Writing and formatting', features: [
      ['Formatting', 'Format notes with the toolbar, slash menu and Markdown shortcuts.'],
      ['Slash menu', 'Type / to find and insert blocks without leaving the note.'],
      ['Move blocks', 'Reorder content inside a note with block drag handles.'],
      ['Automatic saving', 'Save note changes automatically and check the editor’s saving or error status.'],
    ],
  },
  {
    id: 'images-and-blocks', title: 'Images and other blocks', features: [
      ['Image uploads', 'Insert images into notes through the upload controls.'],
      ['Resize images', 'Adjust an image’s displayed dimensions in the editor.'],
      ['Captions and alt text', 'Add a visible caption and an accessible image description.'],
      ['Equations', 'Write LaTeX equations inline or as a separate block.'],
      ['Music notation', 'Add a music block using ABC notation.'],
      ['Embeds', 'Insert a public YouTube video or X / Twitter post by its URL.'],
    ],
  },
  {
    id: 'connections-and-map', title: 'Connections and the map', features: [
      ['Note mentions', 'Type @ to find and link to another note in the project.'],
      ['Wiki-style links', 'Use [[ as another way to insert a note reference.'],
      ['Follow a reference', 'Open the linked note from its mention.'],
      ['Connections panel', 'See both outgoing and incoming mentions involving the selected note.'],
      ['Extract to a new note', 'Move selected content into a new note and leave a reference in its place. Put the note next or last in the current trail, or outside trails. Extraction cannot be undone with normal Undo.'],
      ['Project map', 'See trails side by side, shared notes and connections between ideas. The connections panel keeps a small map preview beside your writing.'],
      ['Navigate and customize the map', 'Pan, zoom, fit the view and open notes from their cards. Right-click a note or trail to choose its background color.'],
    ],
  },
  {
    id: 'navigation', title: 'Navigation and shortcuts', features: [
      ['Project note search', 'Find notes in the current project from the sidebar or with Cmd/Ctrl+P.'],
      ['Continuous trail reading', 'Move through the notes of a trail in a continuous editor view.'],
      ['Keyboard navigation', 'Move between titles, note content, trail steps and the next trail with keyboard shortcuts.'],
      ['Shortcut reference', 'Open the shortcut dialog with Cmd/Ctrl+/ and see the available commands.'],
    ],
  },
  {
    id: 'publishing', title: 'Publishing and sharing', features: [
      ['Visibility', 'Choose Private for access only by you, Unlisted for anyone with the link, or Published to list the project on Explore. Confirm with Save or Publish.'],
      ['Project descriptions', 'Introduce the project and explain what readers will find.'],
      ['Tags', 'Add project tags with suggestions for existing topics.'],
      ['Public thumbnails', 'Upload a cover image or capture the project map as a thumbnail. Thumbnails are public.'],
      ['Publication preview', 'Preview the project card before publishing or updating it.'],
      ['Copy a sharing link', 'Copy the reader-facing link from the sharing screen.'],
      ['Published snapshots and history', 'Later edits stay in the draft until you publish an update. Each publication saves a version in Publish history, with its own public link.'],
      ['Reader view', 'Read shared projects with their notes, trails and map outside the editing interface.'],
      ['Export a project', 'Download a ZIP containing an HTML reader, project JSON and images.'],
    ],
  },
  {
    id: 'community', title: 'Explore and community', features: [
      ['Explore search', 'Search the projects published by the community.'],
      ['Explore feeds', 'Browse Recent for newly published projects, Hot for popular activity, or Following for activity from people you follow.'],
      ['Featured projects and topics', 'Discover highlighted projects, hot topics and active authors.'],
      ['Upvotes', 'Upvote a project you find useful.'],
      ['Bookmarks', 'Save projects and revisit them from your profile.'],
      ['Comments and replies', 'Discuss a project and reply when the author allows comments. Delete your own comments from the thread; deletion is permanent, while replies are kept.'],
      ['Follow authors', 'Follow or unfollow other people and browse follower lists.'],
      ['Share with followers', 'Share a project to your followers’ activity feed.'],
      ['Fork a project', 'Create an editable copy when the author allows forks. The attribution links back to the source project and its author.'],
    ],
  },
  {
    id: 'profile-and-account', title: 'Account, privacy and notifications', features: [
      ['Profile details', 'Edit your bio, location and website.'],
      ['Profile images', 'Upload and crop your avatar. Profile images are public.'],
      ['Age visibility', 'Choose whether to show your age on your profile.'],
      ['Public profiles', 'Browse an author’s profile, published projects and visible activity.'],
      ['Personal collections', 'Revisit your published projects, bookmarks, forks and upvoted projects from your profile.'],
      ['Activity history', 'Review your recent activity on Tramo.'],
      ['Badges', 'View earned badges and select one to display on your profile.'],
      ['Password and recovery', 'Change your password from Settings > Account. If you forgot it, choose Forgot your password? on Log in to request a reset link by email.'],
      ['Delete your account', 'Request permanent account deletion from the account settings.'],
      ['Privacy and notifications', 'In Settings > Privacy, choose a public or private profile independently of project visibility, show or hide your upvotes, allow forks, choose who can comment and manage blocked users. In Settings > Notifications, disable notifications or mute categories such as comments, follows and upvotes. Open the bell for your notification inbox, or use a project or comment menu to report content with a reason.'],
    ],
  },
  {
    id: 'storage-and-supporter', title: 'Storage and Supporter', features: [
      ['Storage usage', 'Open Settings, then Plan for your total storage, quota and image/text breakdown. For one project, choose Usage breakdown from its menu on My Projects.'],
      ['Unused image cleanup', 'Cleanup runs automatically after a grace period. Images referenced by notes or published versions are kept.'],
      ['Support through Patreon', 'Connect Patreon to activate Tramo Supporter.'],
      ['Supporter benefits', 'Get more storage, an animated GIF avatar, a profile banner and a Supporter badge.'],
      ['Cancel a subscription', 'Cancel from plan settings without deleting your existing projects.'],
    ],
  },
];

export const GROUPS = [
  { title: 'Getting started', sections: SECTIONS.slice(0, 3) },
  { title: 'Writing and connecting ideas', sections: SECTIONS.slice(3, 7) },
  { title: 'Sharing and community', sections: SECTIONS.slice(7, 9) },
  { title: 'Account and settings', sections: SECTIONS.slice(9) },
];
