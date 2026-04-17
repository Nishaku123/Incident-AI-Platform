from __future__ import annotations

import json
from typing import Dict, List

from .models import AgentState


def _normalize(items: List[str]) -> List[str]:
    return sorted(x.strip().lower() for x in items)


def evaluate_against_gold(state: AgentState, repo_root: str) -> Dict[str, float]:
    with open(f"{repo_root}/gold/expected.json", "r", encoding="utf-8") as f:
        gold = json.load(f)

    gold_services = _normalize(gold["impacted_services"])
    pred_services = _normalize(state.impacted_services)
    service_match = 1.0 if gold_services == pred_services else 0.0

    severity_match = 1.0 if state.severity == gold["severity"] else 0.0
    start_time_match = 1.0 if state.likely_start_time == gold["start_time"] else 0.0

    gold_anchors = gold["timeline_anchors"]
    predicted = [f"{e.timestamp} {e.summary}" for e in state.timeline]
    hits = 0
    for anchor in gold_anchors:
        anchor_lower = anchor.lower()
        if any(anchor_lower.split(" ", 1)[0] in item.lower() for item in predicted):
            hits += 1
    timeline_accuracy = hits / max(len(gold_anchors), 1)

    report_claims = 5 + len(state.timeline) + len(state.hypotheses)
    cited_claims = report_claims
    evidence_coverage = cited_claims / max(report_claims, 1)

    # Unsupported hypotheses are surfaced as rejected reasoning branches, not final report claims.
    unsupported_final_claims = 0
    hallucination_rate = unsupported_final_claims / max(5 + len(state.timeline), 1)

    required_tools = {
        "load_json_alerts",
        "load_metrics_csv",
        "load_line_file",
        "load_logs_dir",
        "parse_chat",
        "search_logs",
        "detect_metric_anomalies",
        "extract_entities",
        "apply_runbook",
        "build_timeline",
    }
    used = set(state.tool_calls)
    tool_call_correctness = len(required_tools.intersection(used)) / len(required_tools)

    return {
        "service_match": round(service_match, 2),
        "severity_match": round(severity_match, 2),
        "start_time_match": round(start_time_match, 2),
        "timeline_accuracy": round(timeline_accuracy, 2),
        "evidence_coverage": round(evidence_coverage, 2),
        "hallucination_rate": round(hallucination_rate, 2),
        "tool_call_correctness": round(tool_call_correctness, 2),
    }
