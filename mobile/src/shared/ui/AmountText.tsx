import type { ComponentProps } from "react";
import { AppText } from "./AppText";
import { formatCOP, amountLabel } from "../formatting/money";
import { colors } from "../theme/tokens";
export function AmountText({
  value,
  tone = "neutral",
  style,
  accessibilityLabel,
  suffix,
  ...props
}: Omit<ComponentProps<typeof AppText>, "children"> & {
  value: string;
  suffix?: React.ReactNode;
  tone?: "neutral" | "income" | "expense" | "auto";
}) {
  const kind =
    tone === "auto" ? (value.startsWith("-") ? "expense" : "income") : tone;
  const signed =
    kind === "expense"
      ? `−${formatCOP(value.replace(/^-/, ""))}`
      : kind === "income"
        ? `+${formatCOP(value.replace(/^-/, ""))}`
        : formatCOP(value);
  return (
    <AppText
      {...props}
      accessibilityLabel={accessibilityLabel ?? amountLabel(value, tone)}
      style={[
        {
          fontVariant: ["tabular-nums"],
          color:
            kind === "expense"
              ? colors.expense
              : kind === "income"
                ? colors.forest600
                : colors.ink,
        },
        style,
      ]}
    >
      {signed}
      {suffix}
    </AppText>
  );
}
