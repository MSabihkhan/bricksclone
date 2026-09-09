import { Linking } from 'react-native';
import { BlockingModule } from '../../native/BlockingModule';
import { detectOem, OemId, OemInfo } from './oemDetection';

export function inAppName(): string {
  return 'Bricks';
}

async function getOem(): Promise<OemInfo> {
  try {
    const manufacturer = await BlockingModule.getManufacturer();
    return detectOem(manufacturer);
  } catch {
    return detectOem('generic');
  }
}

async function hasBatteryOptimizationExemption(): Promise<boolean> {
  try {
    return await BlockingModule.hasIgnoringBatteryOptimizations();
  } catch {
    return false;
  }
}

async function openBatterySettings(oem: OemId): Promise<void> {
  try {
    // Stock Android exposes a one-tap system dialog; the skinned OEMs bury it, so those
    // still need their own settings screen.
    if (oem === 'generic' || oem === 'google') {
      await BlockingModule.requestBatteryOptimizationExemption();
      return;
    }
    await BlockingModule.openOemSettings(oem, 'battery');
  } catch {
    await Linking.openSettings();
  }
}

async function hasOverlayPermission(): Promise<boolean> {
  try {
    return await BlockingModule.hasOverlayPermission();
  } catch {
    return false;
  }
}

async function requestOverlayPermission(): Promise<void> {
  try {
    await BlockingModule.requestOverlayPermission();
  } catch {
    await Linking.openSettings();
  }
}

async function openAutostartSettings(oem: OemId): Promise<void> {
  try {
    await BlockingModule.openOemSettings(oem, 'autostart');
  } catch {
    await Linking.openSettings();
  }
}

export const oemService = {
  getOem,
  hasBatteryOptimizationExemption,
  openBatterySettings,
  openAutostartSettings,
  hasOverlayPermission,
  requestOverlayPermission,
};
