"""Transactional e-mail for password recovery.

FINZA_MAIL_MODE selects the transport:
    smtp  send through FINZA_SMTP_HOST / FINZA_SMTP_PORT (587) / FINZA_SMTP_USER /
          FINZA_SMTP_PASSWORD / FINZA_MAIL_FROM, with STARTTLS unless FINZA_SMTP_STARTTLS=false
    log   development only: write the message (including the link) to the API log
    (unset) disabled: nothing is sent; requests still answer the same way
"""

import logging
import os
import smtplib
from email.message import EmailMessage

logger = logging.getLogger("finza.mail")


def mail_mode() -> str:
    return os.getenv("FINZA_MAIL_MODE", "").strip().lower()


def send(to: str, subject: str, text: str) -> None:
    mode = mail_mode()
    if mode == "log":
        logger.warning("DEV MAIL to=%s subject=%s\n%s", to, subject, text)
        return
    if mode != "smtp":
        logger.info("Mail disabled; skipped message '%s'", subject)
        return
    message = EmailMessage()
    message["From"] = os.environ["FINZA_MAIL_FROM"]
    message["To"] = to
    message["Subject"] = subject
    message.set_content(text)
    host = os.environ["FINZA_SMTP_HOST"]
    port = int(os.getenv("FINZA_SMTP_PORT", "587"))
    with smtplib.SMTP(host, port, timeout=10) as client:
        if os.getenv("FINZA_SMTP_STARTTLS", "true").lower() != "false":
            client.starttls()
        user = os.getenv("FINZA_SMTP_USER")
        if user:
            client.login(user, os.environ["FINZA_SMTP_PASSWORD"])
        client.send_message(message)
