from __future__ import annotations

import hashlib
import io
import json
import os
import sqlite3
import statistics
import urllib.error
import urllib.request
from datetime import date
from pathlib import Path
from typing import Optional

import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, StreamingResponse
from PIL import Image
from pydantic import BaseModel, EmailStr
import qrcode
import uvicorn

try:
    from tensorflow.keras.models import load_model
except Exception:
    load_model = None

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "vitalis.sqlite3"
ENV_PATH = BASE_DIR.parent / ".env"
SKIN_MODEL_PATH = BASE_DIR / "skin_analysis_model.h5"
SKIN_LABELS = [
    "clear_skin",
    "oily_skin",
    "wrinkle",
    "dark_circles",
    "chubby",
    "double_chin",
    "sharp_jawline",
    "attractive",
]
POSITIVE_SKIN_LABELS = {"clear_skin", "sharp_jawline", "attractive"}
SKIN_WEIGHTS = {
    "clear_skin": 1.5,
    "attractive": 1.0,
    "sharp_jawline": 1.0,
    "dark_circles": 1.2,
    "oily_skin": 1.0,
    "wrinkle": 1.2,
    "double_chin": 1.0,
    "chubby": 1.0,
}
_skin_model = None

app = FastAPI(title="Vitalis AI API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_groq_api_key() -> str:
    if ENV_PATH.exists():
        for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
            if line.startswith("GROQ_API_KEY="):
                api_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                if api_key:
                    return api_key
    return os.environ.get("GROQ_API_KEY", "").strip().strip('"').strip("'")


def init_db() -> None:
    with connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT,
                age INTEGER,
                country TEXT,
                state TEXT,
                gender TEXT,
                avatar TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                kind TEXT NOT NULL,
                score INTEGER NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            );
            CREATE TABLE IF NOT EXISTS saved_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                kind TEXT NOT NULL,
                score INTEGER NOT NULL,
                title TEXT NOT NULL,
                payload TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            );
            """
        )


def get_skin_model():
    global _skin_model
    if _skin_model is not None:
        return _skin_model
    if load_model is None or not SKIN_MODEL_PATH.exists():
        return None
    _skin_model = load_model(str(SKIN_MODEL_PATH))
    return _skin_model


def skin_status(label: str, percentage: int) -> str:
    if label in POSITIVE_SKIN_LABELS:
        if percentage < 40:
            return "Needs Attention"
        if percentage < 70:
            return "Average"
        return "Good"
    if percentage < 30:
        return "Good"
    if percentage <= 60:
        return "Average"
    return "Needs Attention"


def skin_score(predictions: dict[str, float]) -> int:
    total_score = 0.0
    total_weight = 0.0
    for label, value in predictions.items():
        original = round(value * 100)
        normalized = original if label in POSITIVE_SKIN_LABELS else 100 - original
        weight = SKIN_WEIGHTS.get(label, 1.0)
        total_score += normalized * weight
        total_weight += weight
    return int(max(30, min(98, round(total_score / total_weight)))) if total_weight else 0


def fallback_skin_predictions(content: bytes) -> dict[str, float]:
    signal = sum(content[:8000]) if content else 3600
    length_signal = len(content) or 1
    values = {
        "clear_skin": 0.54 + ((signal % 31) / 100),
        "oily_skin": 0.20 + ((signal % 39) / 100),
        "wrinkle": 0.12 + ((length_signal % 28) / 100),
        "dark_circles": 0.18 + ((signal % 34) / 100),
        "chubby": 0.20 + ((length_signal % 30) / 100),
        "double_chin": 0.12 + ((signal % 27) / 100),
        "sharp_jawline": 0.42 + ((length_signal % 34) / 100),
        "attractive": 0.48 + ((signal % 38) / 100),
    }
    return {label: round(max(0.02, min(0.96, value)), 4) for label, value in values.items()}


def predict_skin(content: bytes) -> tuple[dict[str, float], str]:
    model = get_skin_model()
    if model is None:
        return fallback_skin_predictions(content), "fallback"
    image = Image.open(io.BytesIO(content)).convert("RGB").resize((224, 224))
    processed = np.expand_dims(np.asarray(image, dtype=np.float32) / 255.0, axis=0)
    output = model.predict(processed, verbose=0)[0]
    return {label: float(score) for label, score in zip(SKIN_LABELS, output)}, "cnn"


def skin_recommendation_groups(metrics: list[dict]) -> dict:
    needs = [item for item in metrics if item["status"] == "Needs Attention"]
    average = [item for item in metrics if item["status"] == "Average"]
    top_labels = needs[:3] or average[:3] or metrics[:3]
    routines = [
        "AM: gentle cleanser, antioxidant serum, barrier moisturizer, and broad-spectrum SPF 50.",
        "PM: cleanse, hydrate with hyaluronic acid or niacinamide, then seal with a ceramide moisturizer.",
    ]
    habits = [
        "Sleep 7-8 hours, hydrate consistently, and reduce late-night screen exposure when under-eye tone is flagged.",
        "Avoid over-cleansing and keep exfoliation to 1-2 nights weekly so the skin barrier can recover.",
    ]
    nutrition = [
        "Add vitamin C foods, colorful vegetables, protein, nuts, and seeds to support collagen and repair.",
        "Limit excess sugar, fried foods, and high-salt snacks when oiliness or facial puffiness is elevated.",
    ]
    if top_labels:
        routines.append(f"Priority focus: {', '.join(item['label'] for item in top_labels)}.")
    return {"Routine": routines, "Lifestyle": habits, "Diet & Nutrients": nutrition}


def hash_password(password: str) -> str:
    salt = "vitalis-ai-local-salt"
    return hashlib.sha256(f"{salt}:{password}".encode()).hexdigest()


def row_to_user(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "email": row["email"],
        "fullName": row["full_name"] or "",
        "age": row["age"],
        "country": row["country"] or "",
        "state": row["state"] or "",
        "gender": row["gender"] or "",
        "avatar": row["avatar"] or "",
        "profileComplete": bool(row["full_name"] and row["age"] and row["country"] and row["gender"]),
    }


class AuthPayload(BaseModel):
    email: EmailStr
    password: str


class ProfilePayload(BaseModel):
    userId: int
    fullName: str
    email: EmailStr
    age: int
    country: str
    state: str
    gender: str
    avatar: Optional[str] = ""


class VitalsPayload(BaseModel):
    userId: Optional[int] = None
    height: float
    weight: float
    age: int
    gender: str


class SaveReportPayload(BaseModel):
    userId: int
    kind: str
    score: int
    title: str
    payload: dict


class SupportChatPayload(BaseModel):
    userId: Optional[int] = None
    domain: str
    message: str
    history: list[dict] = []


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/health")
def health() -> dict:
    return {"ok": True, "database": str(DB_PATH)}


@app.post("/auth/signin")
def signin(payload: AuthPayload) -> dict:
    if len(payload.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters.")

    with connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (payload.email.lower(),)).fetchone()
        if row:
            if row["password_hash"] != hash_password(payload.password):
                raise HTTPException(status_code=401, detail="Invalid password for this email.")
            return {"existing": True, "user": row_to_user(row)}

        cursor = conn.execute(
            "INSERT INTO users (email, password_hash) VALUES (?, ?)",
            (payload.email.lower(), hash_password(payload.password)),
        )
        row = conn.execute("SELECT * FROM users WHERE id = ?", (cursor.lastrowid,)).fetchone()
        return {"existing": False, "user": row_to_user(row)}


@app.post("/auth/signup")
def signup(payload: AuthPayload) -> dict:
    if len(payload.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters.")

    with connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (payload.email.lower(),)).fetchone()
        if row:
            if row["password_hash"] != hash_password(payload.password):
                raise HTTPException(status_code=409, detail="This email already exists. Please sign in with the correct password.")
            return {"existing": True, "user": row_to_user(row)}

        cursor = conn.execute(
            "INSERT INTO users (email, password_hash) VALUES (?, ?)",
            (payload.email.lower(), hash_password(payload.password)),
        )
        row = conn.execute("SELECT * FROM users WHERE id = ?", (cursor.lastrowid,)).fetchone()
        return {"existing": False, "user": row_to_user(row)}


@app.post("/profile")
def save_profile(payload: ProfilePayload) -> dict:
    with connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (payload.userId,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found.")
        conn.execute(
            """
            UPDATE users
               SET full_name = ?, email = ?, age = ?, country = ?, state = ?, gender = ?, avatar = ?
             WHERE id = ?
            """,
            (
                payload.fullName.strip(),
                payload.email.lower(),
                payload.age,
                payload.country,
                payload.state,
                payload.gender,
                payload.avatar or "",
                payload.userId,
            ),
        )
        updated = conn.execute("SELECT * FROM users WHERE id = ?", (payload.userId,)).fetchone()
        return {"user": row_to_user(updated)}


def record_activity(user_id: Optional[int], kind: str, score: int) -> None:
    if not user_id:
        return
    with connect() as conn:
        conn.execute("INSERT INTO activities (user_id, kind, score) VALUES (?, ?, ?)", (user_id, kind, score))


def metric_sensitive_food_recommendations(goal: str, calories: int, protein: int, carbs: int, fats: int, sugar: int, sodium: int, is_sweet: bool) -> dict:
    balance = []
    safety = []
    goal_tips = []
    balance.append("Protein is strong, so keep this meal around training or your longest active window." if protein >= 25 else "Protein is light; add lentils, eggs, paneer, tofu, fish, or lean meat to improve satiety.")
    balance.append("Carbohydrates are high; add more vegetables and reduce refined starch in the next meal." if carbs > 60 else "Carbs are moderate; pair them with fiber to keep energy stable.")
    safety.append("Sugar is elevated; avoid sweet drinks or desserts for the rest of the day." if sugar > 25 else "Sugar is controlled, which supports steadier energy and better appetite control.")
    safety.append("Sodium is high; hydrate well and choose lower-salt foods at your next meal." if sodium > 650 else "Sodium is within a workable range; keep sauces and packaged sides modest.")
    if is_sweet:
        safety.append("This looks processed or dessert-like; check labels for refined oils, preservatives, and hidden allergens.")
    if "weight" in goal:
        goal_tips.append(f"At about {calories} calories, keep portions measured and add a high-volume salad if still hungry.")
    elif "fitness" in goal:
        goal_tips.append("For fitness, time this with activity and keep protein distributed across the day.")
    else:
        goal_tips.append("For general health, repeat this style when the plate has protein, fiber, and unsaturated fats.")
    goal_tips.append("Fat is on the higher side; keep the next meal lighter in oils and fried foods." if fats > 22 else "Fat is moderate; include nuts, seeds, or olive oil only if calories allow.")
    return {"Nutrition Balance": balance, "Safety & Allergens": safety, "Goal-Based Tips": goal_tips}


def metric_sensitive_vitals_recommendations(bmi: float, body_fat: float, visceral: float, muscle: float, bmr: float, ideal_weight: float, weight: float) -> dict:
    diet = []
    exercise = []
    recovery = []
    if bmi >= 25 or body_fat >= 24:
        diet.append("Create a small calorie deficit using high-protein meals, vegetables, and slower carbohydrates.")
    elif bmi < 18.5:
        diet.append("Use a controlled calorie surplus with protein at each meal to support healthy weight gain.")
    else:
        diet.append("Maintain balanced portions and use your BMR as a baseline for stable energy intake.")
    diet.append("Reduce alcohol, sugary drinks, and late-night high-calorie snacks to target visceral fat." if visceral >= 12 else "Visceral fat is manageable; keep fiber, hydration, and meal timing consistent.")
    exercise.append("Prioritize progressive strength training 3-4 days weekly to raise skeletal muscle." if muscle < 35 else "Maintain muscle with compound lifts and add gradual overload every 1-2 weeks.")
    exercise.append("Add 150-210 minutes of zone-2 cardio weekly plus an 8k-10k daily step target." if bmi >= 25 else "Blend strength work with mobility and light cardio so recovery keeps pace with training.")
    recovery.append("Track weekly averages instead of daily swings; aim for slow progress toward the ideal weight range." if abs(weight - ideal_weight) > 6 else "You are close to the ideal weight range; focus on consistency, sleep, and performance quality.")
    recovery.append("Protect sleep and stress control because both strongly affect abdominal fat and hunger signals." if visceral >= 12 or body_fat >= 24 else "Keep 7-9 hours of sleep, hydration, and one lighter recovery day each week.")
    return {"Balanced Diet": diet, "Exercise": exercise, "Recovery & Lifestyle": recovery}


def build_weekly_from_reports(reports: list[sqlite3.Row], avg_score: int) -> list[dict]:
    fallback = [
        {"day": "Mon", "skin": 74, "food": 68, "vitals": 80},
        {"day": "Tue", "skin": 77, "food": 71, "vitals": 82},
        {"day": "Wed", "skin": 81, "food": 73, "vitals": 79},
        {"day": "Thu", "skin": 84, "food": 76, "vitals": 85},
        {"day": "Fri", "skin": 86, "food": 80, "vitals": 88},
        {"day": "Sat", "skin": 88, "food": 83, "vitals": 90},
        {"day": "Sun", "skin": avg_score, "food": min(96, avg_score + 3), "vitals": max(50, avg_score - 2)},
    ]
    if not reports:
        return fallback
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    buckets = {day: {"skin": [], "food": [], "vitals": []} for day in day_names}
    for row in reports:
        try:
            day_index = int(date.fromisoformat(row["created_at"][:10]).strftime("%w"))
        except ValueError:
            day_index = 0
        day = day_names[(day_index - 1) % 7]
        buckets[day][row["kind"]].append(row["score"])
    weekly = []
    for index, day in enumerate(day_names):
        base = fallback[index]
        weekly.append({
            "day": day,
            "skin": round(statistics.mean(buckets[day]["skin"])) if buckets[day]["skin"] else base["skin"],
            "food": round(statistics.mean(buckets[day]["food"])) if buckets[day]["food"] else base["food"],
            "vitals": round(statistics.mean(buckets[day]["vitals"])) if buckets[day]["vitals"] else base["vitals"],
        })
    return weekly


def report_payload(row: sqlite3.Row) -> dict:
    try:
        payload = json.loads(row["payload"])
    except (TypeError, json.JSONDecodeError):
        payload = {}
    return {
        "kind": row["kind"],
        "score": row["score"],
        "title": row["title"],
        "payload": payload,
        "createdAt": row["created_at"],
    }


def summarize_report_metrics(kind: str, payload: dict) -> str:
    if kind == "skin":
        metrics = payload.get("metrics", [])
        if isinstance(metrics, list):
            flagged = [f"{item.get('label') or item.get('name')}: {item.get('percentage', item.get('value'))}% {item.get('status', '')}".strip() for item in metrics[:4]]
            return "; ".join(flagged)
    if kind == "food":
        nutrition = payload.get("nutrition", {})
        if isinstance(nutrition, dict):
            return ", ".join(f"{key}: {value}" for key, value in nutrition.items())
    if kind == "vitals":
        metrics = payload.get("metrics", {})
        if isinstance(metrics, dict):
            return ", ".join(f"{key}: {value}" for key, value in list(metrics.items())[:6])
    return ""


def average_score(items: list[dict], kind: str | None = None) -> int:
    scores = [item["score"] for item in items if kind is None or item["kind"] == kind]
    return round(statistics.mean(scores)) if scores else 0


def percent_change(current: int, previous: int) -> int:
    if not previous:
        return 0 if not current else 100
    return round(((current - previous) / previous) * 100)


def build_dashboard_payload(user: sqlite3.Row, activity_rows: list[sqlite3.Row], report_rows: list[sqlite3.Row]) -> dict:
    reports = [report_payload(row) for row in report_rows]
    report_scores = [report["score"] for report in reports]
    activity_scores = [row["score"] for row in activity_rows]
    scores = report_scores or activity_scores or [78, 82, 76, 88, 84, 91, 87]
    avg_score = round(statistics.mean(scores))
    weekly = build_weekly_from_reports(report_rows, avg_score)

    recent_reports = reports[:7]
    previous_reports = reports[7:14]
    comparison = []
    for index, item in enumerate(weekly):
        comparison.append({
            **item,
            "previousSkin": max(35, min(100, item["skin"] - percent_change(average_score(recent_reports, "skin"), average_score(previous_reports, "skin")) // 2 - (index % 2))),
            "previousFood": max(35, min(100, item["food"] - percent_change(average_score(recent_reports, "food"), average_score(previous_reports, "food")) // 2 + (index % 3))),
            "previousVitals": max(35, min(100, item["vitals"] - percent_change(average_score(recent_reports, "vitals"), average_score(previous_reports, "vitals")) // 2 - (index % 2))),
        })

    category_labels = {"skin": "Skin Analysis", "food": "Nutrition Analysis", "vitals": "Body Vitals"}
    category_colors = {"skin": "#7cfff3", "food": "#c6ff72", "vitals": "#ff9ecf"}
    category_momentum = []
    for kind, label in category_labels.items():
        current = average_score(recent_reports, kind) or average_score(reports, kind)
        previous = average_score(previous_reports, kind)
        count = len([report for report in reports if report["kind"] == kind])
        latest = next((report for report in reports if report["kind"] == kind), None)
        category_momentum.append({
            "kind": kind,
            "name": label,
            "score": current,
            "change": percent_change(current, previous) if previous else 0,
            "count": count,
            "latestTitle": latest["title"] if latest else "No saved report yet",
            "latestAt": latest["createdAt"] if latest else None,
            "color": category_colors[kind],
        })

    calories = 1840 + avg_score * 7
    latest_food = next((report for report in reports if report["kind"] == "food"), None)
    if latest_food:
        nutrition = latest_food["payload"].get("nutrition", {})
        calories = int(nutrition.get("calories", calories)) if isinstance(nutrition, dict) else calories

    insights = []
    for item in category_momentum:
        direction = "up" if item["change"] >= 0 else "down"
        insights.append(f"{item['name']} has {item['count']} saved reports, latest score {item['score'] or 'N/A'}, and momentum is {direction} {abs(item['change'])}%.")

    chatbot_context = {
        "user": row_to_user(user),
        "stats": {
            "activityScore": avg_score,
            "streak": min(30, len(reports) + 4),
            "calories": calories,
            "goal": min(100, avg_score + 6),
            "savedReports": len(reports),
            "activityTrend": percent_change(average_score(recent_reports), average_score(previous_reports)),
            "streakTrend": min(7, len(recent_reports)),
        },
        "categoryMomentum": category_momentum,
        "weekly": weekly,
        "latestReports": [
            {
                "kind": report["kind"],
                "score": report["score"],
                "title": report["title"],
                "createdAt": report["createdAt"],
                "metrics": summarize_report_metrics(report["kind"], report["payload"]),
            }
            for report in reports[:8]
        ],
        "insights": insights,
    }

    return {
        "user": row_to_user(user),
        "stats": chatbot_context["stats"],
        "weekly": weekly,
        "comparison": comparison,
        "categoryMomentum": category_momentum,
        "savedReports": [
            {"kind": report["kind"], "score": report["score"], "title": report["title"], "createdAt": report["createdAt"], "payload": report["payload"]}
            for report in reports
        ],
        "latestReports": chatbot_context["latestReports"],
        "insights": insights,
        "badges": ["Hydration Focus", "Skin Streak", "Balanced Plate", "Vitals Climber"],
        "chatbotContext": chatbot_context,
    }


def dashboard_for_user(user_id: int) -> dict | None:
    with connect() as conn:
        user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user:
            return None
        rows = conn.execute("SELECT kind, score, created_at FROM activities WHERE user_id = ? ORDER BY id DESC LIMIT 60", (user_id,)).fetchall()
        reports = conn.execute("SELECT kind, score, title, payload, created_at FROM saved_reports WHERE user_id = ? ORDER BY id DESC LIMIT 80", (user_id,)).fetchall()
    return build_dashboard_payload(user, rows, reports)


def groq_recommendations(system_prompt: str, user_prompt: str, fallback: list[str]) -> list[str]:
    api_key = get_groq_api_key()
    if not api_key:
        return fallback

    payload = {
        "model": os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant"),
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.35,
        "max_tokens": 260,
    }
    request = urllib.request.Request(
        "https://api.groq.com/openai/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "VitalisAI/1.0",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=18) as response:
            data = json.loads(response.read().decode("utf-8"))
        content = data["choices"][0]["message"]["content"]
    except (urllib.error.URLError, KeyError, IndexError, json.JSONDecodeError, TimeoutError):
        return fallback

    lines = [line.strip(" -•\t") for line in content.splitlines() if line.strip()]
    cleaned = [line for line in lines if len(line) > 12]
    return cleaned[:5] or fallback


def groq_json_recommendations(system_prompt: str, user_prompt: str, fallback: dict) -> dict:
    api_key = get_groq_api_key()
    if not api_key:
        return fallback

    payload = {
        "model": os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant"),
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.35,
        "max_tokens": 520,
        "response_format": {"type": "json_object"},
    }
    request = urllib.request.Request(
        "https://api.groq.com/openai/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "VitalisAI/1.0",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=18) as response:
            data = json.loads(response.read().decode("utf-8"))
        parsed = json.loads(data["choices"][0]["message"]["content"])
    except (urllib.error.URLError, KeyError, IndexError, json.JSONDecodeError, TimeoutError):
        return fallback

    if not isinstance(parsed, dict):
        return fallback
    normalized = {}
    for key, fallback_items in fallback.items():
        items = parsed.get(key, fallback_items)
        if isinstance(items, str):
            items = [items]
        if not isinstance(items, list):
            items = fallback_items
        normalized[key] = [str(item).strip() for item in items if str(item).strip()][:4] or fallback_items
    return normalized


def groq_text_reply(system_prompt: str, messages: list[dict], fallback: str) -> tuple[str, str]:
    api_key = get_groq_api_key()
    if not api_key:
        return fallback, "missing_key"
    payload = {
        "model": os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant"),
        "messages": [{"role": "system", "content": system_prompt}, *messages],
        "temperature": 0.45,
        "max_tokens": 280,
    }
    request = urllib.request.Request(
        "https://api.groq.com/openai/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "VitalisAI/1.0",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=40) as response:
            data = json.loads(response.read().decode("utf-8"))
        reply = data["choices"][0]["message"]["content"].strip()
        return (reply or fallback), ("groq" if reply else "empty_groq_reply")
    except urllib.error.HTTPError as error:
        return fallback, f"groq_http_{error.code}"
    except urllib.error.URLError:
        return fallback, "groq_network_error"
    except TimeoutError:
        return fallback, "groq_timeout"
    except (KeyError, IndexError, json.JSONDecodeError):
        return fallback, "groq_parse_error"


def should_include_dashboard_context(domain: str, message: str) -> bool:
    if domain == "dashboard":
        return True
    lowered = message.lower()
    keywords = [
        "my dashboard", "my report", "my reports", "my score", "my scores", "my progress",
        "saved report", "saved reports", "trend", "trends", "momentum", "streak",
        "activity score", "category", "weekly", "dashboard",
    ]
    return any(keyword in lowered for keyword in keywords)


@app.post("/analysis/skin")
async def skin_analysis(userId: Optional[int] = Form(None), image: UploadFile = File(...)) -> dict:
    content = await image.read()
    if not content:
        raise HTTPException(status_code=400, detail="Please upload a skin image.")
    try:
        predictions, model_source = predict_skin(content)
    except Exception:
        predictions, model_source = fallback_skin_predictions(content), "fallback"
    score = skin_score(predictions)
    metrics = []
    for label, value in predictions.items():
        percentage = round(value * 100)
        display_label = label.replace("_", " ").title()
        metrics.append({
            "name": display_label,
            "label": display_label,
            "key": label,
            "value": percentage,
            "percentage": percentage,
            "status": skin_status(label, percentage),
            "positive": label in POSITIVE_SKIN_LABELS,
        })
    needs_attention = [item["label"] for item in metrics if item["status"] == "Needs Attention"]
    averages = [item["label"] for item in metrics if item["status"] == "Average"]
    title = "Excellent skin health" if score >= 85 else "Good skin condition" if score >= 70 else "Moderate skin condition" if score >= 50 else "Skin needs attention"
    observations = [
        f"CNN model source: {'trained skin_analysis_model.h5' if model_source == 'cnn' else 'local fallback because TensorFlow is not installed'}."
    ]
    if needs_attention:
        observations.append(f"Needs attention: {', '.join(needs_attention[:4])}.")
    if averages:
        observations.append(f"Average zones to monitor: {', '.join(averages[:4])}.")
    if not needs_attention:
        observations.append("No severe visual pattern was flagged by the submitted image.")
    recommendation_groups = skin_recommendation_groups(metrics)
    record_activity(userId, "skin", score)
    return {
        "score": score,
        "title": title,
        "modelSource": model_source,
        "predictions": predictions,
        "observations": observations,
        "metrics": metrics,
        "recommendations": recommendation_groups,
        "ingredients": ["Vitamin C", "Niacinamide", "Hyaluronic acid", "Ceramides", "Low-dose retinol"],
    }


@app.post("/analysis/food")
async def food_analysis(
    userId: Optional[int] = Form(None),
    goal: str = Form("general health"),
    image: Optional[UploadFile] = File(None),
    description: str = Form(""),
) -> dict:
    name_source = (description or (image.filename if image else "") or "mixed meal").lower()
    is_sweet = any(word in name_source for word in ["cake", "cookie", "soda", "sweet", "dessert"])
    is_fresh = any(word in name_source for word in ["salad", "fruit", "grain", "bowl", "vegetable"])
    calories = 520 if is_sweet else 380 if is_fresh else 460
    protein = 12 if is_sweet else 24 if is_fresh else 18
    carbs = 72 if is_sweet else 48 if is_fresh else 55
    fats = 24 if is_sweet else 12 if is_fresh else 18
    sugar = 42 if is_sweet else 13 if is_fresh else 19
    sodium = 310 if is_sweet else 420 if is_fresh else 710
    score = max(35, min(95, 88 - sugar // 2 - sodium // 100 + protein // 3 + (8 if is_fresh else 0)))
    fallback_recommendations = metric_sensitive_food_recommendations(goal, calories, protein, carbs, fats, sugar, sodium, is_sweet)
    recommendations = groq_json_recommendations(
        (
            "You are a concise nutrition coach. Return JSON only with exactly these keys: "
            "Nutrition Balance, Safety & Allergens, Goal-Based Tips. Each value must be an array of 2-3 practical suggestions."
        ),
        (
            f"Food: {name_source}. Goal: {goal}. Estimated nutrition: calories {calories}, protein {protein}g, "
            f"carbs {carbs}g, fats {fats}g, sugar {sugar}g, sodium {sodium}mg. Health score {score}/100. "
            "Analyze the output food metrics and recommend based on macro balance, sugar/sodium level, possible harmful ingredients, allergens, and the user's goal."
        ),
        fallback_recommendations,
    )
    record_activity(userId, "food", score)
    return {
        "score": score,
        "identifiedFood": "Fresh balanced bowl" if is_fresh else "Sweet processed snack" if is_sweet else "Mixed plated meal",
        "nutrition": {
            "calories": calories,
            "protein": protein,
            "carbohydrates": carbs,
            "fats": fats,
            "sugar": sugar,
            "sodium": sodium,
        },
        "flags": {
            "harmfulIngredients": ["Excess sugar", "Refined oils"] if is_sweet else ["Moderate sodium"],
            "possibleAllergens": ["Milk", "Gluten"] if is_sweet else ["Soy", "Nuts may be present"],
        },
        "recommendations": recommendations,
    }


@app.post("/analysis/vitals")
def vitals_analysis(payload: VitalsPayload) -> dict:
    height_m = payload.height / 100
    bmi = payload.weight / (height_m * height_m)
    bmr = 10 * payload.weight + 6.25 * payload.height - 5 * payload.age + (5 if payload.gender.lower() == "male" else -161)
    ideal_weight = 22 * height_m * height_m
    body_fat = (1.2 * bmi) + (0.23 * payload.age) - (10.8 if payload.gender.lower() == "male" else 0) - 5.4
    visceral = max(4, min(22, body_fat / 2.2))
    muscle = max(24, min(48, 42 - (bmi - 22) * 0.8))
    body_age = round(payload.age + (bmi - 22) * 1.1 + (visceral - 8) * 0.8)
    score = int(max(40, min(98, 92 - abs(bmi - 22) * 4 - max(0, visceral - 10) * 2)))
    weekly = [max(35, min(100, score - 10 + i * 2 + ((i % 2) * 3))) for i in range(7)]
    fallback_recommendations = metric_sensitive_vitals_recommendations(bmi, body_fat, visceral, muscle, bmr, ideal_weight, payload.weight)
    recommendations = groq_json_recommendations(
        (
            "You are a concise body composition coach. Return JSON only with exactly these keys: "
            "Balanced Diet, Exercise, Recovery & Lifestyle. Each value must be an array of 2-3 practical suggestions."
        ),
        (
            f"User: age {payload.age}, gender {payload.gender}, height {payload.height} cm, weight {payload.weight} kg. "
            f"BMI {bmi:.1f}, BMR {bmr:.0f}, body fat {body_fat:.1f}%, visceral fat {visceral:.1f}%, "
            f"skeletal muscle {muscle:.1f}%, estimated body age {body_age}, ideal weight {ideal_weight:.1f} kg. "
            "Analyze the output body metrics and give category-specific recommendations."
        ),
        fallback_recommendations,
    )
    record_activity(payload.userId, "vitals", score)
    return {
        "score": score,
        "metrics": {
            "BMI": round(bmi, 1),
            "BMR": round(bmr),
            "Body Fat %": round(body_fat, 1),
            "Visceral Fat %": round(visceral, 1),
            "Estimated Body Age": body_age,
            "Trunk Subcutaneous Fat %": round(max(8, body_fat * 0.55), 1),
            "Skeletal Muscle %": round(muscle, 1),
            "Overall Ideal Weight": round(ideal_weight, 1),
        },
        "weeklyProgress": [{"day": day, "score": value} for day, value in zip(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], weekly)],
        "recommendations": recommendations,
    }


@app.post("/reports/save")
def save_report(payload: SaveReportPayload) -> dict:
    if payload.kind not in {"skin", "food", "vitals"}:
        raise HTTPException(status_code=400, detail="Unsupported report kind.")
    with connect() as conn:
        user = conn.execute("SELECT id FROM users WHERE id = ?", (payload.userId,)).fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")
        cursor = conn.execute(
            "INSERT INTO saved_reports (user_id, kind, score, title, payload) VALUES (?, ?, ?, ?, ?)",
            (payload.userId, payload.kind, payload.score, payload.title, json.dumps(payload.payload)),
        )
        conn.execute("INSERT INTO activities (user_id, kind, score) VALUES (?, ?, ?)", (payload.userId, payload.kind, payload.score))
    return {"saved": True, "id": cursor.lastrowid}


@app.get("/redirect/discord")
def redirect_discord() -> RedirectResponse:
    return RedirectResponse("https://discord.gg/5HnSbYQY8", status_code=307)


@app.get("/qr/discord")
def qr_discord() -> StreamingResponse:
    image = qrcode.make("http://127.0.0.1:8000/redirect/discord")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="image/png")


@app.post("/support/chat")
def support_chat(payload: SupportChatPayload) -> dict:
    domain = payload.domain.lower()
    domain_label = {
        "skin": "Skin Analysis",
        "food": "Food Analysis",
        "vitals": "Body Vitals",
        "dashboard": "Dashboard",
        "home": "Vitalis support",
    }.get(domain, "Vitalis support")
    fallback = "Vita AI is temporarily unavailable, but your question was received. Please try again in a moment."

    message_history = []
    for item in payload.history[-6:]:
        role = item.get("role", "user")
        if role not in {"user", "assistant"}:
            continue
        content = str(item.get("content", "")).strip()
        if content:
            message_history.append({"role": role, "content": content})
    if not message_history or message_history[-1]["role"] != "user" or message_history[-1]["content"] != payload.message:
        message_history.append({"role": "user", "content": payload.message})

    include_dashboard_context = should_include_dashboard_context(domain, payload.message)
    dashboard_context = dashboard_for_user(payload.userId) if payload.userId and include_dashboard_context else None
    context_text = ""
    if dashboard_context:
        context_text = json.dumps(dashboard_context["chatbotContext"], ensure_ascii=False)[:6000]

    system_prompt = (
        f"You are Vita AI, a concise and supportive customer support assistant for Vitalis AI. "
        f"You are currently helping in the domain: {domain_label}. The user's latest message is: {payload.message!r}. "
        "Answer that latest message directly, using the conversation only for context. "
        "For general wellness, skincare, food, or body-metric questions, explain the concept clearly. "
    )
    if context_text:
        system_prompt += (
            f"Use this live dashboard context when the user asks about their own progress, saved reports, trends, metrics, category momentum, or recommendations: {context_text}. "
            "Do not invent personal metrics that are not in the context. "
        )
    else:
        system_prompt += "No dashboard context is needed for this question. "
    system_prompt += "Answer in 2-5 short sentences."

    reply, source = groq_text_reply(system_prompt, message_history, fallback)
    if source != "groq":
        retry_reply, retry_source = groq_text_reply(
            (
                f"You are Vita AI for Vitalis AI. Answer the user's latest question directly in 2-5 short sentences. "
                f"Latest question: {payload.message!r}. Do not mention API failures or fallback text."
            ),
            [{"role": "user", "content": payload.message}],
            fallback,
        )
        if retry_source == "groq":
            return {"reply": retry_reply, "source": "groq_retry"}
    return {"reply": reply, "source": source}

    domain = payload.domain.lower()
    domain_label = {
        "skin": "Skin Analysis",
        "food": "Food Analysis",
        "vitals": "Body Vitals",
        "dashboard": "Dashboard",
        "home": "Vitalis support",
    }.get(domain, "Vitalis support")
    fallback = {
        "skin": "For skin analysis, upload clearer face images in even lighting, then compare hydration, pores, and pigmentation trends over time. If you share what confused you in the report, I can break it down step by step.",
        "food": "For food analysis, the fastest wins are usually protein balance, sodium awareness, and matching the meal to your goal. Tell me the food result or your goal, and I can help interpret the score and suggest a smarter next meal.",
        "vitals": "For body vitals, focus on the combination of BMI, body fat, visceral fat, and muscle rather than any one number alone. If you share which metric feels off, I can explain what it means and what to do next.",
    }.get(domain, "Tell me what you need help with in Vitalis and I’ll guide you.")
    fallback = f"I couldn't reach Vita AI right now, but I understood your question about {domain_label.lower()}: {payload.message}"
    message_history = []
    for item in payload.history[-8:]:
        role = item.get("role", "user")
        if role not in {"user", "assistant"}:
            continue
        content = str(item.get("content", "")).strip()
        if content:
            message_history.append({"role": role, "content": content})
    if not message_history or message_history[-1]["role"] != "user":
        message_history.append({"role": "user", "content": payload.message})
    dashboard_context = dashboard_for_user(payload.userId) if payload.userId else None
    context_text = ""
    if dashboard_context:
        context_text = json.dumps(dashboard_context["chatbotContext"], ensure_ascii=False)
    reply, source = groq_text_reply(
        (
            f"You are Vita AI, a concise and supportive customer support assistant for Vitalis AI. "
            f"You are currently helping in the domain: {domain_label}. Answer the user's latest question directly. "
            "For general wellness, skincare, food, or body-metric questions, explain the concept clearly even when dashboard data is not relevant. "
            f"Use this live dashboard context only when the user asks about their own progress, saved reports, trends, metrics, category momentum, or recommendations: {context_text or 'No dashboard context is available.'} "
            "Do not force dashboard context into unrelated educational questions. Answer in 2-5 short sentences and do not invent personal metrics that are not in the context."
        ),
        message_history,
        fallback,
    )
    return {"reply": reply, "source": source}


@app.get("/dashboard/{user_id}")
def dashboard(user_id: int) -> dict:
    payload = dashboard_for_user(user_id)
    if not payload:
        raise HTTPException(status_code=404, detail="User not found.")
    return payload


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run(app, host="127.0.0.1", port=port)
