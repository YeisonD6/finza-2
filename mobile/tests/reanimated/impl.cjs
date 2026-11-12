// Minimal Reanimated stand-in for Jest, wired through moduleNameMapper. Reanimated
// 4.7.1's own mock throws while initialising (`setCSSEventHandler` is not available in JSReanimated), so tests use
// this: animated components are plain views, animations resolve to their target and
// the animation builders are spies, so a test can tell whether motion was started.
const React = require("react");
const RN = require("react-native");
const identity = (value) => value;
const easing = () => identity;
const Easing = {
  bezier: easing,
  in: easing,
  out: easing,
  inOut: easing,
  linear: identity,
  ease: identity,
  quad: identity,
  sin: identity,
};
const Animated = {
  View: RN.View,
  Image: RN.Image,
  Text: RN.Text,
  ScrollView: RN.ScrollView,
  createAnimatedComponent: identity,
};
module.exports = {
  __esModule: true,
  default: Animated,
  ...Animated,
  Easing,
  SensorType: {
    ACCELEROMETER: 1,
    GYROSCOPE: 2,
    GRAVITY: 3,
    MAGNETIC_FIELD: 4,
    ROTATION: 5,
  },
  useSharedValue: (initial) => React.useRef({ value: initial }).current,
  useDerivedValue: (compute) => ({ value: compute() }),
  useAnimatedStyle: (compute) => compute(),
  useAnimatedSensor: jest.fn(() => ({
    sensor: { value: { x: 0, y: 0, z: 0 } },
    isAvailable: false,
    unregister: () => {},
  })),
  withTiming: jest.fn(identity),
  withSpring: jest.fn(identity),
  withRepeat: jest.fn(identity),
  withDelay: jest.fn((_delay, value) => value),
  withSequence: jest.fn((...values) => values[values.length - 1]),
  cancelAnimation: jest.fn(),
  // Gesture Handler probes these to decide whether a config value is animated.
  isSharedValue: (value) =>
    !!value && typeof value === "object" && "value" in value,
};
