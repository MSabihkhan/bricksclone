export type RoutineType = 'study' | 'work' | 'bedtime' | 'family' | 'prayer';

export interface RoutineDefinition {
  id: RoutineType;
  label: string;
  shortLabel: string;
  prompt: string;
  placeholder: string;
  coach: string;
}

export const ROUTINES: RoutineDefinition[] = [
  {
    id: 'study',
    label: 'Study ritual',
    shortLabel: 'Study',
    prompt: 'What will you finish?',
    placeholder: 'Revise chapter 4',
    coach: 'Make it concrete: pages, questions, or one chapter.',
  },
  {
    id: 'work',
    label: 'Work ritual',
    shortLabel: 'Work',
    prompt: 'What will you deliver?',
    placeholder: 'Send the project draft',
    coach: 'Choose one visible result, not a broad project.',
  },
  {
    id: 'bedtime',
    label: 'Bedtime',
    shortLabel: 'Bedtime',
    prompt: 'What are you winding down for?',
    placeholder: 'Phone away until morning',
    coach: 'Keep calls and essential apps available in your blocked-app list.',
  },
  {
    id: 'family',
    label: 'Family time',
    shortLabel: 'Family',
    prompt: 'Who gets your attention now?',
    placeholder: 'Phone-free dinner',
    coach: 'Use one clear boundary: a meal, visit, or conversation.',
  },
  {
    id: 'prayer',
    label: 'Quiet prayer time',
    shortLabel: 'Prayer',
    prompt: 'Set a quiet intention',
    placeholder: 'Arrive, pause, and be present',
    coach: 'This records quiet time only. It never marks prayer as completed.',
  },
];

export function getRoutine(id: string): RoutineDefinition {
  return ROUTINES.find(routine => routine.id === id) ?? ROUTINES[0];
}
