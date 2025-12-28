# Cortex — Personal Knowledge System

> Your AI-powered second brain. Watches files, extracts insights, builds knowledge.

## 🧠 What is Cortex?

Cortex is a daemon that:
1. **Watches** your folders for new/changed files
2. **Extracts** text from various formats (txt, md, pdf, docx)
3. **Analyzes** content using AI with different "lenses"
4. **Stores** insights in a local SQLite database
5. **Serves** your knowledge via CLI, MCP, or REST API

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Start the daemon
npm run dev

# Or use the CLI
npm run cli status
npm run cli search "your query"
```

## 📁 Architecture

```
cortex/
├── src/
│   ├── daemon/     # File watcher + processing
│   ├── lib/        # Core utilities
│   ├── cli/        # Command line interface
│   ├── mcp/        # MCP server (for AI agents)
│   └── api/        # REST API server
├── prisma/
│   └── schema.prisma
└── tests/
```

## 🔧 Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### Watch Sources

Edit `~/.config/cortex/config.json`:

```json
{
  "watchSources": [
    {
      "id": "notes",
      "path": "~/Documents/Notes",
      "lens": "general",
      "recursive": true,
      "extensions": [".md", ".txt"]
    }
  ]
}
```

## 🎭 Lenses

Different AI perspectives for analysis:

| Lens | Focus |
|------|-------|
| `general` | Balanced overview |
| `philosopher` | Deep meaning, implications |
| `architect` | Structure, patterns, systems |
| `analyst` | Data, facts, logic |
| `somatic` | Emotions, felt sense |

## 🛠️ Available Interfaces

### CLI
```bash
npm run cli status    # Daemon status
npm run cli search    # Search insights
npm run cli reindex   # Reindex all files
```

### MCP Server (for AI agents)
```bash
npm run mcp
```

Tools: `cortex_status`, `cortex_search`, `cortex_insights`, `cortex_files`

### REST API
```bash
npm run api   # Starts on port 3008
```

Endpoints:
- `GET /health`
- `GET /status`
- `GET /insights`
- `GET /search?q=...`
- `GET /files`

## 📊 Database

Uses SQLite with Prisma ORM. Location: `~/.local/share/cortex/cortex.db`

### Models
- **SourceFile**: Tracked files
- **Insight**: Extracted knowledge
- **InsightLink**: Connections between insights

## 🧪 Testing

```bash
npm test        # Run all tests
npm test:watch  # Watch mode
```

## 📜 License

Part of EGOSv4 — AGPL-3.0
