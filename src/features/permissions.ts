/**
 * Which Android permissions blocking actually depends on, and in what combination.
 *
 * Blocking needs two things: noticing that a blocked app came to the front, and being
 * allowed to put the lock screen over it from the background (Android 10+ forbids
 * background activity starts unless the app has an exemption). Two setups satisfy both:
 *
 *  - Accessibility on: detects instantly and is itself a background-start exemption.
 *  - Usage access + Display over other apps: detects by polling (about a second) and the
 *    overlay permission is the exemption.
 *
 * Usage access alone looks like it works — sessions start and attempts are logged — but
 * the lock screen silently fails to appear, so it does not count as ready.
 */
export interface PermissionStatus {
  usage: boolean;
  accessibility: boolean;
  overlay: boolean;
  notifications: boolean;
  notificationAccess: boolean;
  battery: boolean;
}

export type PermissionKey = keyof PermissionStatus;

export function canBlock(status: Pick<PermissionStatus, 'usage' | 'accessibility' | 'overlay'>): boolean {
  return status.accessibility || (status.usage && status.overlay);
}

export interface PermissionItem {
  key: PermissionKey;
  title: string;
  why: string;
  /** Needed for blocking to work at all (given the other grants). */
  required: boolean;
}

/**
 * The checklist shown during onboarding, in the order to grant them. Usage access and
 * overlay are listed as required only while Accessibility is off, because with
 * Accessibility on they are redundant.
 */
export function permissionChecklist(status: PermissionStatus): PermissionItem[] {
  const viaAccessibility = status.accessibility;
  return [
    {
      key: 'accessibility',
      title: 'Spot blocked apps instantly',
      why: 'Accessibility service. Covers a blocked app the moment it opens.',
      required: false,
    },
    {
      key: 'usage',
      title: 'See which app is open',
      why: viaAccessibility ? 'Usage access. A backup check if Accessibility is switched off.' : 'Usage access, so fasla knows when a blocked app opens.',
      required: !viaAccessibility,
    },
    {
      key: 'overlay',
      title: 'Show the lock screen',
      why: viaAccessibility ? 'Display over other apps. Not needed while Accessibility is on.' : 'Display over other apps, so the block screen can appear.',
      required: !viaAccessibility,
    },
    {
      key: 'notifications',
      title: 'Session updates',
      why: 'Notifications. Shows that focus is running and a summary when it ends.',
      required: false,
    },
    {
      key: 'notificationAccess',
      title: 'Silence blocked apps',
      why: 'Notification access. Holds back notifications from blocked apps while you focus.',
      required: false,
    },
    {
      key: 'battery',
      title: 'Keep running in the background',
      why: 'Battery. Stops Android from closing fasla mid-session.',
      required: false,
    },
  ];
}

export function missingRequired(status: PermissionStatus): PermissionKey[] {
  return permissionChecklist(status).filter(item => item.required && !status[item.key]).map(item => item.key);
}
