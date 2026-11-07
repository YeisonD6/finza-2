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
  },
};
