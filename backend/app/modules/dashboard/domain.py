"""Cash-flow comparison; this is not investment performance."""

from decimal import Decimal, localcontext

from app.shared.money import rounded


def compare_net(current: Decimal, previous: Decimal | None) -> dict:
    if previous is None:
        return {"delta": None, "percent": None, "reason": "no_previous_data"}
    with localcontext() as context:
        context.prec = 38
        delta = current - previous
        percent = rounded(delta / previous * 100) if previous > 0 else None
        if percent == "-0.00":
            percent = "0.00"
        reason = "comparable" if previous > 0 else "zero_baseline" if previous == 0 else "negative_baseline"
        return {"delta": rounded(delta), "percent": percent, "reason": reason}
