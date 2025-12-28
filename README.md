# EGOSv4 — Ethical Guardian Operating System

> **Framework AI-first para desenvolvimento de aplicações inteligentes.**  
> Transforme como você trabalha com AI agents — menos código, mais resultados.

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](LICENSE)
[![MCP Tools](https://img.shields.io/badge/MCP%20Tools-15%2B-green.svg)](#-mcps-incluídos)

---

## 🎯 O Que é o EGOSv4?

EGOSv4 é um **framework para AI Agents** que resolve problemas reais de desenvolvimento:

### ❌ Sem EGOS (Problema)

```
Developer: "AI, crie um dashboard"
AI: Gera 500 linhas, estilo inconsistente, não segue padrões
Developer: Refaz tudo manualmente
```

### ✅ Com EGOS (Solução)

```
Developer: "AI, crie um dashboard"
AI: Lê PREFERENCES.md → Usa componentes existentes → Segue design system
    → 50 linhas, consistente, pronto para produção
```

---

## 🌟 Por Que Usar?

| Benefício | Descrição | Impacto Real |
|-----------|-----------|:------------:|
| **Consistência** | AI segue suas regras sempre | -80% retrabalho |
| **Memória** | Contexto persiste entre sessões | Zero repetição |
| **Automação** | Workflows pré-definidos (/start, /end) | 10min/dia economizados |
| **Qualidade** | Pre-commit + health monitor | Bugs detectados antes |
| **Escalável** | Funciona com qualquer projeto | Do side project à produção |

---

## 🚀 Casos de Uso Reais

### 1. **Second Brain Pessoal (Cortex)**
```bash
# Daemon que monitora suas pastas
# Extrai insights automaticamente
# Busca semântica no seu conhecimento
cd cortex && npm run dev
```

### 2. **Sistema de Investigação (Intelink)**
- Dashboard policial com grafos de relacionamento
- RLS (Row Level Security) por usuário
- Widgets drag-and-drop

### 3. **Qualquer Projeto Next.js**
```bash
# Copie o guarani/ para seu projeto
cp -r guarani/ seu-projeto/
# AI agora segue suas regras
```

---

## 📦 O Que Está Incluído

```
egosv4/
├── AGENTS.md              # Config universal (Cursor, Windsurf, Claude Code)
├── .windsurfrules         # Regras específicas Windsurf
├── guarani/
│   ├── IDENTITY.md        # Quem o AI é
│   └── PREFERENCES.md     # Como codificar
├── workflows/
│   ├── start.md           # Iniciar sessão
│   ├── end.md             # Finalizar sessão
│   ├── debug.md           # Troubleshooting
│   └── health.md          # Health check
├── cortex/                # Sistema de conhecimento pessoal
├── tools/
│   ├── code-health-monitor.ts
│   └── pre-commit         # Hook de qualidade
├── mcp-servers/           # MCPs customizados
│   └── egos-core/         # 30+ tools
└── docs/
    ├── GETTING_STARTED.md
    ├── ARCHITECTURE.md
    └── MCP_GUIDE.md
```

---

## 🛠️ MCPs Incluídos

### Core (Sempre Ativos)

| MCP | Prefixo | O Que Faz | Uso Real |
|-----|---------|-----------|----------|
| **Sequential Thinking** | `mcp18_` | Planejamento estruturado | Antes de P0/P1, criar arquivos |
| **Memory** | `mcp13_` | Persistência entre sessões | Salvar decisões, contexto |
| **Filesystem** | `mcp7_` | Operações de arquivo | Arquivos restritos |
| **egos-core** | `mcp4_` | Tasks, diagnóstico, identity | 30+ tools do framework |

### On-Demand

| MCP | O Que Faz | Quando Usar |
|-----|-----------|-------------|
| **Exa** | Pesquisa web/code | Buscar exemplos, docs |
| **Supabase** | Operações de banco | Schema, queries, migrações |
| **Playwright** | Browser automation | Testes E2E, validação visual |
| **Snyk** | Security scan | Antes de deploy |

### egos-core Tools (30+)

```typescript
// TASKS
mcp4_add_task({category, title, priority})
mcp4_get_tasks_summary()
mcp4_update_task_status({task_pattern})

// SYSTEM
mcp4_system_diagnostic()      // Health check
mcp4_get_full_context()       // Identity + Prefs + Arch

// HANDOFF
mcp4_get_handoff_history()    // Sessões anteriores
mcp4_validate_handoff()       // Quality check
```

---

## 🚀 Quick Start

### Opção 1: Usar em Projeto Existente

```bash
# Clone apenas o guarani/
git clone --depth 1 https://github.com/enioxt/egosv4.git
cp -r egosv4/guarani/ seu-projeto/.guarani/
cp egosv4/AGENTS.md seu-projeto/

# Pronto! AI agora segue suas regras
```

### Opção 2: Usar o Cortex

```bash
git clone https://github.com/enioxt/egosv4.git
cd egosv4/cortex
npm install
npm run db:generate
npm run dev
```

### Opção 3: Framework Completo

```bash
git clone https://github.com/enioxt/egosv4.git
cd egosv4

# Instalar pre-commit hook
cp tools/pre-commit .git/hooks/
chmod +x .git/hooks/pre-commit

# Instalar MCPs (Windsurf)
# Settings → MCP Servers → Add from mcp-servers/
```

---

## 📋 8 Mandamentos

Regras que o AI **sempre** segue:

1. **START** → `/start` antes de trabalhar
2. **READ** → "Já Concluído" = NÃO REIMPLEMENTAR
3. **SSOT** → Tasks APENAS em `TASKS.md`
4. **THINK** → Sequential Thinking (P0=7, P1=5, P2=3 thoughts)
5. **PORT** → Intelink=3001, EGOS=3000
6. **COMMIT** → Convencional cada 30-60min
7. **SIZE** → 500/componente, 400/página, 300/API
8. **END** → `/end` ao finalizar

---

## 🔧 Pre-Commit Hook

Qualidade automática em cada commit:

```bash
🛡️  GUARANI PRE-COMMIT GOVERNANCE
════════════════════════════════════════════
✅ Arquivos Guarani presentes
✅ Mensagem convencional (feat:/fix:/chore:)
✅ TASKS.md atualizado (commits grandes)
❌ Secrets detectados → BLOQUEADO
════════════════════════════════════════════
```

---

## 🤝 Contribuindo

**Modelo de contribuição voluntária:**
- Use livremente (AGPL-3.0)
- Derive valor? Contribua de volta
- Código, docs, ou financeiro

Veja [CONTRIBUTING.md](CONTRIBUTING.md).

---

## 📜 Licença

[AGPL-3.0](LICENSE) — Use livremente, contribua de volta.

---

## 🔗 Links

- **Framework:** [github.com/enioxt/egosv4](https://github.com/enioxt/egosv4)
- **Intelink:** [github.com/enioxt/intelink](https://github.com/enioxt/intelink)
- **Autor:** [@enioxt](https://github.com/enioxt)

---

*"The best code is no code. Use MCPs. One source of truth."*
