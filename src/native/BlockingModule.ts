import { NativeModules, NativeEventEmitter, EmitterSubscription } from 'react-native';

const raw = NativeModules.BricksBlocking;

export interface BlockingState {
  sessionId: number;
  blockedPackages: string[];
  strict: boolean;
  startedAt: number;
}

export interface BlockedAttempt {
  sessionId: number;
  packageName: string;
  label: string;
  createdAt: number;
}

export interface InstalledApp {
  packageName: string;
  label: string;
}

const stub = () => Promise.reject(new Error('native module unavailable'));

const moduleImpl = raw
  ? {
      startBlocking: (params: {
        sessionId: number;
        blockedPackages: string[];
        strict: boolean;
        startedAt: number;
      }): Promise<void> => raw.startBlocking(params.sessionId, params.blockedPackages, params.strict, params.startedAt),
      stopBlocking: (): Promise<void> => raw.stopBlocking(),
      isBlockingActive: (): Promise<boolean> => raw.isBlockingActive(),
      getActiveBlocking: (): Promise<BlockingState | null> => raw.getActiveBlocking(),
      hasUsageAccess: (): Promise<boolean> => raw.hasUsageAccess(),
      requestUsageAccess: (): Promise<void> => raw.requestUsageAccess(),
      isAccessibilityEnabled: (): Promise<boolean> => raw.isAccessibilityEnabled(),
      requestAccessibility: (): Promise<void> => raw.requestAccessibility(),
      getForegroundPackage: (): Promise<string | null> => raw.getForegroundPackage(),
      getPendingBlockedAttempts: (): Promise<BlockedAttempt[]> => raw.getPendingBlockedAttempts(),
      getManufacturer: (): Promise<string> => raw.getManufacturer(),
      hasIgnoringBatteryOptimizations: (): Promise<boolean> => raw.hasIgnoringBatteryOptimizations(),
      openOemSettings: (oem: string, screen: string): Promise<void> => raw.openOemSettings(oem, screen),
      getInstalledApps: (): Promise<InstalledApp[]> => raw.getInstalledApps(),
    }
  : {
      startBlocking: stub,
      stopBlocking: stub,
      isBlockingActive: stub,
      getActiveBlocking: stub,
      hasUsageAccess: stub,
      requestUsageAccess: stub,
      isAccessibilityEnabled: stub,
      requestAccessibility: stub,
      getForegroundPackage: stub,
      getPendingBlockedAttempts: stub,
      getManufacturer: stub,
      hasIgnoringBatteryOptimizations: stub,
      openOemSettings: stub,
      getInstalledApps: stub,
    };

export const BlockingModule = moduleImpl;

export const blockedAttemptsEmitter = raw ? new NativeEventEmitter(raw) : null;

export function addAttemptListener(handler: (attempt: Omit<BlockedAttempt, 'sessionId'>) => void): () => void {
  if (!blockedAttemptsEmitter) {
    return () => {};
  }
  const sub: EmitterSubscription = blockedAttemptsEmitter.addListener('BlockedAttempt', handler);
  return () => {
    sub.remove();
  };
}
