import os
import json
import shutil
import uuid

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from run_agent import run_incident_agent
from database import save_incident, get_all_incidents

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://incident-ai-platform-zna7.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.get("/")
def home():
    return {"message": "Incident Response Agent API Running"}


def read_text_file(path: str) -> str:
    if not os.path.exists(path):
        return ""
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def read_json_file(path: str):
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def extract_root_cause(report_markdown: str) -> str:
    if "## Root Cause" not in report_markdown:
        return "Incident analyzed successfully"

    return (
        report_markdown
        .split("## Root Cause")[-1]
        .split("##")[0]
        .strip()
    )


def extract_severity(report_markdown: str) -> str:
    upper = report_markdown.upper()

    if "SEV-1" in upper:
        return "critical"
    if "SEV-2" in upper:
        return "high"
    if "SEV-3" in upper:
        return "medium"

    return "critical"


def extract_timeline(report_markdown: str):
    timeline = []

    if "## Timeline" not in report_markdown:
        return timeline

    try:
        section = (
            report_markdown
            .split("## Timeline")[1]
            .split("## Root Cause")[0]
        )

        for line in section.split("\n"):
            line = line.strip()

            if not line.startswith("- **"):
                continue

            try:
                time_part = line.split("**")[1].strip()

                event_part = (
                    line
                    .split("—")[1]
                    .split("[")[0]
                    .strip()
                )

                severity = "info"
                lower = event_part.lower()

                if (
                    "timeout" in lower
                    or "504" in lower
                    or "error" in lower
                    or "failed" in lower
                ):
                    severity = "error"

                elif (
                    "recover" in lower
                    or "resolved" in lower
                    or "restored" in lower
                ):
                    severity = "success"

                timeline.append({
                    "time": time_part,
                    "event": event_part,
                    "severity": severity,
                })

            except Exception:
                pass

    except Exception:
        pass

    return timeline


def format_action_items(action_items):
    formatted = []

    for i, item in enumerate(action_items):
        if isinstance(item, dict):
            formatted.append({
                "id": i + 1,
                "title": item.get("task") or item.get("title") or str(item),
                "priority": item.get("priority", "P1"),
            })
        else:
            formatted.append({
                "id": i + 1,
                "title": str(item),
                "priority": "P1",
            })

    return formatted


def build_response_data(incident_id, report_markdown, action_items, metrics_data):
    root_cause = extract_root_cause(report_markdown)

    return {
        "incident_id": incident_id,
        "severity": extract_severity(report_markdown),
        "root_cause": root_cause,
        "impact": {
            "users_affected": 0,
            "estimated_loss": 0,
            "mttr": "N/A",
        },
        "affected_services": [],
        "metrics": {
            "timeline_accuracy": metrics_data.get("timeline_accuracy", 0) * 100,
            "evidence_coverage": metrics_data.get("evidence_coverage", 0) * 100,
            "hallucination_rate": metrics_data.get("hallucination_rate", 0) * 100,
        },
        "timeline": extract_timeline(report_markdown),
        "report_markdown": report_markdown,
        "action_items": format_action_items(action_items),
    }


async def save_upload(file_obj, path: str):
    with open(path, "wb") as buffer:
        content = await file_obj.read()
        buffer.write(content)


@app.post("/analyze")
async def analyze_incident(request: Request):
    try:
        form = await request.form()

        alerts = form.get("alerts")
        metrics = form.get("metrics")
        chat = form.get("chat")
        runbook = form.get("runbook")
        logs = form.getlist("logs")

        missing = []

        if alerts is None:
            missing.append("alerts")
        if metrics is None:
            missing.append("metrics")
        if chat is None:
            missing.append("chat")
        if runbook is None:
            missing.append("runbook")
        if not logs:
            missing.append("logs")

        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required files: {', '.join(missing)}"
            )

        incident_id = str(uuid.uuid4())[:8]

        incident_folder = os.path.join(UPLOAD_DIR, incident_id)
        os.makedirs(incident_folder, exist_ok=True)

        await save_upload(alerts, os.path.join(incident_folder, "alerts.json"))
        await save_upload(metrics, os.path.join(incident_folder, "metrics.csv"))
        await save_upload(chat, os.path.join(incident_folder, "chat.txt"))
        await save_upload(runbook, os.path.join(incident_folder, "runbook.md"))

        logs_dir = os.path.join(incident_folder, "logs")
        os.makedirs(logs_dir, exist_ok=True)

        for log_file in logs:
            filename = log_file.filename or f"log_{uuid.uuid4().hex}.log"
            await save_upload(log_file, os.path.join(logs_dir, filename))

        result = run_incident_agent(incident_folder)

        output_dir = os.path.join(incident_folder, "output")
        report_path = os.path.join(output_dir, "incident_report.md")
        actions_path = os.path.join(output_dir, "action_items.json")

        report_markdown = read_text_file(report_path)
        action_items = read_json_file(actions_path)
        metrics_data = result.get("metrics", {})

        response_data = build_response_data(
            incident_id,
            report_markdown,
            action_items,
            metrics_data
        )

        root_cause = response_data["root_cause"]

        save_incident(
            incident_id=incident_id,
            title=root_cause[:60] if len(root_cause) > 60 else root_cause,
            severity=response_data["severity"],
            status="resolved",
            report=report_markdown,
        )

        return response_data

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/history")
def incident_history():
    return get_all_incidents()


@app.get("/results/{incident_id}")
def get_result(incident_id: str):
    incident_folder = os.path.join(UPLOAD_DIR, incident_id)
    output_dir = os.path.join(incident_folder, "output")

    report_path = os.path.join(output_dir, "incident_report.md")
    actions_path = os.path.join(output_dir, "action_items.json")
    evaluation_path = os.path.join(output_dir, "evaluation.json")

    if not os.path.exists(report_path):
        raise HTTPException(status_code=404, detail="Incident not found")

    report_markdown = read_text_file(report_path)
    action_items = read_json_file(actions_path)

    metrics_data = {}

    if os.path.exists(evaluation_path):
        evaluation = read_json_file(evaluation_path)
        metrics_data = evaluation.get("metrics", {})

    return build_response_data(
        incident_id,
        report_markdown,
        action_items,
        metrics_data
    )


@app.get("/download/report/{incident_id}")
def download_report(incident_id: str):
    report_path = os.path.join(
        UPLOAD_DIR,
        incident_id,
        "output",
        "incident_report.md"
    )

    if not os.path.exists(report_path):
        raise HTTPException(status_code=404, detail="Report not found")

    return FileResponse(
        report_path,
        media_type="text/markdown",
        filename="incident_report.md"
    )


@app.get("/download/actions/{incident_id}")
def download_actions(incident_id: str):
    actions_path = os.path.join(
        UPLOAD_DIR,
        incident_id,
        "output",
        "action_items.json"
    )

    if not os.path.exists(actions_path):
        raise HTTPException(status_code=404, detail="Actions not found")

    return FileResponse(
        actions_path,
        media_type="application/json",
        filename="action_items.json"
    )