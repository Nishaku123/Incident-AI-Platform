from __future__ import annotations

import os

from run_agent import run_incident_agent

if __name__ == "__main__":

    repo_root = os.path.dirname(os.path.abspath(__file__))

    result = run_incident_agent(repo_root)

    print(result)