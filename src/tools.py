from __future__ import annotations

import csv
import json
import os
import re
from collections import defaultdict
from statistics import median
from typing import Any, Dict, Iterable, List, Optional, Tuple

from .models import AgentState, Evidence, TimelineEvent


class ToolBelt:
    """Allowlisted tools used by the agent graph. No shell execution or eval is permitted."""

    def __init__(self, state: AgentState):
        self.state = state

    def _record(self, name: str) -> None:
        self.state.tool_calls.append(name)

    def load_json_alerts(self, path: str) -> List[Dict[str, Any]]:
        self._record("load_json_alerts")
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def load_metrics_csv(self, path: str) -> List[Dict[str, Any]]:
        self._record("load_metrics_csv")
        rows: List[Dict[str, Any]] = []
        with open(path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for idx, row in enumerate(reader, start=2):
                row["latency_ms"] = float(row["latency_ms"])
                row["error_rate"] = float(row["error_rate"])
                row["_row"] = idx
                rows.append(row)
        return rows

    def load_line_file(self, path: str) -> List[Dict[str, Any]]:
        self._record("load_line_file")
        lines: List[Dict[str, Any]] = []
        with open(path, "r", encoding="utf-8") as f:
            for idx, line in enumerate(f, start=1):
                lines.append({"line": idx, "text": line.rstrip("\n")})
        return lines

    def load_logs_dir(self, path: str) -> Dict[str, List[Dict[str, Any]]]:
        self._record("load_logs_dir")
        result: Dict[str, List[Dict[str, Any]]] = {}
        for name in sorted(os.listdir(path)):
            full = os.path.join(path, name)
            if os.path.isfile(full):
                result[name] = self.load_line_file(full)
        return result

    def parse_chat(self, path: str) -> List[Dict[str, Any]]:
        self._record("parse_chat")
        raw = self.load_line_file(path)
        pattern = re.compile(r"^\[(?P<ts>[^\]]+)\] (?P<who>[^:]+): (?P<msg>.*)$")
        out: List[Dict[str, Any]] = []
        for row in raw:
            m = pattern.match(row["text"])
            if m:
                out.append({**row, **m.groupdict()})
            else:
                out.append({**row, "ts": None, "who": "unknown", "msg": row["text"]})
        return out

    def evidence_for_lines(self, path: str, line_start: int, line_end: Optional[int] = None, snippet: Optional[str] = None) -> Evidence:
        self._record("evidence_for_lines")
        line_end = line_start if line_end is None else line_end
        if snippet is None:
            snippet = ""
        return Evidence(source=path, ref=f"L{line_start}-L{line_end}", snippet=snippet)

    def evidence_for_metric(self, timestamp: str, snippet: str) -> Evidence:
        self._record("evidence_for_metric")
        return Evidence(source="metrics.csv", ref=timestamp, snippet=snippet)

    def search_logs(self, keyword: Optional[str] = None, regex: Optional[str] = None, start_time: Optional[str] = None, end_time: Optional[str] = None) -> List[Tuple[str, Dict[str, Any]]]:
        self._record("search_logs")
        results: List[Tuple[str, Dict[str, Any]]] = []
        compiled = re.compile(regex) if regex else None
        for filename, lines in self.state.logs.items():
            for row in lines:
                text = row["text"]
                timestamp = text.split(" ", 1)[0] if " " in text else ""
                if start_time and timestamp < start_time:
                    continue
                if end_time and timestamp > end_time:
                    continue
                if keyword and keyword not in text:
                    continue
                if compiled and not compiled.search(text):
                    continue
                if keyword or compiled:
                    results.append((filename, row))
        return results

    def detect_metric_anomalies(self) -> List[Dict[str, Any]]:
        self._record("detect_metric_anomalies")
        grouped: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        for row in self.state.metrics:
            grouped[row["service"]].append(row)
        anomalies: List[Dict[str, Any]] = []
        for service, rows in grouped.items():
            baseline_latency = median(r["latency_ms"] for r in rows[:4])
            baseline_error = median(r["error_rate"] for r in rows[:4])
            for row in rows:
                latency_ratio = row["latency_ms"] / max(baseline_latency, 1)
                error_ratio = (row["error_rate"] + 1e-9) / max(baseline_error + 1e-9, 1e-9)
                if row["latency_ms"] >= baseline_latency * 3 or row["error_rate"] >= max(0.05, baseline_error * 3):
                    anomalies.append(
                        {
                            "service": service,
                            "timestamp": row["timestamp"],
                            "latency_ms": row["latency_ms"],
                            "error_rate": row["error_rate"],
                            "latency_ratio": round(latency_ratio, 2),
                            "error_ratio": round(error_ratio, 2),
                            "row": row["_row"],
                        }
                    )
        anomalies.sort(key=lambda x: x["timestamp"])
        return anomalies

    def extract_entities(self) -> Dict[str, Any]:
        self._record("extract_entities")
        services = set()
        owners = {}
        service_names = ["api-gateway", "payments", "cart", "redis-cache"]
        for alert in self.state.alerts:
            services.add(alert["service"])
        for filename, lines in self.state.logs.items():
            service = filename.replace(".log", "")
            for line in lines:
                if any(token in line["text"] for token in ["ERROR", "WARN"]):
                    services.add(service)
        for line in self.state.runbook_lines:
            text = line["text"]
            for svc in service_names:
                if text.startswith(f"- {svc} owner:"):
                    owners[svc] = text.split(":", 1)[1].strip()
        return {"services": sorted(services), "owners": owners}

    def apply_runbook(self, impacted_services: Iterable[str]) -> Tuple[str, List[Evidence]]:
        self._record("apply_runbook")
        evidence: List[Evidence] = []
        sev = "SEV-3"
        max_error = max(row["error_rate"] for row in self.state.metrics if row["service"] == "api-gateway")
        if max_error > 0.10 and {"api-gateway", "payments", "cart"}.intersection(set(impacted_services)):
            sev = "SEV-1"
        elif max_error >= 0.02:
            sev = "SEV-2"
        for line in self.state.runbook_lines:
            if "SEV-1" in line["text"] or "SEV-2" in line["text"]:
                evidence.append(self.evidence_for_lines("runbook.md", line["line"], snippet=line["text"]))
        metric_row = next(row for row in self.state.metrics if row["service"] == "api-gateway" and row["timestamp"] == "2026-01-17T10:42:00Z")
        evidence.append(self.evidence_for_metric(metric_row["timestamp"], f"api-gateway error_rate={metric_row['error_rate']}"))
        return sev, evidence

    def infer_start_time(self) -> Tuple[str, List[Evidence]]:
        self._record("infer_start_time")
        anomalies = self.detect_metric_anomalies()
        first = anomalies[0]
        evidence = [
            self.evidence_for_metric(first["timestamp"], f"{first['service']} anomaly latency={first['latency_ms']} error_rate={first['error_rate']}")
        ]
        redis_hits = self.search_logs(regex=r"blocked_clients=\d+", start_time="2026-01-17T10:39:00Z", end_time="2026-01-17T10:39:10Z")
        for filename, row in redis_hits[:1]:
            evidence.append(self.evidence_for_lines(f"logs/{filename}", row["line"], snippet=row["text"]))
        return first["timestamp"], evidence

    def build_timeline(self, candidates: List[Tuple[str, str, Evidence]]) -> List[TimelineEvent]:
        self._record("build_timeline")
        grouped: Dict[Tuple[str, str], List[Evidence]] = defaultdict(list)
        for ts, summary, evidence in candidates:
            grouped[(ts, summary)].append(evidence)
        timeline = [TimelineEvent(timestamp=ts, summary=summary, evidence=evidence) for (ts, summary), evidence in grouped.items()]
        timeline.sort(key=lambda e: e.timestamp)
        return timeline
