// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { setEditorTourSeen } from '@/lib/editor-tour-prefs';

const TOUR_STEPS = [
  {
    element: '[data-tour="sidebar"]',
    popover: {
      title: 'Trails & notes',
      description: 'Organize your project into trails, and add notes to each one. A trail is an ordered sequence of notes. Add an existing note to reuse it.',
    },
  },
  {
    element: '[data-tour="editor-title"]',
    popover: {
      title: 'Project title',
      description: 'Double-click to rename your project.',
    },
  },
  {
    element: '[data-tour="write-panel"]',
    popover: {
      title: 'Write',
      description: 'Edit each note directly in the trail. Scroll to explore, or use the arrow keys at the start and end of a note to move between steps.',
    },
  },
  {
    element: '[data-tour="connections-toggle"]',
    popover: {
      title: 'Connections & map',
      description: 'Open this panel to connect notes and preview them on the project map.',
    },
  },
  {
    element: '[data-tour="overview-toggle"]',
    popover: {
      title: 'Trail overview',
      description: 'Switch to Trail overview to see the whole trail at a glance.',
    },
  },
  {
    element: '[data-tour="share"]',
    popover: {
      title: 'Share',
      description: 'Control who can see this project and publish it when you\'re ready.',
    },
  },
];

export function startEditorTour() {
  const steps = TOUR_STEPS.filter((step) => document.querySelector(step.element));
  if (!steps.length) return;
  driver({ showProgress: true, skipMissingElement: true, steps, onDestroyed: () => { void setEditorTourSeen(); } }).drive();
}
