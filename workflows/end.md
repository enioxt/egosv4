---
description: Session finalization with handoff generation
---

# /end — Session Finalization

## 1. Generate Summary

Create a brief summary of:
- What was accomplished
- What is pending
- Any blockers or issues

## 2. Update Documentation

- Update task lists if needed
- Add notes for next session
- Document any decisions made

## 3. Commit Changes

```bash
# Stage all changes
git add -A

# Commit with conventional format
git commit -m "type: description"
```

### Commit Types

| Type | Use |
|------|-----|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `chore` | Maintenance |
| `refactor` | Code improvement |
| `test` | Tests |

## 4. Handoff Report

Generate context for next session:

```markdown
## Session Handoff

**Date:** YYYY-MM-DD
**Duration:** X hours

### Accomplished
- Item 1
- Item 2

### Pending
- Item 1
- Item 2

### Notes for Next Session
- Important context
```

## 5. Cleanup

- Close any running servers
- Clear temporary files
- Verify no uncommitted changes

---

*Always run /end before leaving a session*
