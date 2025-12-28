---
description: Debugging and troubleshooting guide
---

# /debug — Troubleshooting Workflow

## When to Use

- Something isn't working as expected
- Error messages appear
- Behavior is inconsistent

## 1. Identify the Problem

```markdown
DESCRIBE:
- What should happen?
- What actually happens?
- When did it start?
```

## 2. Gather Information

### Check Logs
```bash
# Application logs
tail -f logs/*.log

# System logs
journalctl -f
```

### Check Status
```bash
# Running processes
ps aux | grep node

# Port usage
lsof -i :3000
```

### Check Environment
```bash
# Environment variables
env | grep -E "API|DB|NODE"

# Node version
node --version
```

## 3. Isolate the Issue

### Levels of Isolation

| Level | Check |
|-------|-------|
| **Environment** | Wrong env vars? Missing dependencies? |
| **Configuration** | Incorrect config? Wrong paths? |
| **Code** | Recent changes? Syntax errors? |
| **Data** | Corrupted data? Missing records? |
| **External** | API down? Network issues? |

### Binary Search

If unsure where the problem is:
1. Comment out half the code
2. Does problem persist?
3. Yes → Problem in remaining half
4. No → Problem in commented half
5. Repeat until found

## 4. Fix and Verify

### Before Fixing
```bash
# Create a backup/branch
git checkout -b fix/issue-description
```

### After Fixing
```bash
# Test the fix
npm test

# Verify manually
# Document what you changed
```

## 5. Document

```markdown
## Bug Report

**Problem:** [description]
**Cause:** [root cause]
**Fix:** [what was changed]
**Prevention:** [how to avoid in future]
```

## Common Issues

### Port Already in Use
```bash
lsof -i :3000
kill -9 <PID>
```

### Module Not Found
```bash
rm -rf node_modules
npm install
```

### Database Connection Failed
```bash
# Check if DB exists
ls -la ~/.local/share/cortex/

# Regenerate Prisma client
npx prisma generate
```

### Environment Variables Missing
```bash
cp .env.example .env
# Fill in values
```

---

*"Debug systematically, not randomly."*
