
import os
import re
import smtplib
import time

from collections import defaultdict
from email.message import EmailMessage
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator

BASE = Path(__file__).parent
OWNER_EMAIL = "rutwizmunaga@gmail.com"

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

app = FastAPI(title="Rutwiz Portfolio API")


class Contact(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: str = Field(max_length=120)
    message: str = Field(min_length=10, max_length=1000)

    @field_validator("email")
    @classmethod
    def valid_email(cls, value):
        if not EMAIL_RE.match(value):
            raise ValueError("Enter a valid email address")
        return value


_hits = defaultdict(list)


@app.post("/api/contact")
def contact(c: Contact, request: Request):
    ip = request.client.host if request.client else "unknown"

    now = time.time()
    _hits[ip] = [t for t in _hits[ip] if now - t < 3600]

    if len(_hits[ip]) >= 5:
        raise HTTPException(
            status_code=429,
            detail="Too many messages. Please try again later."
        )

    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASS")
    host = os.getenv("SMTP_HOST", "smtp.gmail.com")

    if not user or not password:
        raise HTTPException(
            status_code=503,
            detail="Email service is not configured."
        )

    msg = EmailMessage()
    msg["Subject"] = f"Portfolio message from {c.name}"
    msg["From"] = user
    msg["To"] = OWNER_EMAIL
    msg["Reply-To"] = c.email
    msg.set_content(
        f"Name: {c.name}\n"
        f"Email: {c.email}\n\n"
        f"Message:\n{c.message}"
    )

    try:
        with smtplib.SMTP_SSL(host, 465, timeout=15) as server:
            server.login(user, password)
            server.send_message(msg)

        _hits[ip].append(now)

        return {
            "ok": True,
            "detail": "Thanks! Your message has been sent successfully."
        }

    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Unable to send your message. Please try again later."
        )


@app.post("/api/visit")
def visit():
    return {"visits": None, "detail": "Visitor counter disabled."}


app.mount(
    "/",
    StaticFiles(directory=BASE / "static", html=True),
    name="static"
)
