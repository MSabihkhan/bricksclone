import { createTestDatabase, SqlJsDriver } from './helpers';
import { TagRepository } from '../../src/db/repositories/TagRepository';
import { BlockedAppsRepository } from '../../src/db/repositories/BlockedAppsRepository';
import { SessionRepository } from '../../src/db/repositories/SessionRepository';
import { BlockedAttemptRepository } from '../../src/db/repositories/BlockedAttemptRepository';
import { SettingsRepository } from '../../src/db/repositories/SettingsRepository';

describe('Repositories', () => {
  let driver: SqlJsDriver;

  beforeEach(async () => {
    driver = await createTestDatabase();
  });

  afterEach(async () => {
    await driver.close();
  });

  describe('TagRepository', () => {
    it('can register, get, update and delete tags', async () => {
      const repo = new TagRepository(driver);
      
      const tag = {
        id: 'tag-1',
        name: 'Work',
        location: null,
        mode: 'deep',
        categories: { social: true },
        duration: '50',
        strict: 1,
        createdAt: 123456,
      };

      await repo.registerTag(tag);
      let fetched = await repo.getTagById('tag-1');
      expect(fetched).toEqual({ ...tag, apps: null });

      // Dedupe by id via INSERT OR REPLACE
      await repo.registerTag({ ...tag, name: 'Work 2' });
      fetched = await repo.getTagById('tag-1');
      expect(fetched?.name).toBe('Work 2');

      // list
      const tags = await repo.listTags();
      expect(tags).toHaveLength(1);

      // update
      await repo.updateTag('tag-1', { duration: '60' });
      fetched = await repo.getTagById('tag-1');
      expect(fetched?.duration).toBe('60');

      // delete
      await repo.deleteTag('tag-1');
      fetched = await repo.getTagById('tag-1');
      expect(fetched).toBeUndefined();
    });
  });

  describe('BlockedAppsRepository', () => {
    it('supports CRUD + replaceAll', async () => {
      const repo = new BlockedAppsRepository(driver);
      
      const app1 = { packageName: 'com.test.app', label: 'Test App', addedAt: 1000 };
      const app2 = { packageName: 'com.other.app', label: 'Other App', addedAt: 2000 };

      await repo.addBlockedApp(app1);
      await repo.addBlockedApp(app2);

      let apps = await repo.listBlockedApps();
      expect(apps).toHaveLength(2);
      expect(apps[0].packageName).toBe('com.other.app'); // ordered by addedAt DESC

      await repo.removeBlockedApp('com.test.app');
      apps = await repo.listBlockedApps();
      expect(apps).toHaveLength(1);

      // replaceAll
      await repo.replaceAll([
        { packageName: 'com.new.app', label: 'New App', addedAt: 3000 },
      ]);
      apps = await repo.listBlockedApps();
      expect(apps).toHaveLength(1);
      expect(apps[0].packageName).toBe('com.new.app');
    });
  });

  describe('SessionRepository', () => {
    it('manages sessions and handles active state', async () => {
      const repo = new SessionRepository(driver);
      
      const sessionId = await repo.startSession({
        tagId: 'tag-1',
        startTime: 1000,
        strict: 1,
        apps: ['com.test.app'],
      });

      let active = await repo.getActiveSession();
      expect(active).toBeDefined();
      expect(active?.id).toBe(sessionId);

      await repo.endSession(sessionId, { endedVia: 'nfc', durationSec: 3600 });
      
      active = await repo.getActiveSession();
      expect(active).toBeUndefined();

      const session = await repo.getSessionById(sessionId);
      expect(session?.endedVia).toBe('nfc');
      expect(session?.durationSec).toBe(3600);

      const all = await repo.listSessions();
      expect(all).toHaveLength(1);

      // test sessionsBetween
      const between = await repo.sessionsBetween(500, 1500);
      expect(between).toHaveLength(1);

      const outside = await repo.sessionsBetween(2000, 3000);
      expect(outside).toHaveLength(0);
    });

    it('records ritual intention, parked note, and outcome', async () => {
      const repo = new SessionRepository(driver);
      const sessionId = await repo.startSession({
        tagId: 'tag-1', startTime: 1000, strict: 1, apps: [],
        routineType: 'study', intention: 'Solve 10 questions',
      });
      await repo.saveLaterNote(sessionId, 'Email the tutor');
      await repo.endSession(sessionId, { endedVia: 'nfc', durationSec: 1200, endTime: 2200 });

      expect((await repo.getPendingOutcome())?.id).toBe(sessionId);
      await repo.saveOutcome(sessionId, { outcome: 'partial', nextStep: 'Finish questions 8-10' });

      const saved = await repo.getSessionById(sessionId);
      expect(saved).toMatchObject({
        routineType: 'study', intention: 'Solve 10 questions', outcome: 'partial',
        nextStep: 'Finish questions 8-10', laterNote: 'Email the tutor',
      });
      expect(await repo.getPendingOutcome()).toBeUndefined();
    });

    it('finds sessions that ran into a range, not only ones that started in it', async () => {
      const repo = new SessionRepository(driver);
      const overnight = await repo.startSession({ tagId: 't', startTime: 900, strict: 1, apps: [] });
      await repo.endSession(overnight, { endedVia: 'nfc', durationSec: 300, endTime: 1200 });
      const before = await repo.startSession({ tagId: 't', startTime: 100, strict: 1, apps: [] });
      await repo.endSession(before, { endedVia: 'nfc', durationSec: 100, endTime: 200 });

      const ids = (await repo.sessionsOverlapping(1000, 2000)).map(x => x.id);
      expect(ids).toContain(overnight);
      expect(ids).not.toContain(before);
    });

    it('never asks for an outcome on a prayer session when filtered to graded rituals', async () => {
      const repo = new SessionRepository(driver);
      const prayerId = await repo.startSession({
        tagId: 'tag-1', startTime: 3000, strict: 1, apps: [],
        routineType: 'prayer', intention: 'Arrive and be present',
      });
      await repo.endSession(prayerId, { endedVia: 'timer', durationSec: 900, endTime: 3900 });

      expect(await repo.getPendingOutcome(['study', 'work'])).toBeUndefined();
      expect(await repo.getPendingOutcome([])).toBeUndefined();
      // Unfiltered behaviour is unchanged for callers that want every session.
      expect((await repo.getPendingOutcome())?.id).toBe(prayerId);
    });
  });

  describe('per-Brick app lists', () => {
    it('stores a Brick’s own apps and keeps them through other edits', async () => {
      const repo = new TagRepository(driver);
      await repo.registerTag({ id: 'B1', name: 'Desk', location: null, mode: 'deep', categories: {}, duration: '50', strict: 1, createdAt: 1 });
      expect((await repo.getTagById('B1'))?.apps).toBeNull();

      await repo.updateTag('B1', { apps: ['com.whatsapp'] });
      await repo.updateTag('B1', { name: 'Study desk' });
      const tag = await repo.getTagById('B1');
      expect(tag?.name).toBe('Study desk');
      expect(tag?.apps).toEqual(['com.whatsapp']);

      await repo.updateTag('B1', { apps: null });
      expect((await repo.getTagById('B1'))?.apps).toBeNull();
    });
  });

  describe('BlockedAttemptRepository', () => {
    it('records attempts and counts them', async () => {
      const repo = new BlockedAttemptRepository(driver);
      
      await repo.recordAttempt({
        sessionId: 1,
        packageName: 'com.bad.app',
        label: 'Bad App',
        createdAt: 1000,
      });

      const attempts = await repo.attemptsForSession(1);
      expect(attempts).toHaveLength(1);
      expect(attempts[0].packageName).toBe('com.bad.app');

      const count = await repo.countTotal();
      expect(count).toBe(1);
    });
  });

  describe('SettingsRepository', () => {
    it('handles settings round-trip', async () => {
      const repo = new SettingsRepository(driver);
      
      await repo.set('theme', 'dark');
      await repo.set('notifications', 'on');

      const theme = await repo.get('theme');
      expect(theme).toBe('dark');

      const all = await repo.getAll();
      expect(all).toEqual({ theme: 'dark', notifications: 'on' });
    });
  });
});
