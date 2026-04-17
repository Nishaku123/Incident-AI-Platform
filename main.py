from __future__ import annotations

import json
import os

from src.evaluator import evaluate_against_gold
from src.models import AgentState
from src.reporting import write_outputs
from src.state_machine import IncidentGraph


if __name__ == "__main__":
    repo_root = os.path.dirname(os.path.abspath(__file__))
    state = AgentState(repo_root=repo_root)
    graph = IncidentGraph()
    state, steps = graph.run(state)
    write_outputs(state)
    metrics = evaluate_against_gold(state, repo_root)
    with open(os.path.join(repo_root, "output", "evaluation.json"), "w", encoding="utf-8") as f:
        json.dump({"steps": steps, "metrics": metrics}, f, indent=2)
    print("Completed steps:", " -> ".join(steps))
    print(json.dumps(metrics, indent=2))
