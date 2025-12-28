# EGOSv4 Architecture

> System overview and design principles

## 🏗️ High-Level Structure

```
┌─────────────────────────────────────────────────────┐
│                    EGOSv4 FRAMEWORK                 │
├─────────────────────────────────────────────────────┤
│  GUARANI LAYER (Identity & Rules)                   │
│  ├── IDENTITY.md (Who the AI is)                    │
│  ├── PREFERENCES.md (How to code)                   │
│  └── Standards (Design, Components)                 │
├─────────────────────────────────────────────────────┤
│  WORKFLOW LAYER (Automation)                        │
│  ├── /start (Session initialization)               │
│  ├── /end (Session finalization)                   │
│  └── /debug, /health, etc.                         │
├─────────────────────────────────────────────────────┤
│  CORTEX LAYER (Knowledge System)                    │
│  ├── Daemon (File watcher + processor)             │
│  ├── MCP Server (AI agent interface)               │
│  ├── REST API (HTTP interface)                     │
│  └── CLI (Command line)                            │
├─────────────────────────────────────────────────────┤
│  TOOLS LAYER (Utilities)                            │
│  ├── code-health-monitor                           │
│  └── (extensible)                                  │
└─────────────────────────────────────────────────────┘
```

## 🎯 Core Principles

### 1. MCP-First

```
PRINCIPLE: Use tools before writing code

If a tool exists → Use it
If no tool exists → Consider creating one
Only then → Write manual code
```

### 2. SSOT (Single Source of Truth)

| Information Type | Location |
|------------------|----------|
| AI Identity | guarani/IDENTITY.md |
| Coding Rules | guarani/PREFERENCES.md |
| Workflows | workflows/*.md |
| Knowledge | cortex/cortex.db |

### 3. Human-in-the-Loop

```
RULE: Never claim 100% without human validation

AI completes task → Marks as "ready for review"
Human validates → Marks as "complete"
```

## 🧠 Cortex Architecture

### Data Flow

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  Files  │───▶│ Watcher │───▶│Analyzer │───▶│   DB    │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
                                   │
                              ┌────┴────┐
                              │   LLM   │
                              └─────────┘
```

### Components

| Component | Responsibility |
|-----------|---------------|
| **Watcher** | Monitors folders for file changes |
| **Extractor** | Extracts text from files (txt, md, pdf, docx) |
| **Analyzer** | Uses LLM to extract insights |
| **Storage** | SQLite database via Prisma |
| **Dedup** | Prevents duplicate processing |

### Interfaces

```
CLI ───────────▶ ┌─────────┐
MCP Server ────▶ │  CORE   │ ◀──▶ Database
REST API ──────▶ └─────────┘
```

## 🔧 Tool Layer

### Code Health Monitor

```
INPUT: Codebase directory
PROCESS:
  1. Scan all .ts/.tsx/.js files
  2. Count lines, TODOs, FIXMEs
  3. Check thresholds
  4. Calculate health score
OUTPUT: Report + telemetry
```

## 📐 Design Decisions

### Why SQLite?

- **Portable**: Single file, no server
- **Fast**: Local reads are instant
- **Simple**: No configuration needed
- **Reliable**: ACID compliant

### Why Prisma?

- **Type-safe**: Full TypeScript support
- **Migrations**: Schema versioning
- **Query builder**: No raw SQL needed

### Why MCP?

- **Standard**: Works with multiple AI systems
- **Discoverable**: Tools are self-documenting
- **Composable**: Tools can call other tools

## 🔐 Security Model

### Principles

1. **No hardcoded secrets** — Use environment variables
2. **Local-first** — Data stays on your machine
3. **Audit trail** — Telemetry for tracking
4. **Minimal permissions** — Only access what's needed

### Sensitive Data Handling

```
.env files → Never committed
API keys → Environment only
Database → Local storage (~/.local/share/cortex/)
```

## 🔄 Extension Points

### Adding a New Workflow

1. Create `workflows/your-workflow.md`
2. Follow the template format
3. Document when to use it

### Adding a New Tool

1. Create `tools/your-tool.ts`
2. Export functions
3. Document usage

### Adding to Cortex

1. New extractor → `cortex/src/lib/extractors/`
2. New lens → Update `analyzer.ts`
3. New API → `cortex/src/api/`

---

*"Simple, composable, extensible."*
