import { NfcService } from './NfcService';
import { ReactNativeNfcDriver } from './reactNativeNfcDriver';

export const nfcService = new NfcService(new ReactNativeNfcDriver());

export * from './types';
export * from './tagUtils';
export { NfcService };
