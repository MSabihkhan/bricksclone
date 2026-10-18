export type OemId = 'xiaomi' | 'redmi' | 'poco' | 'oppo' | 'realme' | 'vivo' | 'samsung' | 'google' | 'generic';

export interface OemInfo {
  id: OemId;
  name: string;
  isAggressive: boolean;
  batterySteps: string[];
  autostartSteps: string[];
}

export const OEM_SUMMARY: Record<OemId, string> = {
  xiaomi: 'MIUI strictly limits background tasks. We need these exceptions to keep fasla running.',
  redmi: 'MIUI strictly limits background tasks. We need these exceptions to keep fasla running.',
  poco: 'MIUI strictly limits background tasks. We need these exceptions to keep fasla running.',
  oppo: 'ColorOS aggressively kills background apps. We need these settings to stay active.',
  realme: 'Realme UI aggressively kills background apps. We need these settings to stay active.',
  vivo: 'FuntouchOS requires manual autostart permission to keep focus sessions active.',
  samsung: 'OneUI puts apps to sleep. We need unrestricted battery access to function.',
  google: 'Standard Android battery optimization may interrupt your focus sessions.',
  generic: 'Battery optimization may prevent fasla from maintaining active focus sessions.',
};

export function detectOem(manufacturer: string): OemInfo {
  const m = manufacturer.toLowerCase();
  
  if (m.includes('xiaomi')) return getXiaomiInfo('xiaomi', 'Xiaomi');
  if (m.includes('redmi')) return getXiaomiInfo('redmi', 'Redmi');
  if (m.includes('poco')) return getXiaomiInfo('poco', 'POCO');
  if (m.includes('oppo')) return getOppoInfo('oppo', 'OPPO');
  if (m.includes('realme')) return getOppoInfo('realme', 'realme');
  if (m.includes('vivo') || m.includes('iqoo')) return getVivoInfo('vivo', 'vivo');
  if (m.includes('samsung')) return getSamsungInfo();
  if (m.includes('google') || m.includes('pixel')) return getGoogleInfo();

  return {
    id: 'generic',
    name: manufacturer || 'Android',
    isAggressive: false,
    batterySteps: ['In the list that opens, switch to “All apps”', 'Find fasla and choose “Don’t optimise”'],
    autostartSteps: ['Enable notification access if prompted'],
  };
}

function getXiaomiInfo(id: OemId, name: string): OemInfo {
  return {
    id,
    name,
    isAggressive: true,
    batterySteps: ['Go to Battery saver', 'Select "No restrictions"'],
    autostartSteps: ['Find fasla in the list', 'Enable Autostart switch'],
  };
}

function getOppoInfo(id: OemId, name: string): OemInfo {
  return {
    id,
    name,
    isAggressive: true,
    batterySteps: ['Go to Battery usage', 'Allow background activity', 'Allow auto launch'],
    autostartSteps: ['Find fasla', 'Enable Startup'],
  };
}

function getVivoInfo(id: OemId, name: string): OemInfo {
  return {
    id,
    name,
    isAggressive: true,
    batterySteps: ['Go to Battery', 'Select High background power consumption', 'Enable for fasla'],
    autostartSteps: ['Go to App settings', 'Enable Autostart'],
  };
}

function getSamsungInfo(): OemInfo {
  return {
    id: 'samsung',
    name: 'Samsung',
    isAggressive: true,
    batterySteps: ['Go to Battery settings', 'Select Unrestricted for fasla'],
    autostartSteps: ['Go to Memory', 'Exclude fasla from auto clean'],
  };
}

function getGoogleInfo(): OemInfo {
  return {
    id: 'google',
    name: 'Google',
    isAggressive: false,
    batterySteps: ['In the list that opens, switch to “All apps”', 'Find fasla and choose “Don’t optimise”'],
    autostartSteps: ['Standard Android autostart is handled automatically'],
  };
}
