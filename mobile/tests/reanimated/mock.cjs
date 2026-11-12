// `react-native-reanimated/mock` in Jest. A separate file from index.cjs so a
// `jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"))`
// factory (expo-router's testing library has one) does not require itself.
module.exports = require("./impl.cjs");
