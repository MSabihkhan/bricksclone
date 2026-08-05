module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^react-native-svg$': '<rootDir>/__mocks__/react-native-svg.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-nfc-manager)/)'
  ],
};
