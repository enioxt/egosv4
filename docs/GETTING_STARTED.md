# Getting Started with EGOSv4

> Set up the framework in 5 minutes

## Prerequisites

- Node.js 18+
- npm or pnpm
- Git

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/enioxt/egosv4.git
cd egosv4
```

### 2. Explore the Structure

```
egosv4/
├── AGENTS.md           # AI agent configuration
├── guarani/            # Identity & coding rules
├── workflows/          # Automation workflows
├── tools/              # Utilities (code health, etc)
├── cortex/             # Personal knowledge system
└── docs/               # Documentation
```

## Using the Framework

### For AI Agents

Add to your agent's context:

```markdown
Follow rules in AGENTS.md
Use workflows from /workflows
Apply standards from guarani/PREFERENCES.md
```

### For Developers

#### Start with Cortex

```bash
cd cortex
npm install
npm run db:generate
npm run dev
```

#### Run Code Health Monitor

```bash
npx tsx tools/code-health-monitor.ts ./your-project
```

## Key Concepts

### 1. MCP-First

Always prefer using MCP tools over writing manual code.

```typescript
// ❌ Don't write manual file reading
const content = fs.readFileSync(file);

// ✅ Use MCP tools when available
mcp7_read_file({ path: file });
```

### 2. SSOT (Single Source of Truth)

One location for each type of information:
- Tasks → TASKS.md
- Identity → guarani/IDENTITY.md
- Rules → guarani/PREFERENCES.md

### 3. Workflows

Standardized processes:
- `/start` — Begin a session
- `/end` — Finalize a session
- `/debug` — Troubleshoot issues

## Next Steps

1. Read [ARCHITECTURE.md](ARCHITECTURE.md) for system overview
2. Explore [MCP_GUIDE.md](MCP_GUIDE.md) for tool usage
3. Check [guarani/PREFERENCES.md](../guarani/PREFERENCES.md) for coding standards

## Need Help?

- Open an issue on GitHub
- Check existing documentation
- Read the source code (it's well documented)

---

*Welcome to EGOSv4!*
