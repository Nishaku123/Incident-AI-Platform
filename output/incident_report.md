# Incident Report

## Summary
A checkout incident propagated from redis-cache to cart, payments, and api-gateway, causing broad customer-facing failures until manual redis failover restored service. Evidence: metrics.csv:2026-01-17T10:39:00Z; logs/redis-cache.log:L3-L3; runbook.md:L8-L8

## Impacted Services
api-gateway, cart, payments, redis-cache
Evidence: alerts.json:L1-L1; logs/cart.log:L5-L8

## Severity
SEV-1
Evidence: runbook.md:L8-L8; runbook.md:L9-L9; runbook.md:L13-L13; metrics.csv:2026-01-17T10:42:00Z

## Likely Incident Start Time
2026-01-17T10:39:00Z
Evidence: metrics.csv:2026-01-17T10:39:00Z; logs/redis-cache.log:L3-L3

## Timeline
- **2026-01-17T10:39:01Z** — redis primary shows blocked clients and replication lag during bgsave [logs/redis-cache.log:L3-L3]
- **2026-01-17T10:39:05Z** — checkout slowdown appears at the gateway [logs/api-gateway.log:L3-L3]
- **2026-01-17T10:39:44Z** — payment charge retries are stacking up, looks like cart session fetch is slow [chat.txt:L2-L2]
- **2026-01-17T10:40:11Z** — cart starts timing out on redis session fetches [logs/cart.log:L5-L5]
- **2026-01-17T10:40:18Z** — gateway returns checkout 504 errors [logs/api-gateway.log:L5-L5]
- **2026-01-17T10:41:36Z** — redis primary has blocked clients and replication lag during bgsave [chat.txt:L7-L7]
- **2026-01-17T10:42:00Z** — checkout impact peaks with high latency and error rate [metrics.csv:2026-01-17T10:42:00Z]
- **2026-01-17T10:42:11Z** — following runbook, declare SEV-1 if checkout broadly unavailable >10 percent error rate [chat.txt:L9-L9]
- **2026-01-17T10:43:02Z** — approved, failing over redis now [chat.txt:L11-L11]
- **2026-01-17T10:43:48Z** — payment success recovering, latency still elevated but charge path works again [chat.txt:L12-L12]
- **2026-01-17T10:45:11Z** — resolving incident, monitor for 15 minutes [chat.txt:L14-L14]

## Root Cause
redis-cache primary stalled during background save, causing blocked clients, cart timeouts, and downstream checkout failures.
Evidence: logs/redis-cache.log:L4-L4; logs/redis-cache.log:L7-L7; chat.txt:L10-L10

## Hypotheses
- **Redis primary stall during bgsave** (verified, confidence=0.94)
  - redis-cache primary stalled during background save, causing blocked clients, cart timeouts, and downstream checkout failures.
  - Support: logs/redis-cache.log:L4-L4; logs/redis-cache.log:L7-L7; chat.txt:L10-L10
- **Recent application deployment regression** (rejected, confidence=0.22)
  - A new deploy in payments or cart introduced latency and failures on checkout.
  - Contradiction: chat.txt:L10-L10
- **External payment processor outage** (rejected, confidence=0.18)
  - The external payment processor degraded independently of internal services.
  - Contradiction: chat.txt:L6-L6

## Follow-ups
- P0 Audit redis persistence and disk I/O settings around bgsave stalls. (owner: data-platform)
- P1 Add alert correlation for REDIS_TIMEOUT -> CART_TIMEOUT -> gateway 504 chain. (owner: platform)
- P1 Review checkout failover playbook and automate safe redis failover validation. (owner: data-platform)
