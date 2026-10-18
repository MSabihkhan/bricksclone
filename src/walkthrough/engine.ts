/**
 * Walkthrough engine: pure logic, no React. Tours are plain data (see tours.ts); a step
 * points at a UI element by *key*, and screens register those keys with
 * useWalkthroughTarget. Changing the UI therefore means changing data — and a step whose
 * target is missing or off-screen is skipped rather than breaking the tour.
 */
export type Placement = 'above' | 'below' | 'auto';

export interface WalkthroughStep {
  /** Key a screen registers with useWalkthroughTarget. */
  target: string;
  title: string;
  body: string;
  placement?: Placement;
}

export interface Tour {
  id: string;
  /** Bump to show a changed tour again to people who saw the old one. */
  version: number;
  steps: WalkthroughStep[];
}

export interface Rect { x: number; y: number; width: number; height: number }

export type SeenMap = Record<string, number>;

export function shouldShow(tour: Tour, seen: SeenMap): boolean {
  return (seen[tour.id] ?? 0) < tour.version && tour.steps.length > 0;
}

export function markSeen(tour: Tour, seen: SeenMap): SeenMap {
  return { ...seen, [tour.id]: tour.version };
}

export function parseSeen(raw: string | undefined): SeenMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, v]) => typeof v === 'number')) as SeenMap;
  } catch {
    return {};
  }
}

/** A target counts as usable only if it is measured and at least partly inside the viewport. */
export function isVisible(rect: Rect | undefined, viewport: { width: number; height: number }): rect is Rect {
  if (!rect || rect.width <= 0 || rect.height <= 0) return false;
  return rect.y < viewport.height && rect.y + rect.height > 0 && rect.x < viewport.width && rect.x + rect.width > 0;
}

/** Index of the next step at or after `from` whose target is visible, or -1 when the tour is over. */
export function nextVisibleStep(
  tour: Tour,
  from: number,
  rects: Record<string, Rect | undefined>,
  viewport: { width: number; height: number },
): number {
  for (let i = Math.max(0, from); i < tour.steps.length; i++) {
    if (isVisible(rects[tour.steps[i].target], viewport)) return i;
  }
  return -1;
}

/** Steps the user will actually see, for an honest "2 of 3" counter. */
export function visibleStepCount(tour: Tour, rects: Record<string, Rect | undefined>, viewport: { width: number; height: number }): number {
  return tour.steps.filter(step => isVisible(rects[step.target], viewport)).length;
}

/** Put the tooltip on whichever side of the target has more room, unless the step says otherwise. */
export function tooltipSide(rect: Rect, viewportHeight: number, placement: Placement = 'auto'): 'above' | 'below' {
  if (placement !== 'auto') return placement;
  const spaceAbove = rect.y;
  const spaceBelow = viewportHeight - (rect.y + rect.height);
  return spaceBelow >= spaceAbove ? 'below' : 'above';
}
