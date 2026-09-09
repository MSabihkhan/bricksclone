/**
 * `String(err)` on anything that isn't a real `Error` collapses to the useless
 * "[object Object]" — and native-module promise rejections that cross the bridge as plain
 * `{code, message, userInfo}` objects rather than `Error` instances are common enough that
 * this was hiding the one piece of information we actually needed from the device.
 */
export function describeError(err: unknown): string {
  if (err instanceof Error) {
    return err.message.trim() || `${err.name}: ${err.toString()}`;
  }
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    try {
      const json = JSON.stringify(err, Object.getOwnPropertyNames(err));
      if (json && json !== '{}') return json;
    } catch {
      // fall through
    }
    return Object.prototype.toString.call(err);
  }
  return String(err);
}
