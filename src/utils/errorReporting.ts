import { describeError } from './describeError';
import { faslaAlert } from '../components/FaslaDialog';

declare const global: {
  ErrorUtils?: {
    setGlobalHandler: (handler: (error: unknown, isFatal?: boolean) => void) => void;
    getGlobalHandler: () => ((error: unknown, isFatal?: boolean) => void) | undefined;
  };
};

/**
 * Release builds have no console and no red-box — an uncaught JS exception normally just
 * kills the app silently. Without a way to pull device logs (no USB debugging enabled on
 * the test phone), that's undiagnosable. This surfaces the error as an on-screen alert
 * before whatever default handling would otherwise happen.
 */
export function installGlobalErrorHandler(): void {
  const errorUtils = global.ErrorUtils;
  if (!errorUtils) return;

  const previousHandler = errorUtils.getGlobalHandler();

  errorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
    try {
      const stack = error instanceof Error && error.stack ? `\n\n${error.stack}` : '';
      faslaAlert(isFatal ? 'App crashed' : 'Something went wrong', `${describeError(error)}${stack}`.slice(0, 1200));
    } catch {
      // The dialog itself must not be able to crash the crash handler.
    }
    previousHandler?.(error, isFatal);
  });
}
