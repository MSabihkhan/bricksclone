import { db } from '../db';

export async function isOnboarded(): Promise<boolean> {
  await db.init();
  const value = await db.settings.get('onboarded');
  return value === '1';
}

export async function completeOnboarding(): Promise<void> {
  await db.init();
  await db.settings.set('onboarded', '1');
}

