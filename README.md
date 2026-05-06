# Vitalis AI

A React + FastAPI prototype for AI-style skin analysis, food analysis, body vitals, profile onboarding, and activity tracking.

## Project Structure

- `frontend/` - Vite + React app, deployable to Vercel.
- `backend/` - FastAPI API with SQLite, Groq integration, and the skin `.h5` model, deployable to Render.
- `render.yaml` - Render blueprint for the backend web service.

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

## Deploy Frontend To Vercel

1. Push this repository to GitHub.
2. In Vercel, import the repository.
3. Set the project root directory to `frontend`.
4. Use:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Output directory: `dist`
5. Add this environment variable after the Render backend is deployed:

```text
VITE_API_URL=https://your-render-backend.onrender.com
```

6. Redeploy the Vercel frontend after setting `VITE_API_URL`.

## Deploy Backend To Render

1. In Render, create a new Blueprint from this repo, or create a Web Service manually.
2. If using the blueprint, Render reads `render.yaml`.
3. Manual settings:
   - Root directory: repository root
   - Build command: `pip install -r backend/requirements.txt`
   - Start command: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
   - Health check path: `/health`
4. Add these Render environment variables:

```text
GROQ_API_KEY=your_groq_key
GROQ_MODEL=llama-3.1-8b-instant
HOST=0.0.0.0
PUBLIC_API_URL=https://your-render-backend.onrender.com
FRONTEND_ORIGINS=https://your-vercel-app.vercel.app
```

If you use Vercel preview deployments, add each preview URL to `FRONTEND_ORIGINS` as a comma-separated list.

## Deployment Notes

- Do not commit `.env`; it contains secrets and is ignored.
- Render free instances can sleep, so the first API request may be slow.
- The current SQLite database is local to the backend instance. For production, migrate to PostgreSQL on Render, Railway, or Supabase.
- TensorFlow can make the backend build slower and may require a paid Render instance with enough memory.
