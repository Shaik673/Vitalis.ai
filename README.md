# Vitalis AI

A React + FastAPI prototype for AI-style skin analysis, food analysis, body vitals, profile onboarding, and activity tracking.

## Run Locally

Install frontend packages:

```powershell
npm.cmd --prefix frontend install
```

Install backend packages:

```powershell
C:\Users\shaik\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe -m pip install -r backend\requirements.txt
```

Start the API:

```powershell
C:\Users\shaik\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe backend\app\main.py
```

To enable Groq-powered food and body vitals recommendations, set your key before starting the API:

```powershell
$env:GROQ_API_KEY="paste-your-groq-key-here"
C:\Users\shaik\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe backend\app\main.py
```

Start the web app:

```powershell
npm.cmd --prefix frontend run dev
```

Open `http://127.0.0.1:5173`. The API runs on `http://127.0.0.1:8000` and creates `backend/vitalis.sqlite3` automatically.
