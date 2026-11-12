// Deterministic animation preference; dedicated motion tests override this.
const { AccessibilityInfo } = require("react-native");
AccessibilityInfo.isReduceMotionEnabled = jest.fn().mockResolvedValue(true);

// Gesture Handler's official Jest setup mocks its native module (swipe-to-archive).
require("react-native-gesture-handler/jestSetup");
