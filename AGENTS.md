# AGENTS.md — EGOSv4 Universal Agent Configuration

> **VERSION:** 1.0.0 | **UPDATED:** 2025-12-28
> Open Standard for AI Coding Agents (Cursor, Windsurf, Claude Code, Copilot, Roo Code, Devin)

---

## 🎯 Project Overview

**Project:** EGOSv4 (Ethical Guardian Operating System v4)
**Architecture:** MCP-FIRST + AGENTS.md + Workflows

## 🏗️ Framework Structure

```
EGOSv4/
├── guarani/           # Agent identity & preferences
├── workflows/         # Reusable automation workflows
├── tools/             # Framework utilities
├── templates/         # App boilerplates
└── docs/              # Documentation
```

## 🛠️ Tech Stack

- **Frontend:** Next.js 15 (App Router), React 18, TailwindCSS, Shadcn/UI
- **Backend:** Next.js API Routes
- **Database:** Supabase PostgreSQL / SQLite
- **AI:** OpenRouter, OpenAI, Anthropic

## ✅ Coding Standards

### Must Do
- Use TypeScript strict mode
- Follow conventional commits: `feat:`, `fix:`, `chore:`, `docs:`
- Keep components < 500 lines, pages < 400 lines, APIs < 300 lines
- Use existing components before creating new ones
- Run Sequential Thinking before complex tasks

### Don't Do
- Never hardcode API keys or secrets
- Never mark tasks as complete without human validation
- Never create unnecessary files
- Never deploy without local testing

## 🔧 MCP Tools

| Tool | Use Case |
|------|----------|
| Sequential Thinking | Planning, complex decisions |
| Memory | Persist context between sessions |
| Filesystem | Read/write files |
| Code Health | Quality telemetry |

## 📁 Key Files Reference

| Purpose | File |
|---------|------|
| Agent Identity | `guarani/IDENTITY.md` |
| Coding Rules | `guarani/PREFERENCES.md` |
| Session Start | `workflows/start.md` |
| Session End | `workflows/end.md` |

## 🚀 Session Protocol

### Start Session
```
/start
```
- Load context
- Run health check
- Validate tools

### End Session
```
/end
```
- Generate handoff report
- Update memory
- Commit changes

## ⚠️ Critical Rules

1. **MCP First:** Never write manual logic if an MCP tool exists
2. **SSOT:** Single Source of Truth for everything
3. **Human Validation:** Never claim 100% without user testing
4. **Commit Discipline:** Conventional commits
5. **Size Limits:** Component < 500, Page < 400, API < 300 lines

---

*"The best code is no code. Use MCPs. One source of truth."*
