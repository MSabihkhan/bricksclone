import 'react-native';
import React from 'react';
import App from '../App';

// Note: test renderer must be required after react-native.
import renderer from 'react-test-renderer';

jest.mock('react-native-nfc-manager', () => ({
  start: jest.fn(),
  isSupported: jest.fn(),
  setAlertMessageIOS: jest.fn(),
  requestTechnology: jest.fn(),
  cancelTechnologyRequest: jest.fn(),
  getTag: jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
  return {
    NavigationContainer: ({children}: {children: React.ReactNode}) => children,
  };
});

jest.mock('@react-navigation/native-stack', () => {
  return {
    createNativeStackNavigator: () => ({
      Navigator: ({children}: {children: React.ReactNode}) => children,
      Screen: () => null,
    }),
  };
});

jest.mock('@react-navigation/bottom-tabs', () => {
  return {
    createBottomTabNavigator: () => ({
      Navigator: ({children}: {children: React.ReactNode}) => children,
      Screen: () => null,
    }),
  };
});

it('renders correctly', async () => {
  await renderer.act(async () => {
    renderer.create(<App />);
  });
});
