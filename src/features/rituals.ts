export type RoutineType = 'study' | 'work' | 'bedtime' | 'family' | 'prayer';

/**
 * A ritual is the *reason* for a focus session; the key decides *how* it runs (time,
 * strictness). Every ritual follows the same beats — name one intention, tap the key,
 * close the loop — and differs in the question it asks, the advice it gives, and whether
 * the session ends with an outcome check. Rationale and sources: docs/RITUALS.md.
 */
export interface RoutineDefinition {
  id: RoutineType;
  label: string;
  shortLabel: string;
  /** One line under the ritual picker: what this ritual is for. */
  tagline: string;
  /** Why it helps, in plain words. Deliberately modest — none of this is a promised result. */
  benefit: string;
  /** Suggested key setup. Guidance only; the key's own settings still apply. */
  suggestedSetup: string;
  prompt: string;
  placeholder: string;
  coach: string;
  /**
   * Whether the outcome ledger asks "done / partial / not done" afterwards. Only for
   * task rituals: grading bedtime, family time, or prayer as "not done" would be wrong.
   */
  asksOutcome: boolean;
}

export const RITUAL_STEPS = [
  { title: 'Name one intention', body: 'Before you start, write the one concrete thing this session is for.' },
  { title: 'Tap your key', body: 'Blocking starts. Leave the key where it lives — that distance is the point.' },
  { title: 'Close the loop', body: 'For study and work, say how it went and write the next step so it stops nagging you.' },
] as const;

export const ROUTINES: RoutineDefinition[] = [
  {
    id: 'study',
    label: 'Study ritual',
    shortLabel: 'Study',
    tagline: 'Finish one concrete piece of coursework.',
    benefit: 'A specific target like “chapter 4 questions” gives the session a finish line. Plans that spell out exactly what you will do get done more often than vague goals.',
    suggestedSetup: '50 min · strict',
    prompt: 'What will you finish?',
    placeholder: 'Revise chapter 4',
    coach: 'Make it concrete: pages, questions, or one chapter.',
    asksOutcome: true,
  },
  {
    id: 'work',
    label: 'Work ritual',
    shortLabel: 'Work',
    tagline: 'Ship one visible result without switching tasks.',
    benefit: 'Jumping between tasks leaves part of your attention stuck on the last one. One deliverable per session keeps you on a single thread until it is done.',
    suggestedSetup: '50–90 min · strict',
    prompt: 'What will you deliver?',
    placeholder: 'Send the project draft',
    coach: 'Choose one visible result, not a broad project.',
    asksOutcome: true,
  },
  {
    id: 'bedtime',
    label: 'Bedtime',
    shortLabel: 'Bedtime',
    tagline: 'Put the phone down so you can wind down.',
    benefit: 'Texting and calls after lights-out are linked with taking longer to fall asleep and feeling more tired the next day. A key away from the bed makes “one more check” a deliberate walk.',
    suggestedSetup: 'Ends on key tap · keep calls unblocked',
    prompt: 'What are you winding down for?',
    placeholder: 'Phone away until morning',
    coach: 'Keep calls and essential apps off your blocked list.',
    asksOutcome: false,
  },
  {
    id: 'family',
    label: 'Family time',
    shortLabel: 'Family',
    tagline: 'Give the people in front of you your attention.',
    benefit: 'In a restaurant study, people who kept phones out at dinner felt more distracted and enjoyed the meal less than people who put them away.',
    suggestedSetup: 'Ends on key tap · flexible',
    prompt: 'Who gets your attention now?',
    placeholder: 'Phone-free dinner',
    coach: 'Use one clear boundary: a meal, visit, or conversation.',
    asksOutcome: false,
  },
  {
    id: 'prayer',
    label: 'Quiet prayer time',
    shortLabel: 'Prayer',
    tagline: 'Keep a few minutes free of notifications.',
    benefit: 'Blocks distracting apps so the time stays undisturbed. fasla records only that quiet time happened — it never marks a prayer as performed or missed.',
    suggestedSetup: '15 min · time limit',
    prompt: 'Set a quiet intention',
    placeholder: 'Arrive, pause, and be present',
    coach: 'This records quiet time only. It never marks prayer as completed.',
    asksOutcome: false,
  },
];

export function getRoutine(id: string): RoutineDefinition {
  return ROUTINES.find(routine => routine.id === id) ?? ROUTINES[0];
}

/** Ritual ids whose sessions end with the done / partial / not done check. */
export const OUTCOME_ROUTINE_TYPES: RoutineType[] = ROUTINES.filter(routine => routine.asksOutcome).map(routine => routine.id);

export function asksOutcome(routineType: string): boolean {
  return OUTCOME_ROUTINE_TYPES.includes(routineType as RoutineType);
}

export interface RitualSummary {
  id: RoutineType;
  label: string;
  sessions: number;
  focusSec: number;
}

/** Focus time and session count per ritual, largest first; rituals with no sessions are omitted. */
export function summarizeByRitual(
  sessions: Array<{ routineType: string; durationSec: number | null; endedVia: string | null }>
): RitualSummary[] {
  const totals = new Map<RoutineType, RitualSummary>();
  for (const session of sessions) {
    if (session.endedVia === 'start_failed') continue;
    const routine = getRoutine(session.routineType);
    const entry = totals.get(routine.id) ?? { id: routine.id, label: routine.shortLabel, sessions: 0, focusSec: 0 };
    entry.sessions += 1;
    entry.focusSec += Math.max(0, session.durationSec ?? 0);
    totals.set(routine.id, entry);
  }
  return [...totals.values()].sort((a, b) => b.focusSec - a.focusSec || b.sessions - a.sessions);
}
