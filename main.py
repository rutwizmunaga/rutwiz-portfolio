from dotenv import load_dotenv
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
load_dotenv(BASE / ".env")

OWNER_EMAIL = "rutwizmunaga@gmail.com"

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

app = FastAPI(title="Rutwiz Portfolio API")


class Contact(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: str = Field(max_length=120)
    message: str = Field(min_length=10, max_length=1000)

    @field_validator("email", mode="before")
    @classmethod
    def valid_email(cls, value):
        if not isinstance(value, str):
            raise ValueError("Enter a valid email address")

        value = value.strip()

        if not EMAIL_RE.fullmatch(value):
            raise ValueError("Enter a valid email address")

        return value

    @field_validator("name", "message", mode="before")
    @classmethod
    def clean_text(cls, value):
        if isinstance(value, str):
            return value.strip()
        return value


# Basic in-memory rate limiter
_hits = defaultdict(list)


@app.post("/api/contact")
def contact(c: Contact, request: Request):

    # Identify visitor IP
    forwarded = request.headers.get("x-forwarded-for", "")
    real_ip = request.headers.get("x-real-ip", "")

    if forwarded:
        ip = forwarded.split(",")[0].strip()
    elif real_ip:
        ip = real_ip.strip()
    else:
        ip = request.client.host if request.client else "unknown"

    now = time.time()

    # Remove successful submissions older than one hour
    _hits[ip] = [
        t for t in _hits[ip]
        if now - t < 3600
    ]

    # Maximum five successful messages per hour
    if len(_hits[ip]) >= 5:
        raise HTTPException(
            status_code=429,
            detail="Too many messages. Please try again later."
        )

    # Gmail SMTP settings
    user = os.getenv("SMTP_USER", "").strip()
    password = os.getenv("SMTP_PASS", "").replace(" ", "")
    host = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()

    if not user or not password:
        raise HTTPException(
            status_code=503,
            detail="Email service is not configured."
        )

    # Prepare email
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

    # Send email
    try:
        with smtplib.SMTP_SSL(host, 465, timeout=15) as server:
            server.login(user, password)
            server.send_message(msg)

        _hits[ip].append(now)

        return {
            "ok": True,
            "detail": "Thanks! Your message has been sent successfully."
        }

    except Exception as exc:
        print(f"SMTP error: {type(exc).__name__}")

        raise HTTPException(
            status_code=502,
            detail="Unable to send your message. Please try again later."
        )


@app.post("/api/visit")
def visit():
    return {
        "visits": None,
        "detail": "Visitor counter disabled."
    }


app.mount(
    "/",
    StaticFiles(directory=BASE / "static", html=True),
    name="static"
)
