import { NfcService } from '../../src/services/nfc/NfcService';
import { NfcDriver, NfcTag } from '../../src/services/nfc/types';

describe('NfcService', () => {
  let mockDriver: jest.Mocked<NfcDriver>;
  let service: NfcService;

  beforeEach(() => {
    mockDriver = {
      isSupported: jest.fn(),
      isEnabled: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      setTagListener: jest.fn(),
      clearTagListener: jest.fn(),
      getLaunchTag: jest.fn(),
      openNfcSettings: jest.fn(),
    };
    service = new NfcService(mockDriver);
  });

  it('beginListening when unsupported resolves without calling setTagListener', async () => {
    mockDriver.isSupported.mockResolvedValue(false);
    mockDriver.isEnabled.mockResolvedValue(true);
    await service.beginListening(jest.fn());
    expect(mockDriver.setTagListener).not.toHaveBeenCalled();
  });

  it('beginListening when disabled resolves without calling setTagListener', async () => {
    mockDriver.isSupported.mockResolvedValue(true);
    mockDriver.isEnabled.mockResolvedValue(false);
    await service.beginListening(jest.fn());
    expect(mockDriver.setTagListener).not.toHaveBeenCalled();
  });

  it('beginListening when supported+enabled calls start + setTagListener with a normalized-tag callback', async () => {
    mockDriver.isSupported.mockResolvedValue(true);
    mockDriver.isEnabled.mockResolvedValue(true);
    const mockOnTag = jest.fn();
    
    await service.beginListening(mockOnTag);
    
    expect(mockDriver.start).toHaveBeenCalled();
    expect(mockDriver.setTagListener).toHaveBeenCalled();
    
    const listenerCallback = mockDriver.setTagListener.mock.calls[0][0];
    listenerCallback({ id: 'a1:b2:c3', techTypes: [] });
    
    expect(mockOnTag).toHaveBeenCalledWith({ id: 'A1B2C3', techTypes: [] });
  });

  it('stopListening calls clearTagListener + stop', async () => {
    await service.stopListening();
    expect(mockDriver.clearTagListener).toHaveBeenCalled();
    expect(mockDriver.stop).toHaveBeenCalled();
  });

  it('openSettings calls openNfcSettings', async () => {
    await service.openSettings();
    expect(mockDriver.openNfcSettings).toHaveBeenCalled();
  });

  it('getLaunchTag returns tag', async () => {
    const mockTag: NfcTag = { id: 'A1B2C3', techTypes: [] };
    mockDriver.getLaunchTag.mockResolvedValue(mockTag);
    const result = await service.getLaunchTag();
    expect(result).toEqual(mockTag);
  });
});
