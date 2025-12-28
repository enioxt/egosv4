---
description: System health check workflow
---

# /health — System Health Check

## When to Use

- Start of a new session
- Before major changes
- When something feels "off"

## 1. Code Health

```bash
# Run code health monitor
npx tsx tools/code-health-monitor.ts .
```

### Metrics

| Metric | Healthy | Warning | Critical |
|--------|:-------:|:-------:|:--------:|
| Health Score | 80-100 | 50-79 | 0-49 |
| Files > 500 lines | 0 | 1-3 | 4+ |
| TODOs/FIXMEs | < 10 | 10-20 | 20+ |

## 2. Dependency Health

```bash
# Check for outdated packages
npm outdated

# Check for vulnerabilities
npm audit
```

### Actions

| Finding | Action |
|---------|--------|
| Major version behind | Plan upgrade |
| Security vulnerability | Fix immediately |
| Deprecated package | Find replacement |

## 3. Test Health

```bash
# Run all tests
npm test

# Check coverage
npm run test:coverage
```

### Expectations

| Metric | Target |
|--------|--------|
| Tests passing | 100% |
| Coverage | > 70% |
| Flaky tests | 0 |

## 4. Build Health

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Build
npm run build
```

## 5. Runtime Health

```bash
# Check running services
ps aux | grep -E "node|npm"

# Check ports
lsof -i -P -n | grep LISTEN

# Check disk space
df -h
```

## 6. Documentation Health

### Check for Staleness

- [ ] README.md reflects current state?
- [ ] ARCHITECTURE.md up to date?
- [ ] API docs match implementation?

## Health Report Template

```markdown
## Health Report - [DATE]

### Code
- Score: X/100
- Files over limit: X
- Pending refactors: X

### Dependencies
- Outdated: X
- Vulnerable: X

### Tests
- Passing: X/X
- Coverage: X%

### Build
- Type errors: X
- Lint errors: X

### Overall: [HEALTHY/WARNING/CRITICAL]
```

---

*"Healthy code is happy code."*
