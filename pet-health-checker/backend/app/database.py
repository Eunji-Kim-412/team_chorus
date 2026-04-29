import sqlite3
from app.config import DB_PATH

def get_db_conn():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS pets (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL DEFAULT 1,
            name TEXT NOT NULL,
            species TEXT NOT NULL,
            breed TEXT NOT NULL,
            age_years INTEGER NOT NULL DEFAULT 0,
            age_months INTEGER NOT NULL DEFAULT 0,
            gender TEXT NOT NULL,
            neutered INTEGER NOT NULL DEFAULT 0,
            weight_kg REAL NOT NULL DEFAULT 0,
            medical_history TEXT,
            medications TEXT,
            food_type TEXT,
            preferred_food_brand TEXT,
            favorite_foods TEXT,
            allergies TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS daily_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pet_id TEXT NOT NULL,
            date TEXT NOT NULL,
            yesterday_food TEXT,
            stool_type TEXT,
            activity_level TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pet_id) REFERENCES pets(id)
        );
        CREATE TABLE IF NOT EXISTS consultations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            pet_type TEXT NOT NULL,
            symptoms TEXT NOT NULL,
            pet_id TEXT,
            pet_context_json TEXT,
            result_claude TEXT,
            result_gpt TEXT,
            result_gemini TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    """)
    _ensure_column(conn, "consultations", "pet_id", "TEXT")
    _ensure_column(conn, "consultations", "pet_context_json", "TEXT")
    conn.close()

def _ensure_column(conn: sqlite3.Connection, table_name: str, column_name: str, column_type: str):
    rows = conn.execute(f"PRAGMA table_info({table_name})").fetchall()
    existing = {row[1] for row in rows}
    if column_name not in existing:
        conn.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")
        conn.commit()
