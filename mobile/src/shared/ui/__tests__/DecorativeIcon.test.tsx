import React from "react";
import { Platform } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { render } from "@testing-library/react-native";
import { DecorativeIcon } from "../DecorativeIcon";
afterEach(() => jest.restoreAllMocks());
test.each(["web", "android", "ios"] as const)(
  "decorative icon hides from readers and avoids the SVG accessible warning on %s",
  async (platform) => {
    jest.replaceProperty(Platform, "OS", platform);
    const probe = jest.fn((_props: Record<string, unknown>) => null);
    const view = await render(
      <DecorativeIcon icon={probe as unknown as LucideIcon} />,
    );
    expect(probe.mock.calls[0][0]).toEqual(
      expect.objectContaining(
        platform === "web" ? { size: 24 } : { accessible: false },
      ),
    );
    if (platform === "web")
      expect(probe.mock.calls[0][0]).not.toHaveProperty("accessible");
    const wrapper = view.toJSON() as unknown as {
      props: Record<string, unknown>;
    };
    expect(wrapper.props.accessibilityElementsHidden).toBe(true);
    expect(wrapper.props.importantForAccessibility).toBe("no-hide-descendants");
  },
);
