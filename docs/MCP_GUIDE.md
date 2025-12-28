# 🎛️ MCP ORCHESTRATION GUIDE

**Version:** 1.0.0 | **Updated:** 2025-12-28

---

## 🎯 PHILOSOPHY: MCP FIRST

> **NEVER write manual logic if a Tool (MCP) exists.**
> The Agent is an **Orchestrator**, not a coder.

---

## 📋 MCP INVENTORY

### 🔴 CRITICAL (Always Active)

| MCP | Prefix | Use Case | Example |
|-----|--------|----------|---------|
| **sequential-thinking** | `mcp18_` | Planning, complex decisions | `mcp18_sequentialthinking({thought, thoughtNumber, totalThoughts})` |
| **memory** | `mcp13_` | Persist context between sessions | `mcp13_create_entities([{name, entityType, observations}])` |
| **filesystem** | `mcp7_` | Read/write files | `mcp7_read_text_file({path})` |
| **egos-core** | `mcp4_` | Tasks, patterns, knowledge | `mcp4_get_tasks_summary()` |

### 🟡 ON-DEMAND

| MCP | Prefix | Use Case | Activate When |
|-----|--------|----------|---------------|
| **supabase** | `mcp20_` | DB operations | Working with database |
| **exa** | `mcp5_` | Web search, code context | Need external info |
| **playwright** | - | Browser automation | E2E tests |
| **snyk** | - | Security scan | Before deploy |

---

## 🔵 EGOS-CORE TOOLS (30+)

```typescript
// TASKS
mcp4_add_task({category, title, priority})     // Add new task
mcp4_get_tasks_summary()                        // Get all tasks
mcp4_get_tasks_by_priority({priority})          // P0, P1, P2, COMPLETED
mcp4_search_tasks({keyword})                    // Search tasks
mcp4_update_task_status({task_pattern})         // Mark complete

// SYSTEM
mcp4_get_full_context()                         // Identity + Prefs + Arch
mcp4_get_identity()                             // Agent identity
mcp4_get_preferences()                          // Coding rules
mcp4_system_diagnostic()                        // Health check

// HANDOFF
mcp4_get_handoff_history({limit})               // Last N sessions
mcp4_validate_handoff({handoff_path})           // Quality check

// TELEMETRY
mcp4_search_telemetry_logs({limit, only_errors}) // Debug errors
```

---

## 🔄 ACTIVATION PROTOCOL

### When Starting Session

```
1. mcp4_get_full_context()        → Load identity
2. mcp4_get_handoff_history()     → Previous sessions
3. mcp4_get_tasks_summary()       → Current tasks
4. mcp18_sequentialthinking()     → Plan the session
```

### When MCP Not Available

```markdown
⚠️ **MCP ACTIVATION REQUIRED**

I need the **[MCP_NAME]** MCP to complete this task.
Please activate it in your IDE settings.
```

---

## 🎼 DECISION TREE: Which MCP?

```
Need to...

├── PLAN/THINK complex task?
│   └── mcp18_sequentialthinking
│
├── ACCESS the codebase?
│   ├── Read file → mcp7_read_text_file
│   ├── Write file → mcp7_write_file
│   └── Search → mcp7_search_files
│
├── DATABASE operation?
│   ├── Schema → mcp20_list_tables
│   ├── Query → mcp20_execute_sql
│   └── Migration → mcp20_apply_migration
│
├── EXTERNAL knowledge?
│   ├── Code examples → mcp5_get_code_context_exa
│   └── Web search → mcp5_web_search_exa
│
├── REMEMBER across sessions?
│   ├── Save entity → mcp13_create_entities
│   ├── Add info → mcp13_add_observations
│   └── Retrieve → mcp13_search_nodes
│
├── MANAGE tasks?
│   ├── List → mcp4_get_tasks_summary
│   ├── Add → mcp4_add_task
│   └── Complete → mcp4_update_task_status
│
└── DEPLOY?
    ├── Vercel → vercel MCP
    └── Render → render MCP
```

---

## 🧠 SEQUENTIAL THINKING: MANDATORY

| Situation | Thoughts |
|-----------|----------|
| P0 (Critical) | 7 |
| P1 (Important) | 5 |
| P2/General | 3 |
| New file | 3 |
| Migration | 5 |

### Auto-Triggers

Start ST when detecting: "criar", "novo", "migração", "refatorar", "P0", "P1"

---

## 📊 MCP USAGE METRICS

| MCP | Daily Calls | Performance |
|-----|-------------|-------------|
| sequential-thinking | ~20 | Fast |
| memory | ~10 | Fast |
| filesystem | ~50 | Fast |
| egos-core | ~30 | Fast |
| supabase | ~15 | Medium |
| exa | ~5 | Slow (external API) |

---

## 🚨 DEPRECATED TOOLS

| Old Tool | Replacement | Reason |
|----------|-------------|--------|
| `mcp4_search_web` | `mcp5_web_search_exa` | Exa is state of the art |
| `Context7` | `mcp13_*` (Memory Graph) | Obsolete |

### Golden Rule

```
Web Search → ALWAYS mcp5_web_search_exa
Memory     → ALWAYS mcp13_* (Memory Graph)
Files      → ALWAYS mcp7_* (for restricted files)
```

---

## 🔧 CREATING CUSTOM MCPs

Add to `mcp-servers/egos-core/` when:

1. **Repetitive Pattern**: Same sequence >3 times
2. **External Integration**: New API/service
3. **Complex Logic**: Multi-step atomic process

### Request Template

```markdown
## 📦 NEW MCP TOOL REQUEST

**Tool Name:** `mcp4_[action]_[resource]`
**Purpose:** [What it does]
**Input:** { "param1": "type" }
**Output:** [Expected return]
**Priority:** P0/P1/P2
```

---

*Remember: The best code is no code. Use MCPs.*
