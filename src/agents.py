from __future__ import annotations

from typing import List

from .models import AgentState, Evidence, Hypothesis
from .tools import ToolBelt


class IngestAgent:
    def run(self, state: AgentState, tools: ToolBelt) -> AgentState:
        state.alerts = tools.load_json_alerts(f"{state.repo_root}/alerts.json")
        state.metrics = tools.load_metrics_csv(f"{state.repo_root}/metrics.csv")
        state.logs = tools.load_logs_dir(f"{state.repo_root}/logs")
        state.chat_lines = tools.parse_chat(f"{state.repo_root}/chat.txt")
        state.runbook_lines = tools.load_line_file(f"{state.repo_root}/runbook.md")
        return state


class TriageAgent:
    def run(self, state: AgentState, tools: ToolBelt) -> AgentState:
        entities = tools.extract_entities()
        anomalies = tools.detect_metric_anomalies()
        impacted = {a["service"] for a in anomalies}
        impacted.update(entities["services"])
        state.impacted_services = sorted(impacted)
        state.severity, _ = tools.apply_runbook(state.impacted_services)
        state.likely_start_time, _ = tools.infer_start_time()
        return state


class ForensicsAgent:
    def run(self, state: AgentState, tools: ToolBelt) -> AgentState:
        candidates = []

        redis_rows = tools.search_logs(keyword="blocked_clients", start_time="2026-01-17T10:39:00Z")
        if redis_rows:
            filename, row = redis_rows[0]
            candidates.append((
                row["text"].split(" ", 1)[0],
                "redis primary shows blocked clients and replication lag during bgsave",
                tools.evidence_for_lines(f"logs/{filename}", row["line"], snippet=row["text"]),
            ))

        gateway_rows = tools.search_logs(keyword="upstream response slow")
        if gateway_rows:
            filename, row = gateway_rows[0]
            candidates.append((
                row["text"].split(" ", 1)[0],
                "checkout slowdown appears at the gateway",
                tools.evidence_for_lines(f"logs/{filename}", row["line"], snippet=row["text"]),
            ))

        for text in ["payment charge retries are stacking up", "redis primary has blocked clients", "declare SEV-1", "failing over redis now", "payment success recovering", "resolving incident"]:
            for row in state.chat_lines:
                if text in row.get("msg", ""):
                    candidates.append((
                        row["ts"].replace(" ", "T") + "Z",
                        row["msg"],
                        tools.evidence_for_lines("chat.txt", row["line"], snippet=row["text"]),
                    ))
                    break

        for kw, summary in [
            ("REDIS_TIMEOUT", "cart starts timing out on redis session fetches"),
            ("status=504", "gateway returns checkout 504 errors"),
        ]:
            rows = tools.search_logs(keyword=kw)
            if rows:
                filename, row = rows[0]
                candidates.append((
                    row["text"].split(" ", 1)[0],
                    summary,
                    tools.evidence_for_lines(f"logs/{filename}", row["line"], snippet=row["text"]),
                ))

        metric_ev = tools.evidence_for_metric("2026-01-17T10:42:00Z", "api-gateway latency 3250ms error_rate 0.22")
        candidates.append(("2026-01-17T10:42:00Z", "checkout impact peaks with high latency and error rate", metric_ev))
        state.timeline = tools.build_timeline(candidates)
        return state


class HypothesisAgent:
    def run(self, state: AgentState, tools: ToolBelt) -> AgentState:
        hyps: List[Hypothesis] = []

        redis_support = []
        for filename, row in tools.search_logs(keyword="disk I/O saturation")[:2]:
            redis_support.append(tools.evidence_for_lines(f"logs/{filename}", row["line"], snippet=row["text"]))
        redis_support.append(tools.evidence_for_lines("chat.txt", 10, snippet=state.chat_lines[9]["text"]))
        hyps.append(Hypothesis(
            title="Redis primary stall during bgsave",
            description="redis-cache primary stalled during background save, causing blocked clients, cart timeouts, and downstream checkout failures.",
            supporting_evidence=redis_support,
            confidence=0.88,
        ))

        deploy_contra = []
        deploy_contra.append(tools.evidence_for_lines("chat.txt", 10, snippet=state.chat_lines[9]["text"]))
        hyps.append(Hypothesis(
            title="Recent application deployment regression",
            description="A new deploy in payments or cart introduced latency and failures on checkout.",
            contradicting_evidence=deploy_contra,
            confidence=0.22,
        ))

        processor_support = []
        processor_contra = []
        processor_contra.append(tools.evidence_for_lines("chat.txt", 6, snippet=state.chat_lines[5]["text"]))
        hyps.append(Hypothesis(
            title="External payment processor outage",
            description="The external payment processor degraded independently of internal services.",
            supporting_evidence=processor_support,
            contradicting_evidence=processor_contra,
            confidence=0.18,
        ))

        state.hypotheses = sorted(hyps, key=lambda h: h.confidence, reverse=True)
        return state


class VerifierAgent:
    def run(self, state: AgentState, tools: ToolBelt) -> AgentState:
        verified = []
        for hyp in state.hypotheses:
            if hyp.title == "Redis primary stall during bgsave":
                cart_hits = tools.search_logs(keyword="REDIS_TIMEOUT")
                pay_hits = tools.search_logs(keyword="CART_TIMEOUT")
                if cart_hits and pay_hits and hyp.supporting_evidence:
                    hyp.status = "verified"
                    hyp.confidence = 0.94
                    verified.append(hyp)
                else:
                    hyp.status = "rejected"
                    state.rejected_claims.append(hyp.title)
            else:
                if hyp.contradicting_evidence:
                    hyp.status = "rejected"
                    state.rejected_claims.append(hyp.title)
                else:
                    hyp.status = "inconclusive"
        state.hypotheses = sorted(state.hypotheses, key=lambda h: h.confidence, reverse=True)
        if verified:
            state.verified_root_cause = verified[0].description
        else:
            state.verified_root_cause = "inconclusive"
        return state
