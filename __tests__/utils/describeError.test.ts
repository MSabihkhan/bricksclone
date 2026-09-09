import { describeError } from '../../src/utils/describeError';

describe('describeError', () => {
  it('uses the message from a real Error', () => {
    expect(describeError(new Error('disk full'))).toBe('disk full');
  });

  it('falls back to name + toString for a message-less Error', () => {
    const err = new Error('');
    expect(describeError(err)).toBe(`Error: ${err.toString()}`);
  });

  it('passes strings through unchanged', () => {
    expect(describeError('boom')).toBe('boom');
  });

  it('serializes a plain rejection object instead of collapsing to [object Object]', () => {
    const result = describeError({ code: 'E_SQLITE', message: 'native module unavailable' });
    expect(result).not.toBe('[object Object]');
    expect(result).toContain('E_SQLITE');
    expect(result).toContain('native module unavailable');
  });

  it('never returns an empty string for a bare object', () => {
    // Object.create(null) has no toString, which used to be the case this whole thing
    // was written for: something falls through every branch and yields ''.
    expect(describeError({})).not.toBe('');
  });
});
