from __future__ import annotations

import json
import os

from src.evaluator import evaluate_against_gold
from src.models import AgentState
from src.reporting import write_outputs
from src.state_machine import IncidentGraph


def run_incident_agent(repo_root: str):

    state = AgentState(repo_root=repo_root)

    graph = IncidentGraph()

    state, steps = graph.run(state)

    write_outputs(state)

    project_root = os.path.dirname(os.path.abspath(__file__))

    metrics = evaluate_against_gold(state, project_root)

    output_dir = os.path.join(repo_root, "output")
    os.makedirs(output_dir, exist_ok=True)

    with open(os.path.join(output_dir, "evaluation.json"), "w", encoding="utf-8") as f:
        json.dump(
            {
                "steps": steps,
                "metrics": metrics
            },
            f,
            indent=2
        )

    return {
        "steps": steps,
        "metrics": metrics
    }