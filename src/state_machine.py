from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, List, Tuple

from .agents import ForensicsAgent, HypothesisAgent, IngestAgent, TriageAgent, VerifierAgent
from .models import AgentState
from .tools import ToolBelt


@dataclass
class GraphStep:
    name: str
    fn: Callable[[AgentState, ToolBelt], AgentState]


class IncidentGraph:
    def __init__(self) -> None:
        self.steps: List[GraphStep] = [
            GraphStep("Ingest", IngestAgent().run),
            GraphStep("Index Evidence", lambda s, t: s),
            GraphStep("Triage", TriageAgent().run),
            GraphStep("Investigate", ForensicsAgent().run),
            GraphStep("Hypothesize", HypothesisAgent().run),
            GraphStep("Verify", VerifierAgent().run),
            GraphStep("Report", lambda s, t: s),
        ]

    def run(self, state: AgentState) -> Tuple[AgentState, List[str]]:
        tools = ToolBelt(state)
        completed: List[str] = []
        for step in self.steps:
            state = step.fn(state, tools)
            completed.append(step.name)
        return state, completed
