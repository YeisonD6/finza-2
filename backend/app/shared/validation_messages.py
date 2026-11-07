"""Spanish, value-free messages for request validation errors.

Pydantic produces English messages (and email-validator explains DNS rules in
English). The client shows ``field_errors`` next to each field, so every message
here is short Spanish copy that never echoes the submitted value.
"""

from typing import Any

_KNOWN_VALUE_ERRORS = {
    "Expected a COP decimal string": "Escribe un monto válido, por ejemplo 18000 o 12500.50.",
    "Invalid amount format": "Escribe un monto válido, por ejemplo 18000 o 12500.50.",
    "Amount outside allowed range": "El monto debe ser mayor que cero y menor que el máximo permitido.",
    "Expected YYYY-MM": "Usa un mes con formato AAAA-MM.",
    "Unsupported year": "El año está fuera del rango permitido.",
}

_SPANISH_PREFIXES = ("Usa ", "Ingresa ", "Envía ", "La ", "El ")

_FIELD_MESSAGES = {
    "email": "Escribe un correo electrónico válido, por ejemplo nombre@dominio.com.",
}


def spanish_message(error: dict[str, Any]) -> str:
    loc = error.get("loc") or ()
    field = str(loc[-1]) if loc else ""
    kind = error.get("type", "")
    ctx = error.get("ctx") or {}

    if kind == "missing":
        return "Este campo es obligatorio."
    if field in _FIELD_MESSAGES:
        return _FIELD_MESSAGES[field]
    if kind == "value_error":
        raw = str(error.get("msg", "")).removeprefix("Value error, ")
        if raw in _KNOWN_VALUE_ERRORS:
            return _KNOWN_VALUE_ERRORS[raw]
        if raw and (not raw.isascii() or raw.startswith(_SPANISH_PREFIXES)):
            return raw  # Already Spanish copy from our own validators.
        return "Revisa este valor."
    if kind in {"string_too_short", "string_too_long"}:
        low, high = ctx.get("min_length"), ctx.get("max_length")
        if kind == "string_too_short" and low is not None:
            return f"Debe tener al menos {low} caracteres."
        if high is not None:
            return f"Debe tener como máximo {high} caracteres."
    if kind in {"string_type", "uuid_parsing", "uuid_type"}:
        return "El formato no es válido."
    if kind in {"enum", "literal_error"}:
        return "Elige una de las opciones disponibles."
    if kind in {"date_from_datetime_parsing", "date_parsing", "date_type"}:
        return "Usa una fecha con formato AAAA-MM-DD."
    if kind == "extra_forbidden":
        return "Este campo no se admite."
    return "Revisa este valor."
