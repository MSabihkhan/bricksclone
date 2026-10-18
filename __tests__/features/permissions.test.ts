import { canBlock, missingRequired, permissionChecklist, PermissionStatus } from '../../src/features/permissions';

const none: PermissionStatus = { usage: false, accessibility: false, overlay: false, notifications: false, notificationAccess: false, battery: false };

describe('canBlock', () => {
  it('is ready with Accessibility alone', () => {
    expect(canBlock({ ...none, accessibility: true })).toBe(true);
  });

  it('is ready with usage access plus overlay', () => {
    expect(canBlock({ ...none, usage: true, overlay: true })).toBe(true);
  });

  it('is not ready with usage access alone — the lock screen could not appear', () => {
    expect(canBlock({ ...none, usage: true })).toBe(false);
  });
});

describe('permission checklist', () => {
  it('asks for usage access and overlay while Accessibility is off', () => {
    expect(missingRequired(none).sort()).toEqual(['overlay', 'usage']);
  });

  it('requires nothing else once Accessibility is on', () => {
    expect(missingRequired({ ...none, accessibility: true })).toEqual([]);
  });

  it('never marks the optional extras as required', () => {
    const optional = permissionChecklist(none).filter(i => ['notifications', 'notificationAccess', 'battery', 'accessibility'].includes(i.key));
    expect(optional.every(i => !i.required)).toBe(true);
  });
});
