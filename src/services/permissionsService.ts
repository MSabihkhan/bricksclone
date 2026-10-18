import { PermissionsAndroid, Platform } from 'react-native';
import { BlockingModule } from '../native/BlockingModule';
import { oemService } from './oem/oemService';
import { ensureNotificationPermission } from '../utils/permissions';
import type { PermissionKey, PermissionStatus } from '../features/permissions';

const safe = (p: Promise<boolean>) => p.catch(() => false);

async function notificationsGranted(): Promise<boolean> {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 33) return true;
  return safe(PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS));
}

export async function readPermissions(): Promise<PermissionStatus> {
  const [usage, accessibility, overlay, notifications, notificationAccess, battery] = await Promise.all([
    safe(BlockingModule.hasUsageAccess()),
    safe(BlockingModule.isAccessibilityEnabled()),
    safe(BlockingModule.hasOverlayPermission()),
    notificationsGranted(),
    safe(BlockingModule.hasNotificationAccess()),
    oemService.hasBatteryOptimizationExemption(),
  ]);
  return { usage, accessibility, overlay, notifications, notificationAccess, battery };
}

/** Opens the system screen (or dialog) for one permission. Status is re-read when the app returns. */
export async function requestPermission(key: PermissionKey): Promise<void> {
  switch (key) {
    case 'usage':
      return BlockingModule.requestUsageAccess();
    case 'accessibility':
      return BlockingModule.requestAccessibility();
    case 'overlay':
      return BlockingModule.requestOverlayPermission();
    case 'notifications':
      await ensureNotificationPermission();
      return;
    case 'notificationAccess':
      return BlockingModule.requestNotificationAccess();
    case 'battery': {
      const oem = await oemService.getOem();
      return oemService.openBatterySettings(oem.id);
    }
  }
}

export function openAppInfo(): Promise<void> {
  return BlockingModule.openAppInfo();
}
