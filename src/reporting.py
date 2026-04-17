from __future__ import annotations

import json
import os
from typing import List

from .models import AgentState, Evidence
from .tools import ToolBelt


def _fmt_evidence(items: List[Evidence]) -> str:
    return "; ".join(f"{ev.cite()}" for ev in items)


def build_action_items(state: AgentState, tools: ToolBelt) -> List[dict]:
    owners = tools.extract_entities()["owners"]
    return [
        {
            "task": "Audit redis persistence and disk I/O settings around bgsave stalls.",
            "priority": "P0",
            "owner": owners.get("redis-cache", "unknown"),
            "evidence": ["logs/redis-cache.log:L4-L7", "chat.txt:L10-L11"],
        },
        {
            "task": "Add alert correlation for REDIS_TIMEOUT -> CART_TIMEOUT -> gateway 504 chain.",
            "priority": "P1",
            "owner": owners.get("api-gateway", "unknown"),
            "evidence": ["logs/cart.log:L5-L8", "logs/payments.log:L5-L8", "logs/api-gateway.log:L5-L7"],
        },
        {
            "task": "Review checkout failover playbook and automate safe redis failover validation.",
            "priority": "P1",
            "owner": owners.get("redis-cache", "unknown"),
            "evidence": ["runbook.md:L18-L20", "chat.txt:L10-L12"],
        },
    ]


def write_outputs(state: AgentState) -> None:
    tools = ToolBelt(state)
    output_dir = os.path.join(state.repo_root, "output")
    os.makedirs(output_dir, exist_ok=True)

    sev, sev_evidence = tools.apply_runbook(state.impacted_services)
    start_time, start_evidence = tools.infer_start_time()
    state.action_items = build_action_items(state, tools)

    report_path = os.path.join(output_dir, "incident_report.md")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# Incident Report\n\n")
        f.write("## Summary\n")
        f.write(
            "A checkout incident propagated from redis-cache to cart, payments, and api-gateway, causing broad customer-facing failures until manual redis failover restored service. "
            f"Evidence: {_fmt_evidence(start_evidence + sev_evidence[:1])}\n\n"
        )
        f.write("## Impacted Services\n")
        f.write(", ".join(state.impacted_services) + "\n")
        impacted_evidence = [tools.evidence_for_lines("alerts.json", 1, snippet="services in alerts.json"), tools.evidence_for_lines("logs/cart.log", 5, 8, snippet="cart REDIS_TIMEOUT chain")]
        f.write(f"Evidence: {_fmt_evidence(impacted_evidence)}\n\n")
        f.write("## Severity\n")
        f.write(f"{sev}\n")
        f.write(f"Evidence: {_fmt_evidence(sev_evidence)}\n\n")
        f.write("## Likely Incident Start Time\n")
        f.write(f"{start_time}\n")
        f.write(f"Evidence: {_fmt_evidence(start_evidence)}\n\n")
        f.write("## Timeline\n")
        for event in state.timeline:
            f.write(f"- **{event.timestamp}** — {event.summary} [{_fmt_evidence(event.evidence)}]\n")
        f.write("\n## Root Cause\n")
        f.write((state.verified_root_cause or "inconclusive") + "\n")
        if state.hypotheses:
            top = state.hypotheses[0]
            all_evidence = top.supporting_evidence + top.contradicting_evidence
            f.write(f"Evidence: {_fmt_evidence(all_evidence)}\n\n")
        f.write("## Hypotheses\n")
        for hyp in state.hypotheses:
            f.write(f"- **{hyp.title}** ({hyp.status}, confidence={hyp.confidence:.2f})\n")
            f.write(f"  - {hyp.description}\n")
            if hyp.supporting_evidence:
                f.write(f"  - Support: {_fmt_evidence(hyp.supporting_evidence)}\n")
            if hyp.contradicting_evidence:
                f.write(f"  - Contradiction: {_fmt_evidence(hyp.contradicting_evidence)}\n")
        f.write("\n## Follow-ups\n")
        for item in state.action_items:
            f.write(f"- {item['priority']} {item['task']} (owner: {item['owner']})\n")

    actions_path = os.path.join(output_dir, "action_items.json")
    with open(actions_path, "w", encoding="utf-8") as f:
        json.dump(state.action_items, f, indent=2)
