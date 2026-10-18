import type { Tag } from '../db/types';

/**
 * Which apps a session started from this key blocks: the key's own list if it has one,
 * otherwise the main list. An empty custom list falls back too, so a key can't silently
 * start a session that blocks nothing.
 */
export function appsForBrick(tag: Pick<Tag, 'apps'> | undefined, mainList: string[]): string[] {
  return tag?.apps && tag.apps.length > 0 ? tag.apps : mainList;
}

export function usesOwnList(tag: Pick<Tag, 'apps'> | undefined): boolean {
  return !!tag?.apps && tag.apps.length > 0;
}
