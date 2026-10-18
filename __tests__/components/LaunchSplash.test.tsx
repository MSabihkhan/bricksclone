import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { Path, Rect } from 'react-native-svg';
import { LaunchSplash } from '../../src/components/LaunchSplash';
import { FaslaMark } from '../../src/components/FaslaMark';
import { wordmarkLayout } from '../../src/components/FaslaWordmark';
import { LAUNCH } from '../../src/brand/launchTimeline';

describe('LaunchSplash (2c)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('draws f, a, s, l, a and the full stop, with the Urdu name underneath', () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<LaunchSplash animated={false} />); });
    expect(tree.root.findAllByType(Path)).toHaveLength(6);
    expect(tree.root.findByType(Text).props.children).toBe('فاصلہ');
  });

  it('hands over to the app after the still hold when not animating', () => {
    const onDone = jest.fn();
    act(() => { renderer.create(<LaunchSplash animated={false} onDone={onDone} />); });
    act(() => { jest.advanceTimersByTime(LAUNCH.stillHold - 1); });
    expect(onDone).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(1); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe('fasla logo', () => {
  it('draws the 1a tile: one rounded tile and one f', () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<FaslaMark size={48} />); });
    expect(tree.root.findAllByType(Rect)).toHaveLength(1);
    expect(tree.root.findAllByType(Path)).toHaveLength(1);
  });

  it('lays the wordmark out left to right with tight tracking', () => {
    const { xs, width } = wordmarkLayout();
    expect(xs).toHaveLength(6);
    xs.slice(1).forEach((x, i) => expect(x).toBeGreaterThan(xs[i]));
    expect(width).toBeGreaterThan(xs[5]);
  });
});
