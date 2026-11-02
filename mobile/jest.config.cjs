module.exports = {
  preset: "jest-expo",
  testMatch: ["**/__tests__/**/*.test.tsx"],
  testTimeout: 30000,
  moduleNameMapper: {
    "^immer$": "<rootDir>/node_modules/immer/dist/cjs/index.js",
    "^react-redux$": "<rootDir>/node_modules/react-redux/dist/cjs/index.js",
  },
};
