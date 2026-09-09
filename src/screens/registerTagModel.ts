import { db } from '../db';
import { normalizeTagId } from '../services/nfc/tagUtils';
import { defaultCategories } from '../utils/onboarding';

export async function registerBrick(tagId: string, name: string, location: string): Promise<void> {
  const normalized = normalizeTagId(tagId);
  const strictDefault = await db.settings.get('strict_mode');
  await db.tags.registerTag({
    id: normalized,
    name,
    location,
    mode: 'deep',
    categories: defaultCategories(),
    duration: '50',
    strict: strictDefault === '0' ? 0 : 1,
    createdAt: Math.floor(Date.now() / 1000)
  });
}
