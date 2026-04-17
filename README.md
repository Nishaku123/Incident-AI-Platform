# Agentic AI Incident Response Automation

This repo implements an incident-response agent that ingests messy operational inputs and produces two grounded outputs:

- `output/incident_report.md`
- `output/action_items.json`

The design follows an explicit, recoverable state machine:

`Ingest -> Index Evidence -> Triage -> Investigate -> Hypothesize -> Verify -> Report`

## Assignment coverage

### Deliverables included
- `main.py` runnable end-to-end
- `alerts.json`, `metrics.csv`, `logs/`, `chat.txt`, `runbook.md`
- explicit multi-agent orchestration with verifier
- explicit state machine / graph implementation
- `gold/expected.json`
- `tests/test_prompts.json` with 12 scenarios
- evaluation metrics reported below

### Sample data coverage
The committed sample data contains more than 10 meaningful incident events across alerts, metrics, logs, and chat. The gold incident case models a checkout outage caused by redis primary instability during background save activity.

## How to run

```bash
python main.py
```

Generated files:
- `output/incident_report.md`
- `output/action_items.json`
- `output/evaluation.json`

## Architecture

### Agent roles
1. **Ingest Agent**
   - loads alerts, metrics, logs, chat, and runbook into state
2. **Triage Agent**
   - identifies impacted services, severity, and likely incident start time
3. **Forensics Agent**
   - builds a grounded event timeline from logs, chat, and metrics
4. **Hypothesis Agent**
   - proposes 2–3 root-cause hypotheses and ranks them
5. **Verifier Agent**
   - rejects unsupported hypotheses and only allows supported conclusions into final outputs

### State machine
The graph is implemented in `src/state_machine.py` with explicit phases:
- Ingest
- Index Evidence
- Triage
- Investigate
- Hypothesize
- Verify
- Report

This makes execution order explicit and recoverable without hidden phase transitions.

## Tooling

The agent uses an allowlisted `ToolBelt` in `src/tools.py`. These are real callable tools, not just internal comments.

1. **`load_json_alerts(path)`**
   - parses `alerts.json`
2. **`load_metrics_csv(path)`**
   - parses CSV metrics into typed rows
3. **`load_line_file(path)`**
   - line-indexes text artifacts for evidence references
4. **`load_logs_dir(path)`**
   - loads all service logs from `logs/`
5. **`parse_chat(path)`**
   - parses Slack-style chat transcript into structured records
6. **`evidence_for_lines(path, line_start, line_end)`**
   - creates citation objects for text/log/runbook/chat evidence
7. **`evidence_for_metric(timestamp, snippet)`**
   - creates metrics citations using timestamp references
8. **`search_logs(keyword, regex, start_time, end_time)`**
   - supports keyword/regex log search with time filters
9. **`detect_metric_anomalies()`**
   - identifies metric spikes and change points relative to baseline
10. **`extract_entities()`**
    - extracts impacted services and owners
11. **`apply_runbook(impacted_services)`**
    - maps observed impact + thresholds to severity using runbook guidance
12. **`infer_start_time()`**
    - infers likely incident start from earliest anomaly + corroborating log evidence
13. **`build_timeline(candidates)`**
    - composes a sorted grounded incident timeline

## Evidence grounding

Every major claim is grounded with one of the required formats:

- text/logs/runbook/chat: `path:Lstart-Lend`
- metrics: `metrics.csv:timestamp`

Examples from generated output:
- `logs/cart.log:L5-L5`
- `chat.txt:L9-L9`
- `runbook.md:L8-L8`
- `metrics.csv:2026-01-17T10:42:00Z`

## Safety model

Prompt injection defense is handled by design:

- `chat.txt` and `runbook.md` are treated as untrusted data sources
- no shell execution anywhere in the pipeline
- no `eval()`
- only allowlisted Python tool calls are available to agents
- incident artifacts are parsed as text, never executed

The sample runbook deliberately includes an injection string to demonstrate this constraint.

## Gold incident case

Stored in `gold/expected.json`:
- expected impacted services
- expected severity
- expected start time
- 10 timeline anchors
- expected root cause

## Tests

`tests/test_prompts.json` contains 12 required scenario prompts, covering:
- partial logs
- noisy chat
- conflicting alerts
- metrics spike but no logs
- unrelated chatter
- runbook contradictions
- missing chat
- sparse alerts
- chat misinformation
- shifted incident start time
- alternate recovery path
- prompt injection artifacts

## Evaluation metrics

Current metrics from `output/evaluation.json`:

- **timeline accuracy**: `1.00`
- **evidence coverage**: `1.00`
- **hallucination rate**: `0.00`
- **tool-call correctness**: `1.00`

Additional computed checks:
- impacted service match: `1.00`
- severity match: `1.00`
- start time match: `1.00`

### Metric definitions
- **timeline accuracy**: fraction of gold timeline anchors matched by predicted timeline timestamps
- **evidence coverage**: fraction of major report claims with citations
- **hallucination rate**: unsupported final claims admitted by the verifier divided by total major final claims
- **tool-call correctness**: fraction of required tool categories actually invoked during the run

## File overview

```text
incident_agent_repo/
├── alerts.json
├── metrics.csv
├── chat.txt
├── runbook.md
├── logs/
│   ├── api-gateway.log
│   ├── cart.log
│   ├── payments.log
│   └── redis-cache.log
├── gold/
│   └── expected.json
├── tests/
│   └── test_prompts.json
├── src/
│   ├── agents.py
│   ├── evaluator.py
│   ├── models.py
│   ├── reporting.py
│   ├── state_machine.py
│   └── tools.py
├── output/
│   ├── action_items.json
│   ├── evaluation.json
│   └── incident_report.md
└── main.py
```

## Notes for extension

If you want to move this closer to a production-grade implementation, the next upgrades would be:
- replace the simple state machine with LangGraph nodes and resumability metadata
- add richer statistical anomaly detection
- add test automation that mutates fixture inputs and validates expected outputs automatically
- expand ownership inference and task extraction beyond runbook mappings
