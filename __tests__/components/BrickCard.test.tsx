import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { Path } from 'react-native-svg';
import { BrickCard } from '../../src/components/BrickCard';

jest.mock('../../src/theme/ThemeContext', () => ({
  useTheme: () => ({ colors: { card: '#17181A', border: '#2B2C2F', text: '#F7F7F5' } }),
}));

const svgPaths = (tree: renderer.ReactTestRenderer) => tree.root.findAllByType(Path);

describe('BrickCard', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('draws two eyes and a mouth on the front', () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<BrickCard width={260} face="idle" />); });
    expect(svgPaths(tree)).toHaveLength(3);
  });

  it('is just the printed card when the persona is off', () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<BrickCard width={260} face={null} say />); });
    expect(svgPaths(tree)).toHaveLength(0);
  });

  it('carries the line for its state', () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<BrickCard width={108} face="session_started" say />); });
    expect(tree.root.findByType(Text).props.children).toBe('Locked in. Go.');
  });
});
