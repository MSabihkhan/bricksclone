import { PermissionsAndroid, Platform } from 'react-native';

/**
 * Android 13+ hides the focus-session foreground-service notification unless
 * POST_NOTIFICATIONS has been granted at runtime. The service still runs without it,
 * so a refusal is not fatal.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 33) return true;
  try {
    const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
    if (!permission) return true;
    const already = await PermissionsAndroid.check(permission);
    if (already) return true;
    const result = await PermissionsAndroid.request(permission);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}
