import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Alert, Text } from 'react-native';
import { faslaAlert, FaslaDialogHost, orderButtons } from '../../src/components/FaslaDialog';

jest.mock('../../src/theme/ThemeContext', () => ({
  useTheme: () => ({ mode: 'dark', colors: { card: '#17181A', border: '#2B2C2F', text: '#F7F7F5', muted: '#A0A09B', bg: '#0D0D0F', accent: '#E01F27' } }),
}));

describe('fasla dialog', () => {
  it('puts cancel first, then the action', () => {
    const order = orderButtons([{ text: 'Delete', style: 'destructive' }, { text: 'Cancel', style: 'cancel' }]);
    expect(order.map(b => b.text)).toEqual(['Cancel', 'Delete']);
  });

  it('falls back to the system alert before the host is mounted', () => {
    const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    faslaAlert('Title', 'Body');
    expect(spy).toHaveBeenCalledWith('Title', 'Body', [{ text: 'OK' }]);
    spy.mockRestore();
  });

  it('draws its own dialog once mounted, and runs the chosen action', () => {
    jest.useFakeTimers();
    const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const onDelete = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<FaslaDialogHost />); });
    act(() => { faslaAlert('Delete key', 'Are you sure?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: onDelete }]); });
    expect(spy).not.toHaveBeenCalled();
    const texts = tree.root.findAllByType(Text).map(t => t.props.children);
    expect(texts).toEqual(expect.arrayContaining(['Delete key', 'Are you sure?', 'Cancel', 'Delete']));
    const deleteButton = tree.root.findAll(n => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function')
      .find(n => n.findAllByType(Text).some(t => t.props.children === 'Delete'))!;
    act(() => { deleteButton.props.onPress(); jest.runAllTimers(); });
    expect(onDelete).toHaveBeenCalledTimes(1);
    spy.mockRestore();
    jest.useRealTimers();
  });
});
