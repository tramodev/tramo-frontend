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
      src: '/wiki/projects/create.webp',
      alt: 'My Projects offers Start writing and Try an example, an editable copy of Memex and Vannevar Bush with five notes and two trails.',
      caption: 'Choose Try an example to explore five notes and two trails in your own editable copy of Memex and Vannevar Bush.',
      width: 600, height: 488,
    }],
    'Editor walkthrough': [],
    'Appearance': [{
      src: '/wiki/getting-started/appearance.webp',
      alt: 'The Theme submenu offers Use device theme, Light theme and Dark theme, with Dark theme selected.',
      caption: 'Open the account menu, then Theme. Choose a light or dark appearance, or follow your device setting.',
      width: 201, height: 122,
    }],
  },
  'projects': {
    'Create a project': [{
      src: '/wiki/projects/create.webp',
      alt: 'The Start writing card beside Try an example on My Projects.',
      caption: 'Start writing opens a blank project. Try an example gives you a project to explore and edit.',
      width: 600, height: 488,
    }],
    'Rename a project': [{
      src: '/wiki/projects/rename.webp',
      alt: 'A project title being edited in the projects list.',
      caption: 'Choose Rename from the project menu, enter a title, then press Enter.',
      width: 640, height: 206,
    }],
    'Delete a project': [{
      src: '/wiki/projects/delete.webp',
      alt: 'A confirmation dialog naming the demonstration project, with Cancel and Delete buttons.',
      caption: 'Check the project name before confirming. Cancel leaves the project untouched.',
      width: 560, height: 206,
    }],
  },
  'notes-and-trails': {
    'Create and rename notes': [{
      src: '/wiki/notes-and-trails/create-note.webp',
      alt: 'A new note titled Associative trails being added beneath the steps of Bush’s vision.',
      caption: 'The plus beside a trail creates a new note in that trail. A title is optional.',
      width: 304, height: 290,
    }, {
      src: '/wiki/notes-and-trails/rename-note.webp',
      alt: 'The title Vannevar Bush being edited directly in the sidebar.',
      caption: 'Rename note opens the title field. Press Enter to keep the new name.',
      width: 304, height: 220,
    }],
    'Notes outside trails': [{
      src: '/wiki/notes-and-trails/outside-trails.webp',
      alt: 'Questions to explore selected in Notes, with neither trail containing that note.',
      caption: 'Questions to explore belongs to the project without being a step in either trail. Notes lists every note in the project.',
      width: 304, height: 610,
    }],
    'Create and rename trails': [{
      src: '/wiki/notes-and-trails/create-trail.webp',
      alt: 'A new trail title, Reading paths, being entered under the Trails heading.',
      caption: 'Use the plus beside Trails, enter a name, then press Enter.',
      width: 304, height: 300,
    }, {
      src: '/wiki/notes-and-trails/rename-trail.webp',
      alt: 'The trail title Bush’s vision being changed to Bush’s associative trails.',
      caption: 'Rename trail changes the path’s name while keeping its notes and their order.',
      width: 304, height: 220,
    }],
    'Reuse a note': [{
      src: '/wiki/notes-and-trails/reuse-note.webp',
      alt: 'Vannevar Bush appearing as step 2 in Bush’s vision and step 3 in Thinking in trails, with shared-note icons.',
      caption: 'One note, two trails: Vannevar Bush appears in both paths, at different positions.',
      width: 304, height: 354,
    }],
    'Shared-note indicators': [{
      src: '/wiki/notes-and-trails/shared-note.webp',
      alt: 'Memex in both trails, with link icons in the sidebar and an editor notice saying edits appear in both.',
      caption: 'The link icon marks a shared note. The notice beneath its title names the trails that use it.',
      width: 960, height: 550,
    }],
    'Add an existing note': [{
      src: '/wiki/notes-and-trails/add-existing.webp',
      alt: 'Questions to explore selected beneath Bush’s vision, beside the Add note button.',
      caption: 'Choose an existing note, then select Add note to include it in the trail.',
      width: 224, height: 190,
    }],
    'Remove a step': [{
      src: '/wiki/notes-and-trails/remove-step.webp',
      alt: 'The Remove Vannevar Bush from this trail confirmation, explaining that the note stays in Notes.',
      caption: 'Remove affects this trail only. The note remains in the project and in any other trails that use it.',
      width: 560, height: 208,
    }],
    'Reorder steps': [{
      src: '/wiki/notes-and-trails/reorder-before.webp',
      alt: 'Before reordering: Vannevar Bush is step 1 and As We May Think is step 2.',
      caption: 'Before: Vannevar Bush is the first step in the trail.',
      width: 304, height: 220,
    }, {
      src: '/wiki/notes-and-trails/reordered-steps.webp',
      alt: 'After reordering: As We May Think is step 1 and Vannevar Bush is step 2.',
      caption: 'After moving the note down, the step numbers reflect the new reading order.',
      width: 304, height: 220,
    }],
    'Delete notes and trails': [{
      src: '/wiki/notes-and-trails/delete-note.webp',
      alt: 'Delete note confirmation warning that Vannevar Bush will be removed from every trail and the project.',
      caption: 'Delete note permanently removes the note from the whole project.',
      width: 560, height: 208,
    }, {
      src: '/wiki/notes-and-trails/delete-trail.webp',
      alt: 'Delete trail confirmation explaining that Bush’s vision will be deleted but its notes will stay in Notes.',
      caption: 'Delete trail removes the path. Its notes stay in the project.',
      width: 560, height: 208,
    }],
  },
  'writing': {
    'Formatting': [{
      src: '/wiki/writing/formatting.webp',
      alt: 'The editor shows its formatting toolbar above a demonstration note with formatted text, headings and lists.',
      caption: 'Use the toolbar to format your notes. The slash menu and Markdown shortcuts offer keyboard access while you write.',
      width: 1512, height: 687,
    }],
    'Slash menu': [{
      src: '/wiki/writing/slash-menu.webp',
      alt: 'Typing slash code filters the insertion menu to Code block.',
      caption: 'Type / at the start of a paragraph, then a block name to narrow the menu. Choose the matching result to insert it.',
      width: 265, height: 67,
    }],
    'Move blocks': [{
      src: '/wiki/writing/move-blocks.webp',
      alt: 'A six-dot drag handle beside a quote, directly above a code block.',
      caption: 'Move the pointer beside a block to reveal its drag handle, then drag it to a new position.',
      width: 690, height: 118,
    }, {
      src: '/wiki/writing/block-menu.webp',
      alt: 'The Text Styles menu including Move block up and Move block down.',
      caption: 'You can also move the current block up or down from the Text Styles menu.',
      width: 220, height: 415,
    }],
    'Automatic saving': [{
      src: '/wiki/writing/automatic-saving.webp',
      alt: 'The project title Writing field notes followed by a checkmark and Saved.',
      caption: 'Saved confirms that changes reached the server. If saving fails, check the error and keep the tab open until the draft is safe.',
      width: 410, height: 48,
    }],
  },
  'images-and-blocks': {
    'Image uploads': [{
      src: '/wiki/images-and-blocks/insert-image.webp',
      alt: 'The Insert menu offering Image alongside tables, equations, music, embeds and dividers.',
      caption: 'Choose Image from the Insert menu, then select an image file from your computer.',
      width: 225, height: 295,
    }],
    'Resize images': [{
      src: '/wiki/images-and-blocks/resize-sunflower.webp',
      alt: 'A sunflower photograph surrounded by resize handles on its corners and edges.',
      caption: 'Select an image to reveal its handles. Drag a handle to adjust the displayed size.',
      width: 570, height: 455,
    }],
    'Captions and alt text': [{
      src: '/wiki/images-and-blocks/caption-sunflower.webp',
      alt: 'A sunflower photograph with the alt text A bright yellow sunflower and the caption Sunflower on a summer walk.',
      caption: 'Use Alt text to describe the image for readers who cannot see it. The caption below the image is visible to everyone.',
      width: 570, height: 455,
    }],
    'Equations': [{
      src: '/wiki/images-and-blocks/equation-editor.webp',
      alt: 'A LaTeX integral in the equation editor, with template buttons, a live rendered preview and a character counter.',
      caption: 'Write LaTeX in the source field and check the preview below. Template buttons insert common structures such as fractions and integrals.',
      width: 670, height: 214,
    }, {
      src: '/wiki/images-and-blocks/equation-rendered.webp',
      alt: 'A rendered block equation showing the integral of x squared from zero to one equals one third.',
      caption: 'The finished equation appears as a block. Choose Inline equation instead to place a formula inside a line of text.',
      width: 670, height: 64,
    }],
    'Music notation': [{
      src: '/wiki/images-and-blocks/music-editor.webp',
      alt: 'The ABC source for Morning walk above its rendered staff, with a Play score control and character counter.',
      caption: 'Enter ABC notation to preview a score. Play score lets you listen; Ctrl/⌘+Enter finishes editing the block.',
      width: 670, height: 342,
    }],
    'Embeds': [{
      src: '/wiki/images-and-blocks/embed-dialog.webp',
      alt: 'The Embed a tweet or video dialog containing a YouTube URL and Cancel and Embed buttons.',
      caption: 'Paste a public YouTube or X / Twitter URL, then choose Embed. The video or post loads from its provider.',
      width: 542, height: 263,
    }],
  },
  'connections-and-map': {
    'Note mentions': [{
      src: '/wiki/connections-and-map/note-mentions.webp',
      alt: 'Typing @ after Follow an idea opens a menu with Sunflowers, Patterns in nature and Questions to explore.',
      caption: 'Type @, then choose a note from the project. Keep typing its title to narrow the results.',
      width: 350, height: 155,
    }],
    'Wiki-style links': [{
      src: '/wiki/connections-and-map/wiki-links.webp',
      alt: 'Typing two opening brackets opens the same note selector as an @ mention.',
      caption: 'Type [[ to open the note selector. Choose a result to turn the brackets into a reference.',
      width: 350, height: 155,
    }],
    'Follow a reference': [{
      src: '/wiki/connections-and-map/reference.webp',
      alt: 'Sunflowers contains a reference to Patterns in nature, with a preview of that note and an Open note button.',
      caption: 'Select a reference to preview the linked note, then choose Open note to follow it.',
      width: 600, height: 360,
    }],
    'Connections panel': [{
      src: '/wiki/connections-and-map/connections-panel.webp',
      alt: 'Connections shows an outgoing mention to Sunflowers and an incoming mention from Patterns in nature.',
      caption: 'Each card names both notes and says where the mention appears. Select a connection to open the other note.',
      width: 288, height: 550,
    }],
    'Extract to a new note': [{
      src: '/wiki/connections-and-map/extract-note.webp',
      alt: 'The Extract to new note dialog with the title Spirals in a sunflower and Leave a link in the original note checked.',
      caption: 'Select content and choose Extract to new note. Give it a title and decide whether to leave a reference before confirming.',
      width: 528, height: 406,
    }, {
      src: '/wiki/connections-and-map/extraction-placement.webp',
      alt: 'The Create as field is set to Note outside trails beneath the checked option to leave a link.',
      caption: 'Create as controls placement: next or last in the current trail, or outside trails. Here the new note will belong to the project without becoming a trail step.',
      width: 476, height: 110,
    }],
    'Project map': [{
      src: '/wiki/connections-and-map/project-map.webp',
      alt: 'The project map shows Field observations and Following an idea side by side, shared notes, connecting lines and Notes without a trail.',
      caption: 'Trails form columns. Shared notes appear in both paths with dotted connections; notes outside trails have their own column.',
      width: 1200, height: 623,
    }, {
      src: '/wiki/connections-and-map/map-preview.webp',
      alt: 'A small project map beneath the Open map button in the connections panel.',
      caption: 'The connections panel keeps an overview beside your writing. Open map expands it into the full project map.',
      width: 288, height: 181,
    }],
    'Navigate and customize the map': [{
      src: '/wiki/connections-and-map/map-navigation.webp',
      alt: 'The map controls with plus, minus and fit-view buttons stacked vertically.',
      caption: 'Use + and − to zoom, and Fit View to bring all notes into view. Drag the canvas to pan; select a card, then select it again to open the note.',
      width: 280, height: 160,
    }, {
      src: '/wiki/connections-and-map/map-colors.webp',
      alt: 'A note card’s context menu offers a default background and red, orange, green, blue, purple and gray swatches.',
      caption: 'Right-click a note card or trail background to choose its background color. Default removes the custom color.',
      width: 450, height: 190,
    }],
  },
  'navigation': {
    'Project note search': [{
      src: '/wiki/navigation/project-search.webp',
      alt: 'The sidebar search contains sun and shows Sunflowers as its matching note.',
      caption: 'Search by note title from the sidebar. Cmd/Ctrl+P focuses this field; choose a result to open the note.',
      width: 288, height: 170,
    }],
    'Continuous trail reading': [{
      src: '/wiki/navigation/continuous-reading.webp',
      alt: 'A walk through the garden and Sunflowers appear as successive steps in one continuous editor view, separated by a horizontal line.',
      caption: 'Keep scrolling to read the next step without leaving the trail. Each note keeps its own title and content.',
      width: 740, height: 510,
    }],
    'Keyboard navigation': [{
      src: '/wiki/navigation/keyboard-navigation.webp',
      alt: 'The Navigate section lists shortcuts for moving between note titles and content, previous and next notes, the toolbar and search.',
      caption: 'Use arrow keys at the boundaries of a note to move between titles and content. Cmd/Ctrl+Alt+Up or Down moves between notes and continues across trails.',
      width: 476, height: 245,
    }],
    'Shortcut reference': [{
      src: '/wiki/navigation/shortcut-reference.webp',
      alt: 'The Keyboard shortcuts dialog explains the platform modifiers and lists Navigate and Insert commands.',
      caption: 'Open Shortcuts or press Cmd/Ctrl+/ to see the reference. On Windows and Linux, use Ctrl for ⌘ and Alt for ⌥.',
      width: 528, height: 596,
    }, {
      src: '/wiki/navigation/writing-shortcuts.webp',
      alt: 'The Write section lists shortcuts for formatting, moving blocks, indenting lists, undo, redo and Markdown shortcuts.',
      caption: 'Scroll within the dialog to reach the writing commands, including formatting, block movement and Markdown shortcuts.',
      width: 476, height: 200,
    }],
  },
  'publishing': {
    'Visibility': [{
      src: '/wiki/publishing/private.webp',
      alt: 'Private is selected in the visibility settings, with the description Only you can access this project.',
      caption: 'Choose Private, Unlisted or Published to control who can read the project, then confirm with Save or Publish.',
      width: 347, height: 285,
    }],
    'Project descriptions': [{
      src: '/wiki/publishing/description.webp',
      alt: 'The Description field introduces a garden notebook about sunflowers, spirals and everyday observations, with a 94 of 255 character counter.',
      caption: 'Write a short introduction that helps readers understand the project. The description also appears in its preview card.',
      width: 347, height: 140,
    }],
    'Tags': [{
      src: '/wiki/publishing/tags.webp',
      alt: 'Typing nat in Tags suggests nature and natural-sciences, with usage counts beside each suggestion.',
      caption: 'Separate tags with commas. Start typing to choose an existing topic from the suggestions.',
      width: 347, height: 167,
    }],
    'Public thumbnails': [{
      src: '/wiki/publishing/thumbnail.webp',
      alt: 'The Thumbnail section shows a project map image, the notice that thumbnails are public, and Map snapshot and Upload controls.',
      caption: 'Use Map snapshot to create a cover from the project map, or Upload to choose an image. Thumbnails are public, so keep confidential information out of them.',
      width: 347, height: 328,
    }],
    'Publication preview': [{
      src: '/wiki/publishing/publication-preview.webp',
      alt: 'The Your project preview card shows Connecting field notes with its author, description, nature and botany tags, and a map thumbnail.',
      caption: 'Review the highlighted card before publishing. It reflects the description, tags and thumbnail you choose on the sharing screen.',
      width: 770, height: 232,
    }],
    'Copy a sharing link': [{
      src: '/wiki/publishing/copy-link.webp',
      alt: 'The sharing controls show Open public link, a checked Copied button and Update.',
      caption: 'After saving an unlisted project or publishing it, choose Copy to copy the reader-facing link. Open public link opens the same reading view.',
      width: 347, height: 64,
    }],
    'Published snapshots and history': [{
      src: '/wiki/publishing/publish-update.webp',
      alt: 'The sharing screen offers an Update button beside Open public link and Copy for an already published project.',
      caption: 'Later edits stay in the draft until you choose Update. Updating publishes a new snapshot for readers.',
      width: 347, height: 64,
    }, {
      src: '/wiki/publishing/publish-history.webp',
      alt: 'The Publish history tab lists Version 2 and Version 1 with their publication dates and an Open link action for each.',
      caption: 'Open Version history in the editor, then choose Publish history. Each publication has its own link to that version.',
      width: 512, height: 340,
    }],
    'Reader view': [{
      src: '/wiki/publishing/reader-view.webp',
      alt: 'The public reading view shows the project description, Field observations trail and A walk through the garden note, with trail navigation and map controls.',
      caption: 'Readers can follow trails, open notes and explore connections in the public reading view. The shared content is presented without the editing toolbar.',
      width: 1512, height: 550,
    }],
    'Export a project': [{
      src: '/wiki/publishing/export.webp',
      alt: 'The editor header shows the focused download icon beside project text totals, version history and Publish and Share.',
      caption: 'Choose Export, the download icon in the editor header. Tramo saves pending changes and prepares a ZIP with an HTML reader, project JSON and images.',
      width: 410, height: 70,
    }],
  },
  'community': {
    'Explore search': [{
      src: '/wiki/community/explore-search.webp',
      alt: 'Explore searches for jazz and shows Mapping the origins of jazz by nolan as a matching published project.',
      caption: 'Enter a title, subject or tag in Search published projects, then press Enter. The selected feed stays active while you search.',
      width: 1130, height: 510,
    }],
    'Explore feeds': [{
      src: '/wiki/community/recent.webp',
      alt: 'The Explore feed selector shows Recent selected beside Hot and Following.',
      caption: 'Choose Recent for new publications, Hot for popular activity, or Following for activity from people you follow.',
      width: 650, height: 75,
    }],
    'Featured projects and topics': [{
      src: '/wiki/community/featured.webp',
      alt: 'The Featured today card highlights Connecting field notes by sage, with its description, nature and botany tags, map thumbnail and project actions.',
      caption: 'Featured today highlights a project to explore. Open its title to start reading.',
      width: 1120, height: 336,
    }, {
      src: '/wiki/community/topics-authors.webp',
      alt: 'The Explore sidebar lists a trending project, popular topics nature, music and history, and popular authors sage and nolan.',
      caption: 'Use topics to search related projects, or open an author profile to discover more of their work.',
      width: 288, height: 498,
    }],
    'Upvotes': [{
      src: '/wiki/community/upvote.webp',
      alt: 'Connecting field notes has an active upvote arrow and a count of 19 beside its sharing and reading statistics.',
      caption: 'Select the upvote arrow to support a project you find useful. Select it again to remove your vote.',
      width: 600, height: 203,
    }],
    'Bookmarks': [{
      src: '/wiki/community/bookmark.webp',
      alt: 'The featured Connecting field notes card has a filled bookmark icon showing that the project is saved.',
      caption: 'Select the bookmark icon to save a project. Select it again to remove it; saved projects can be revisited from your profile.',
      width: 1120, height: 336,
    }],
    'Comments and replies': [{
      src: '/wiki/community/comments-replies.webp',
      alt: 'A project discussion shows a comment by sage, an indented reply by embedtester, another comment and Reply controls.',
      caption: 'Add a comment to discuss the project, or choose Reply beneath a comment to continue its thread. Commenting depends on the project settings.',
      width: 670, height: 386,
    }, {
      src: '/wiki/community/delete-comment.webp',
      alt: 'Delete this comment confirmation explains that deletion cannot be undone and that any replies stay in the thread, with Cancel and Delete buttons.',
      caption: 'Choose Delete beneath your own comment, then confirm. Cancel keeps it. Removing a comment with replies preserves the thread.',
      width: 528, height: 194,
    }],
    'Follow authors': [{
      src: '/wiki/community/follow-author.webp',
      alt: 'The sage profile shows an active Following button, follower and following counts, and a short bio.',
      caption: 'Choose Follow on an author profile to follow their activity. Following shows the active state and lets you unfollow.',
      width: 1120, height: 204,
    }, {
      src: '/wiki/community/followers.webp',
      alt: 'The followers page for sage shows Followers and Following tabs, plus nolan and mira with individual Follow and Following controls.',
      caption: 'Open the follower or following count on a profile to browse its lists. Each row links to another author and includes a follow control.',
      width: 675, height: 265,
    }],
    'Share with followers': [{
      src: '/wiki/community/share-followers.webp',
      alt: 'The featured project includes the share-with-followers control beside the upvote and view counts.',
      caption: 'Use the share icon with two arrows to share a project to the activity feed of your followers.',
      width: 1120, height: 366,
    }],
    'Fork a project': [{
      src: '/wiki/community/fork-project.webp',
      alt: 'The project options menu includes Following, Fork this project, Report post and Block sage.',
      caption: 'Open More options on a project and choose Fork this project when the author allows forks. The new copy becomes your editable starting point.',
      width: 320, height: 154,
    }, {
      src: '/wiki/community/fork-attribution.webp',
      alt: 'Patterns worth following includes a Forked from Connecting field notes by @sage attribution above its title.',
      caption: 'The attribution links back to the source project and its author, so readers can follow where a fork began.',
      width: 650, height: 145,
    }],
  },
  'profile-and-account': {
    'Profile details': [{
      src: '/wiki/profile-and-account/bio.webp',
      alt: 'The Bio field in Edit profile contains a short description and a 67 of 255 character counter.',
      caption: 'Open Edit profile to write a short bio. Choose Save when you finish editing your details.',
      width: 638, height: 157,
    }, {
      src: '/wiki/profile-and-account/profile-details.webp',
      alt: 'Location is set to Buenos Aires and Website to an example field-notes address.',
      caption: 'Location and Website are optional. Use them to add context and a link to your profile.',
      width: 640, height: 180,
    }],
    'Profile images': [{
      src: '/wiki/profile-and-account/profile-images.webp',
      alt: 'Edit profile shows the avatar control, Add banner and the notice that avatars and banners are public.',
      caption: 'Select your avatar to choose a photo, then reposition and zoom it in the crop dialog before choosing Use photo. Save applies the profile changes. Avatars are public.',
      width: 688, height: 328,
    }],
    'Age visibility': [{
      src: '/wiki/profile-and-account/age-visibility.webp',
      alt: 'The date of birth is locked and the Show my age on my public profile switch is off.',
      caption: 'Your birth date cannot be changed once set. Use the age visibility switch to choose whether your public profile displays your age, then save the change.',
      width: 640, height: 149,
    }],
    'Public profiles': [{
      src: '/wiki/profile-and-account/public-profile.webp',
      alt: 'The public sage profile shows its bio, follow controls, follower counts, project statistics and a published project.',
      caption: 'Open an author name to browse their public profile, published projects and any activity they make visible.',
      width: 1120, height: 550,
    }],
    'Personal collections': [{
      src: '/wiki/profile-and-account/collections.webp',
      alt: 'The profile tabs list Activity, Published, Bookmarks, Forks and Upvoted, with Bookmarks selected and a saved jazz project below.',
      caption: 'Choose a collection to revisit your published projects, saved projects, forks or upvotes. Open a project from its row.',
      width: 1120, height: 170,
    }],
    'Activity history': [{
      src: '/wiki/profile-and-account/activity.webp',
      alt: 'The Activity tab lists publishing, bookmarking, forking and a received upvote, each with a project title and date.',
      caption: 'Activity brings your recent actions and interactions with your work into one list. Each project title opens the relevant project.',
      width: 1120, height: 375,
    }],
    'Badges': [{
      src: '/wiki/profile-and-account/badges.webp',
      alt: 'The Badges dialog shows two earned badges and an Explorer badge with progress of 4 out of 10.',
      caption: 'Choose View all beside your profile badges to see earned badges and progress toward others.',
      width: 736, height: 379,
    }, {
      src: '/wiki/profile-and-account/showcase-badge.webp',
      alt: 'The Showcase badge section in Edit profile has Supporter selected beside None and First publication.',
      caption: 'In Edit profile, choose an earned badge to display beside your name. Choose None to hide it, then Save.',
      width: 640, height: 207,
    }],
    'Password and recovery': [{
      src: '/wiki/profile-and-account/change-password.webp',
      alt: 'The Password section in account settings has empty Current password, New password and Confirm new password fields, password requirements and a Change password button.',
      caption: 'Open Settings, then Account. Enter your current password and confirm the new one. The form shows the required length and character types before you submit.',
      width: 576, height: 363,
    }, {
      src: '/wiki/profile-and-account/password-recovery.webp',
      alt: 'The Forgot password form contains an empty email field, Send reset link button and Log in link.',
      caption: 'Choose Forgot your password? from Log in, enter your account email and request a reset link. Follow the link in the email to set a new password.',
      width: 416, height: 307,
    }],
    'Delete your account': [{
      src: '/wiki/profile-and-account/delete-account.webp',
      alt: 'Delete your account confirmation warns that account data and projects will be permanently removed, and asks you to type DELETE before confirming.',
      caption: 'In Settings, open Account and choose Delete account. Read the warning before typing DELETE to confirm. Cancel keeps the account and its projects.',
      width: 528, height: 292,
    }],
    'Privacy and notifications': [{
      src: '/wiki/profile-and-account/privacy-and-notifications.webp',
      alt: 'Privacy settings show public and private profile options, switches for upvote visibility and forks, comment permissions and the blocked-user list.',
      caption: 'Open Settings > Privacy to manage visibility and permissions. Choose Everyone, People I follow or No one for comments. Notification controls are in Settings > Notifications.',
      width: 576, height: 786,
    }],
  },
  'storage-and-supporter': {
    'Storage usage': [{
      src: '/wiki/storage-and-supporter/workspace-storage.webp',
      alt: 'Settings has Plan selected and shows the free plan with 32.0MB used out of a 500.0MB quota.',
      caption: 'Open Settings, then Plan to see the storage used by your whole account and the quota of your current plan.',
      width: 856, height: 170,
    }, {
      src: '/wiki/storage-and-supporter/project-usage.webp',
      alt: 'The Project usage dialog for Connecting field notes shows 8.0MB in total, made up of 7.0MB of images and 1.0MB of text.',
      caption: 'Project usage shows the total and the image and text breakdown for that project. Close the dialog to return to your project list.',
      width: 528, height: 188,
    }],
    'Unused image cleanup': [],
    'Support through Patreon': [{
      src: '/wiki/storage-and-supporter/patreon.webp',
      alt: 'The Supporter card has a Become a supporter button and an Already a supporter? Link your account action.',
      caption: 'Choose Become a supporter to connect through Patreon. If you already support Tramo there, use Link your account and return after completing the connection.',
      width: 320, height: 84,
    }],
    'Supporter benefits': [{
      src: '/wiki/storage-and-supporter/supporter-benefits.webp',
      alt: 'The Tramo Supporter card lists 10GB storage, an animated GIF avatar, a profile banner and a Supporter badge.',
      caption: 'The Supporter card lists the benefits available when your Patreon support is connected to your Tramo account.',
      width: 576, height: 316,
    }],
    'Cancel a subscription': [{
      src: '/wiki/storage-and-supporter/cancel-subscription.webp',
      alt: 'The Cancel subscription confirmation says existing work is kept and free-plan limits apply to new uploads, with Cancel and Cancel subscription buttons.',
      caption: 'From Settings, open Plan and choose Cancel subscription. Review the confirmation before continuing; Cancel leaves the subscription unchanged.',
      width: 528, height: 194,
    }],
  },
};
