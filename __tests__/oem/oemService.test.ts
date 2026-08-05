import { Linking } from 'react-native';
import { BlockingModule } from '../../src/native/BlockingModule';
import { oemService, inAppName } from '../../src/services/oem/oemService';

jest.mock('../../src/native/BlockingModule', () => ({
  BlockingModule: {
    getManufacturer: jest.fn(),
    hasIgnoringBatteryOptimizations: jest.fn(),
    openOemSettings: jest.fn(),
  },
}));

jest.mock('react-native', () => ({
  Linking: {
    openSettings: jest.fn(),
  },
}));

describe('oemService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getOem maps manufacturer via detectOem', async () => {
    (BlockingModule.getManufacturer as jest.Mock).mockResolvedValue('Xiaomi');
    const oem = await oemService.getOem();
    expect(oem.id).toBe('xiaomi');
  });

  it('getOem falls back to generic on native failure', async () => {
    (BlockingModule.getManufacturer as jest.Mock).mockRejectedValue(new Error('Failed'));
    const oem = await oemService.getOem();
    expect(oem.id).toBe('generic');
  });

  it('hasBatteryOptimizationExemption passes through', async () => {
    (BlockingModule.hasIgnoringBatteryOptimizations as jest.Mock).mockResolvedValue(true);
    const has = await oemService.hasBatteryOptimizationExemption();
    expect(has).toBe(true);
  });

  it('hasBatteryOptimizationExemption falls back to false on failure', async () => {
    (BlockingModule.hasIgnoringBatteryOptimizations as jest.Mock).mockRejectedValue(new Error('Failed'));
    const has = await oemService.hasBatteryOptimizationExemption();
    expect(has).toBe(false);
  });

  it('openBatterySettings calls openOemSettings', async () => {
    (BlockingModule.openOemSettings as jest.Mock).mockResolvedValue(undefined);
    await oemService.openBatterySettings('xiaomi');
    expect(BlockingModule.openOemSettings).toHaveBeenCalledWith('xiaomi', 'battery');
  });

  it('openBatterySettings falls back to Linking.openSettings on native throw', async () => {
    (BlockingModule.openOemSettings as jest.Mock).mockRejectedValue(new Error('Failed'));
    await oemService.openBatterySettings('xiaomi');
    expect(Linking.openSettings).toHaveBeenCalled();
  });

  it('openAutostartSettings calls openOemSettings', async () => {
    (BlockingModule.openOemSettings as jest.Mock).mockResolvedValue(undefined);
    await oemService.openAutostartSettings('xiaomi');
    expect(BlockingModule.openOemSettings).toHaveBeenCalledWith('xiaomi', 'autostart');
  });

  it('openAutostartSettings falls back to Linking.openSettings on native throw', async () => {
    (BlockingModule.openOemSettings as jest.Mock).mockRejectedValue(new Error('Failed'));
    await oemService.openAutostartSettings('xiaomi');
    expect(Linking.openSettings).toHaveBeenCalled();
  });

  it('inAppName returns Bricks', () => {
    expect(inAppName()).toBe('Bricks');
  });
});
