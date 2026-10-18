/**
 * The card character. The app only ever names a state (see PersonaState); how that state
 * looks and moves lives here, so the face can be redrawn — or swapped for a Rive/Lottie
 * file later — without touching the screens that emit it.
 */
export type PersonaState = 'idle' | 'session_started' | 'session_completed' | 'blocked_app_opened';
/** Cards waiting in the Home stack doze. Not an app event, just how the stack draws them. */
export type PersonaFace = PersonaState | 'asleep';

export const PERSONA_SETTING_KEY = 'persona_enabled';

type Eyes = 'open' | 'blink' | 'focused' | 'happy' | 'glance';
type Mouth = 'smile' | 'firm' | 'grin' | 'small';
export type Motion = 'float' | 'lockin' | 'hop' | 'tilt' | 'none';

interface FaceSpec { eyes: Eyes; mouth: Mouth; line: string; motion: Motion }

// Rule: the persona speaks in five words or fewer, and never scolds.
export const PERSONA: Record<PersonaFace, FaceSpec> = {
  idle:               { eyes: 'open',    mouth: 'smile', line: 'Ready when you are.', motion: 'float' },
  session_started:    { eyes: 'focused', mouth: 'firm',  line: 'Locked in. Go.',      motion: 'lockin' },
  session_completed:  { eyes: 'happy',   mouth: 'grin',  line: 'Nice. Session done.', motion: 'hop' },
  blocked_app_opened: { eyes: 'glance',  mouth: 'small', line: 'Hey, back to focus?', motion: 'tilt' },
  asleep:             { eyes: 'blink',   mouth: 'firm',  line: '',                    motion: 'none' },
};

export function wordCount(line: string): number {
  return line.trim().split(/\s+/).filter(Boolean).length;
}

/*
 * Face geometry on the card's own coordinate space (100 × 63.6, the printed card's
 * proportions). The face sits in the red band between "TAP HERE" and the wordmark, so it
 * is drawn at 80% around (50, 20); `p` maps design coordinates into that box.
 */
export const CARD_VIEWBOX = { width: 100, height: 63.6 };
export const CARD_ASPECT = 63.6 / 100;      // 54.10 × 85.08 mm, from the card's 3D model
export const CARD_RADIUS = 0.0373;          // 3.18 mm corner, as a share of the width
export const CARD_EDGE = 0.009;             // 0.76 mm white PVC core
export const FACE_INK = '#0B0B0C';          // same black as the printed wordmark
const FACE_SCALE = 0.8;
export const EYE_STROKE = 6.5 * FACE_SCALE;
export const MOUTH_STROKE = 4 * FACE_SCALE;

const p = (x: number, y: number) => `${+(50 + (x - 50) * FACE_SCALE).toFixed(2)} ${+(20 + (y - 30) * FACE_SCALE).toFixed(2)}`;

const EYE_PATHS: Record<Eyes, (cx: number) => string> = {
  open:    cx => `M${p(cx, 21)} Q${p(cx, 26.5)} ${p(cx, 32)}`,
  blink:   cx => `M${p(cx - 3.5, 27)} Q${p(cx, 28)} ${p(cx + 3.5, 27)}`,
  focused: cx => `M${p(cx - 3, 24)} Q${p(cx, 24.5)} ${p(cx + 3, 26)}`,
  happy:   cx => `M${p(cx - 5, 29)} Q${p(cx, 19)} ${p(cx + 5, 29)}`,
  glance:  cx => `M${p(cx + 4, 21)} Q${p(cx + 4, 26)} ${p(cx + 4, 31)}`,
};

const MOUTH_PATHS: Record<Mouth, string> = {
  smile: `M${p(44, 41)} Q${p(50, 46)} ${p(56, 41)}`,
  firm:  `M${p(45, 43)} Q${p(50, 43.5)} ${p(55, 43)}`,
  grin:  `M${p(40, 39)} Q${p(50, 52)} ${p(60, 39)}`,
  small: `M${p(45.5, 43)} Q${p(50, 45.5)} ${p(54.5, 41.5)}`,   // lopsided half-smile: a nudge, not a frown
};

export interface FacePaths { leftEye: string; rightEye: string; mouth: string }

export function facePaths(face: PersonaFace, blinking = false): FacePaths {
  const spec = PERSONA[face];
  const eyes = blinking ? 'blink' : spec.eyes;
  return { leftEye: EYE_PATHS[eyes](40), rightEye: EYE_PATHS[eyes](60), mouth: MOUTH_PATHS[spec.mouth] };
}

/** Only an awake, resting card blinks; a blink mid-celebration reads as a wink. */
export function canBlink(face: PersonaFace, reduceMotion: boolean): boolean {
  return face === 'idle' && !reduceMotion;
}

export function parsePersonaEnabled(raw: string | undefined | null): boolean {
  return raw !== '0';
}
