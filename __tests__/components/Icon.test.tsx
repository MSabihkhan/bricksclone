import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Icon } from '../../src/components/Icon';

describe('Icon component', () => {
  it('renders without crashing', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<Icon name="lock" size={24} color="#fff" />);
    });
    expect(tree.toJSON()).toBeTruthy();
  });
});
