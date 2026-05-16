import sqlite3
from datetime import datetime

DB_NAME = "incidents.db"


# ==========================================
# Initialize Database
# ==========================================
def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS incidents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incident_id TEXT UNIQUE,
        title TEXT,
        severity TEXT,
        status TEXT,
        report TEXT,
        created_at TEXT
    )
    """)

    conn.commit()
    conn.close()


# ==========================================
# Save Incident
# ==========================================
def save_incident(
    incident_id,
    title,
    severity,
    status,
    report
):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO incidents (
        incident_id,
        title,
        severity,
        status,
        report,
        created_at
    )
    VALUES (?, ?, ?, ?, ?, ?)
    """, (
        incident_id,
        title,
        severity,
        status,
        report,
        datetime.now().strftime(
            "%Y-%m-%d %H:%M:%S"
        )
    ))

    conn.commit()
    conn.close()


# ==========================================
# Get All Incidents
# ==========================================
def get_all_incidents():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
    SELECT
        incident_id,
        title,
        severity,
        status,
        created_at
    FROM incidents
    ORDER BY id DESC
    """)

    rows = cursor.fetchall()

    conn.close()

    incidents = []

    for row in rows:
        incidents.append({
            "incident_id": row[0],
            "title": row[1],
            "severity": row[2],
            "status": row[3],
            "created_at": row[4]
        })

    return incidents


# ==========================================
# Get Incident By ID
# ==========================================
def get_incident_by_id(
    incident_id
):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
    SELECT
        incident_id,
        title,
        severity,
        status,
        report,
        created_at
    FROM incidents
    WHERE incident_id = ?
    """, (incident_id,))

    row = cursor.fetchone()

    conn.close()

    if not row:
        return None

    return {
        "incident_id": row[0],
        "title": row[1],
        "severity": row[2],
        "status": row[3],
        "report": row[4],
        "created_at": row[5]
    }


# Initialize DB automatically
init_db()