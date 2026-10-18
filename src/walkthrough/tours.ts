import type { Tour } from './engine';

/**
 * Every walkthrough in the app, as data. To change a tour, edit it here. To point a step at a
 * new element, tag that element with useWalkthroughTarget('<key>') and use the key below.
 * Bump `version` when a change should be shown to people who already saw the tour.
 */
export const TOURS: Record<string, Tour> = {
  home: {
    id: 'home',
    version: 1,
    steps: [
      {
        target: 'home.ritualPicker',
        title: 'Say what this session is for',
        body: 'Pick a ritual. It changes the question fasla asks you and what it tracks afterwards.',
      },
      {
        target: 'home.brickRail',
        title: 'Your keys',
        body: 'Each key has its own setup. Tap one to select it, hold it to edit what it blocks.',
      },
      {
        target: 'home.startButton',
        title: 'Start with an intention',
        body: 'Write the one thing you’ll finish. Or skip this and just tap your key — focus starts right away.',
      },
      {
        target: 'tabs.insights',
        title: 'See what you protected',
        body: 'Focus time, blocked attempts and how your study and work sessions went.',
      },
    ],
  },
};
