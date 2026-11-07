// Deterministic animation preference; dedicated motion tests override this.
const { AccessibilityInfo } = require("react-native");
AccessibilityInfo.isReduceMotionEnabled = jest.fn().mockResolvedValue(true);
