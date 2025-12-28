---
description: Session initialization with code health monitoring
---

# /start — Session Initialization

## 1. Load Context

- Read project documentation
- Check current tasks/priorities
- Load previous session context if available

## 2. Health Check

```bash
# Run system diagnostic if available
# Check that all critical services are running
```

## 3. Code Health Monitor

### Metrics to Track

| Metric | Threshold | Action |
|--------|-----------|--------|
| File size | >500 lines | Flag for refactor |
| Function complexity | >20 cyclomatic | Review needed |
| Duplicate code | >3 occurrences | Extract to shared |
| Unused imports | Any | Auto-remove |
| TODO/FIXME age | >7 days | Escalate to task |

### Telemetry Events

Record at session start:
```json
{
  "event": "session_start",
  "timestamp": "ISO8601",
  "files_changed_since_last": 0,
  "pending_refactors": [],
  "code_health_score": "0-100"
}
```

## 4. Validate Tools

- Test critical MCP connections
- Report any failures
- Fallback to alternatives if needed

## 5. Output Briefing

- Current sprint focus
- Pending tasks (P0 > P1 > P2)
- Code health alerts (if any)

---

*Auto-triggers: Code Health Monitor runs every /start*
