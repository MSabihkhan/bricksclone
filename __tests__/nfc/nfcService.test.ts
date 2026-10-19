import { NfcService } from '../../src/services/nfc/NfcService';
import { NfcDriver, NfcTag } from '../../src/services/nfc/types';

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

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

  describe('subscribe', () => {
    beforeEach(() => {
      mockDriver.isSupported.mockResolvedValue(true);
      mockDriver.isEnabled.mockResolvedValue(true);
    });

    it('fans one hardware tag event out to every subscriber', async () => {
      const a = jest.fn();
      const b = jest.fn();
      service.subscribe(a);
      service.subscribe(b);
      await flush();

      const listenerCallback = mockDriver.setTagListener.mock.calls[0][0];
      listenerCallback({ id: 'a1:b2', techTypes: [] });

      expect(a).toHaveBeenCalledWith({ id: 'A1B2', techTypes: [] });
      expect(b).toHaveBeenCalledWith({ id: 'A1B2', techTypes: [] });
    });

    it('arms the driver only once for multiple subscribers', async () => {
      service.subscribe(jest.fn());
      await flush();
      service.subscribe(jest.fn());
      await flush();

      expect(mockDriver.start).toHaveBeenCalledTimes(1);
      expect(mockDriver.setTagListener).toHaveBeenCalledTimes(1);
    });

    it('keeps the reader armed until the last subscriber leaves', async () => {
      const unsubA = service.subscribe(jest.fn());
      const unsubB = service.subscribe(jest.fn());
      await flush();

      unsubA();
      expect(mockDriver.stop).not.toHaveBeenCalled();

      unsubB();
      await flush();
      expect(mockDriver.stop).toHaveBeenCalled();
    });
  });

  describe('active scan (iOS)', () => {
    beforeEach(() => {
      mockDriver.scanOnce = jest.fn();
      mockDriver.cancelScan = jest.fn().mockResolvedValue(undefined);
    });

    it('fans a scanned tag out to every subscriber with a normalized id', async () => {
      (mockDriver.scanOnce as jest.Mock).mockResolvedValue({ id: '04:a1:b2', techTypes: [] });
      const a = jest.fn();
      const b = jest.fn();
      service.subscribe(a);
      service.subscribe(b);

      await expect(service.scan('Hold near key')).resolves.toBe('tag');

      expect(mockDriver.scanOnce).toHaveBeenCalledWith('Hold near key');
      expect(a).toHaveBeenCalledWith({ id: '04A1B2', techTypes: [] });
      expect(b).toHaveBeenCalledWith({ id: '04A1B2', techTypes: [] });
    });

    it('reports a cancelled scan without calling subscribers', async () => {
      (mockDriver.scanOnce as jest.Mock).mockResolvedValue(null);
      const handler = jest.fn();
      service.subscribe(handler);

      await expect(service.scan('Hold near key')).resolves.toBe('cancelled');
      expect(handler).not.toHaveBeenCalled();
    });

    it('runs scans one at a time', async () => {
      let release: (tag: NfcTag | null) => void = () => {};
      (mockDriver.scanOnce as jest.Mock)
        .mockReturnValueOnce(new Promise(resolve => { release = resolve; }))
        .mockResolvedValueOnce({ id: 'BB', techTypes: [] });

      const first = service.scan('one');
      const second = service.scan('two');
      await flush();
      expect(mockDriver.scanOnce).toHaveBeenCalledTimes(1);

      release({ id: 'AA', techTypes: [] });
      await first;
      await second;
      expect(mockDriver.scanOnce).toHaveBeenCalledTimes(2);
    });

    it('drops a queued scan once cancelScan has been called', async () => {
      let release: (tag: NfcTag | null) => void = () => {};
      (mockDriver.scanOnce as jest.Mock).mockReturnValueOnce(new Promise(resolve => { release = resolve; }));

      const first = service.scan('one');
      const queued = service.scan('two');
      await flush();
      await service.cancelScan();
      release(null);

      await first;
      await expect(queued).resolves.toBe('cancelled');
      expect(mockDriver.scanOnce).toHaveBeenCalledTimes(1);
      expect(mockDriver.cancelScan).toHaveBeenCalled();
    });

    it('cancels without a native scan when the driver has none', async () => {
      delete mockDriver.scanOnce;
      await expect(service.scan('x')).resolves.toBe('cancelled');
    });
  });

  it('simulateTap delivers the debug key to subscribers', () => {
    const handler = jest.fn();
    service.subscribe(handler);
    service.simulateTap();
    expect(handler).toHaveBeenCalledWith({ id: 'DEADBEEF', techTypes: [] });
    service.simulateTap('ab:cd:ef:01');
    expect(handler).toHaveBeenLastCalledWith({ id: 'ABCDEF01', techTypes: [] });
  });
});
