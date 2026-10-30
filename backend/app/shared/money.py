"""Money crosses boundaries as decimal strings, never binary floats."""

import re
from decimal import ROUND_HALF_UP, Decimal, localcontext

MAX_AMOUNT = Decimal("999999999999999.99")


def parse_amount(value: str, currency: str = "COP") -> Decimal:
    if currency != "COP" or not isinstance(value, str):
        raise ValueError("Expected a COP decimal string")
    if not re.fullmatch(r"[0-9]{1,15}(\.[0-9]{1,2})?", value):
        raise ValueError("Invalid amount format")
    amount = Decimal(value)
    if not Decimal(0) < amount <= MAX_AMOUNT:
        raise ValueError("Amount outside allowed range")
    with localcontext() as context:
        context.prec = 38
        return amount.quantize(Decimal("0.01"))


def rounded(value: Decimal) -> str:
    with localcontext() as context:
        context.prec = 38
        return format(value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP), ".2f")
