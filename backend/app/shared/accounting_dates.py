"""Keep accounting dates independent from transport timestamps."""

import re
from datetime import date, datetime
from zoneinfo import ZoneInfo


def month_bounds(month: str) -> tuple[date, date]:
    if not re.fullmatch(r"[0-9]{4}-[0-9]{2}", month):
        raise ValueError("Expected YYYY-MM")
    year, number = map(int, month.split("-"))
    if not 1900 <= year <= 9998:
        raise ValueError("Unsupported year")
    start = date(year, number, 1)
    end = date(year + 1, 1, 1) if number == 12 else date(year, number + 1, 1)
    return start, end


def accounting_today(now: datetime) -> date:
    if now.utcoffset() is None:
        raise ValueError("An aware timestamp is required")
    return now.astimezone(ZoneInfo("America/Bogota")).date()
