/**
 * Where the card (and the phone prop) sit on each onboarding page. Swipe progress 0→3
 * interpolates between these, so a half swipe leaves the card half-way. When the card
 * becomes a Rive/Lottie file, this table becomes its timeline.
 * x/y are offsets from the stage centre (dp); r* in degrees; po = phone opacity.
 */
export interface Pose { x: number; y: number; rx: number; ry: number; rz: number; s: number; px: number; py: number; pr: number; po: number }

export const ONBOARDING_POSES: Pose[] = [
  { x: 0,    y: 0,   rx: 16, ry: -24, rz: -8, s: 1.05, px: 0,  py: 330, pr: 0,   po: 0 },  // meet your key
  { x: -20,  y: 60,  rx: 60, ry: 0,   rz: 0,  s: 1.0,  px: 66, py: -50, pr: 14,  po: 1 },  // pair: phone over the card
  { x: -112, y: -95, rx: 0,  ry: 18,  rz: 8,  s: 0.36, px: 0,  py: 330, pr: 0,   po: 0 },  // permissions: card tucks away
  { x: -18,  y: 6,   rx: 6,  ry: 14,  rz: -4, s: 1.0,  px: 92, py: -14, pr: -22, po: 1 },  // tap to start
];

export const PAGE_COUNT = ONBOARDING_POSES.length;
