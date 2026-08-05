import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Slider } from '../../src/components/Slider';

jest.mock('../../src/theme/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      track: '#EAEDF2',
    }
  })
}));

describe('Slider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders track and thumb correctly', () => {
    const onValueChange = jest.fn();
    let tree: any;
    act(() => {
      tree = renderer.create(
        <Slider value={50} min={0} max={100} onValueChange={onValueChange} accentColor="#FF0000" />
      );
    });
    
    act(() => {
      jest.runAllTimers();
    });

    expect(tree.toJSON()).toBeTruthy();
  });
});
