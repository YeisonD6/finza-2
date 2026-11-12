// `react-native-worklets` in Jest: its native module throws when constructed, so
// thread hops run inline on the JS thread.
const call = (fn, ...args) => fn(...args);
module.exports = {
  __esModule: true,
  scheduleOnRN: call,
  scheduleOnUI: call,
  runOnJS: (fn) => fn,
  runOnUI: (fn) => fn,
  isWorkletFunction: () => false,
};
