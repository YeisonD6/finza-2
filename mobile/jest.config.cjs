module.exports = {
  preset: "jest-expo",
  testMatch: ["**/__tests__/**/*.test.tsx"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.cjs"],
  testTimeout: 30000,
  moduleNameMapper: {
    "^lucide-react-native$":
      "<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js",
    "^immer$": "<rootDir>/node_modules/immer/dist/cjs/index.js",
    "^react-redux$": "<rootDir>/node_modules/react-redux/dist/cjs/index.js",
    // Reanimated 4.7.1's bundled mock throws under Jest; expo-router's testing library
    // also re-mocks it from `react-native-reanimated/mock`. Both names map to ours
    // (tests/reanimated).
    "^react-native-reanimated$": "<rootDir>/tests/reanimated/index.cjs",
    "^react-native-reanimated/mock$": "<rootDir>/tests/reanimated/mock.cjs",
    "^react-native-worklets$": "<rootDir>/tests/reanimated/worklets.cjs",
  },
};
