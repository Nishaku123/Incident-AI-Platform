from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class Evidence:
    source: str
    ref: str
    snippet: str

    def cite(self) -> str:
        return f"{self.source}:{self.ref}"


@dataclass
class TimelineEvent:
    timestamp: str
    summary: str
    evidence: List[Evidence] = field(default_factory=list)


@dataclass
class Hypothesis:
    title: str
    description: str
    supporting_evidence: List[Evidence] = field(default_factory=list)
    contradicting_evidence: List[Evidence] = field(default_factory=list)
    confidence: float = 0.0
    status: str = "unverified"


@dataclass
class AgentState:
    repo_root: str
    alerts: List[Dict[str, Any]] = field(default_factory=list)
    metrics: List[Dict[str, Any]] = field(default_factory=list)
    logs: Dict[str, List[Dict[str, Any]]] = field(default_factory=dict)
    chat_lines: List[Dict[str, Any]] = field(default_factory=list)
    runbook_lines: List[Dict[str, Any]] = field(default_factory=list)
    impacted_services: List[str] = field(default_factory=list)
    severity: Optional[str] = None
    likely_start_time: Optional[str] = None
    timeline: List[TimelineEvent] = field(default_factory=list)
    hypotheses: List[Hypothesis] = field(default_factory=list)
    verified_root_cause: Optional[str] = None
    follow_ups: List[str] = field(default_factory=list)
    action_items: List[Dict[str, Any]] = field(default_factory=list)
    rejected_claims: List[str] = field(default_factory=list)
    tool_calls: List[str] = field(default_factory=list)
