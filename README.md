# Reddy Rutwiz Kumar Munaga – Portfolio (FastAPI + HTML)

## Run in VS Code
1. Unzip, then File > Open Folder > `portfolio`.
2. Terminal > New Terminal, then:
   ```
   python -m venv .venv
   .venv\Scripts\activate          # Windows   (Mac/Linux: source .venv/bin/activate)
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```
3. Open http://127.0.0.1:8000  (API docs: http://127.0.0.1:8000/docs)

## Backend features (Python)
- Contact form -> saved in SQLite (`portfolio.db`), validated, rate-limited
- Visitor counter
- Read messages: `GET /api/messages` with header `X-API-Key: <ADMIN_API_KEY>`
  (set `ADMIN_API_KEY` env variable; default is `change-me`)
- Optional email alert: set `SMTP_USER` and `SMTP_PASS` (Gmail app password)

## Deploy free (Render)
Push this folder to GitHub > Render > New Web Service > pick repo.
`render.yaml` already has the build/start commands. Vercel/Netlify/GitHub Pages
host only static files, so the Python backend needs Render (or similar).

## Edit your content
All text and links are in `static/index.html`. Search for `TODO` to replace
placeholder links (SQL project, Fake Job Detection, HTML form).

## Certificate
Put your PDF at `static/assets/certificates/cyber-awareness-certificate.pdf`.
Optional preview: a screenshot of it as `cyber-awareness-certificate.png` in the same folder
(without it the card shows a styled placeholder).
