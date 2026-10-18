import type { RoutineType } from './rituals';

/** Rituals offered on Home in the redesign, in order, with its wording and suggestions. */
export const HOME_RITUALS: Array<{ id: RoutineType; label: string; desc: string; placeholder: string; suggestions: string[] }> = [
  { id: 'study', label: 'Study', desc: 'Finish one concrete piece of coursework.', placeholder: 'Revise chapter 4', suggestions: ['Revise chapter 4', '20 practice questions', 'Outline the essay'] },
  { id: 'work', label: 'Work', desc: 'Ship one task you would be proud to show.', placeholder: 'Send the Q4 deck draft', suggestions: ['Send the Q4 deck draft', 'Clear the inbox', 'Fix the login bug'] },
  { id: 'bedtime', label: 'Bedtime', desc: 'Put the phone down and let the day end.', placeholder: 'Read 20 pages, lights out', suggestions: ['Read 20 pages', 'Journal for 10 min', 'Lights out by 11'] },
  { id: 'family', label: 'Family', desc: 'Be fully present with the people around you.', placeholder: 'Dinner with no phones', suggestions: ['Dinner with no phones', 'Park with the kids', 'Call Mum'] },
];

export function homeRitual(id: string) {
  return HOME_RITUALS.find(r => r.id === id) ?? HOME_RITUALS[0];
}
