"""Portfolio backend: FastAPI + SQLite.

Features
  POST /api/contact   save a contact-form message (validated, rate-limited)
  POST /api/visit     visitor counter
  GET  /api/messages  read saved messages (needs X-API-Key header = ADMIN_API_KEY)
"""
import os, re, smtplib, sqlite3, time
from collections import defaultdict
from email.message import EmailMessage
from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, Header, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator

BASE = Path(__file__).parent
DB_PATH = os.getenv("DB_PATH", str(BASE / "portfolio.db"))
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "change-me")  # set your own secret
OWNER_EMAIL = "rutwizmunaga@gmail.com"
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

app = FastAPI(title="Rutwiz Portfolio API")


def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


with db() as conn:
    conn.execute("""CREATE TABLE IF NOT EXISTS messages(
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT,
        message TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)""")
    conn.execute("CREATE TABLE IF NOT EXISTS visits(id INTEGER PRIMARY KEY, total INTEGER)")
    conn.execute("INSERT OR IGNORE INTO visits(id,total) VALUES(1,0)")


class Contact(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: str = Field(max_length=120)
    message: str = Field(min_length=10, max_length=1000)

    @field_validator("email")
    @classmethod
    def valid_email(cls, v):
        if not EMAIL_RE.match(v):
            raise ValueError("Enter a valid email address")
        return v


_hits = defaultdict(list)


def notify_owner(c: Contact):
    """Optional email alert. Works only if SMTP_USER and SMTP_PASS are set."""
    user, pwd = os.getenv("SMTP_USER"), os.getenv("SMTP_PASS")
    if not (user and pwd):
        return
    msg = EmailMessage()
    msg["Subject"] = f"Portfolio message from {c.name}"
    msg["From"], msg["To"], msg["Reply-To"] = user, OWNER_EMAIL, c.email
    msg.set_content(c.message)
    try:
        with smtplib.SMTP_SSL(os.getenv("SMTP_HOST", "smtp.gmail.com"), 465) as s:
            s.login(user, pwd)
            s.send_message(msg)
    except Exception as e:
        print("Email notification failed:", e)


@app.post("/api/contact")
def contact(c: Contact, request: Request, tasks: BackgroundTasks):
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    _hits[ip] = [t for t in _hits[ip] if now - t < 3600]
    if len(_hits[ip]) >= 5:
        raise HTTPException(429, "Too many messages. Please try again later.")
    _hits[ip].append(now)
    with db() as conn:
        conn.execute("INSERT INTO messages(name,email,message) VALUES(?,?,?)",
                     (c.name.strip(), c.email.strip(), c.message.strip()))
    tasks.add_task(notify_owner, c)
    return {"ok": True, "detail": "Thanks! Your message has been received."}


@app.post("/api/visit")
def visit():
    with db() as conn:
        conn.execute("UPDATE visits SET total = total + 1 WHERE id = 1")
        return {"visits": conn.execute("SELECT total FROM visits WHERE id = 1").fetchone()["total"]}


@app.get("/api/messages")
def messages(x_api_key: str = Header(default="")):
    if x_api_key != ADMIN_API_KEY:
        raise HTTPException(401, "Invalid API key")
    with db() as conn:
        return [dict(r) for r in conn.execute("SELECT * FROM messages ORDER BY id DESC")]


app.mount("/", StaticFiles(directory=BASE / "static", html=True), name="static")
