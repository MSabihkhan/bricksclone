/**
 * Order of the key cards on Home. Index 0 is the card on top — the one a session starts
 * with. Pure functions; Home keeps the order in state.
 */
interface HasId { id: string }
interface SessionLike { tagId: string | null; startTime: number }

/** Most recently used key first; never-used keys after, newest paired first. */
export function orderByRecentUse<T extends HasId & { createdAt: number }>(tags: T[], sessions: SessionLike[]): string[] {
  const lastUsed = new Map<string, number>();
  for (const s of sessions) {
    if (s.tagId && s.startTime > (lastUsed.get(s.tagId) ?? -1)) lastUsed.set(s.tagId, s.startTime);
  }
  return [...tags]
    .sort((a, b) => (lastUsed.get(b.id) ?? -1) - (lastUsed.get(a.id) ?? -1) || b.createdAt - a.createdAt)
    .map(t => t.id);
}

/**
 * Keep the order the person arranged while they're using the app, dropping deleted keys
 * and adding new ones. Only an empty order (first load) falls back to recency.
 */
export function reconcileOrder(current: string[], recency: string[]): string[] {
  if (current.length === 0) return recency;
  const known = new Set(recency);
  const kept = current.filter(id => known.has(id));
  const added = recency.filter(id => !kept.includes(id));
  return [...added, ...kept];
}

/** Swipe: the top card goes to the back. */
export function cycle(order: string[]): string[] {
  return order.length < 2 ? order : [...order.slice(1), order[0]];
}

export function bringToFront(order: string[], id: string): string[] {
  return order.includes(id) ? [id, ...order.filter(x => x !== id)] : order;
}
