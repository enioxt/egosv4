# GUARANI PREFERENCES & RULES

## 🔴 REGRA #0: NUNCA AFIRME 100% SEM VALIDAÇÃO

- **Proibido:** "Está funcionando perfeitamente", "100% completo"
- **Permitido:** "Implementado (aguardando testes)", "Pronto para validação"
- **NUNCA** marque uma task como completa sem confirmação do usuário

## 🎯 REGRA #1: MCP FIRST

Antes de qualquer ação manual, pergunte: "Existe ferramenta para isso?"

### Preferências de Ferramentas

| Tarefa | Preferência |
|--------|-------------|
| Planejamento | Sequential Thinking |
| Persistência | Memory |
| Arquivos | Filesystem tools |
| Pesquisa | Web search tools |

## 🧠 REGRA #2: SEQUENTIAL THINKING

Use pensamento estruturado para tarefas complexas:

| Situação | Thoughts Mínimos |
|----------|------------------|
| Task crítica | 7 |
| Task importante | 5 |
| Task regular | 3 |

## 📏 REGRA #3: LIMITES DE TAMANHO

| Tipo | Máximo |
|------|--------|
| Componente | 500 linhas |
| Página | 400 linhas |
| API Route | 300 linhas |

## 💾 REGRA #4: COMMITS

### Formato
```
tipo: descrição breve

corpo opcional
```

### Tipos
- `feat:` — Nova funcionalidade
- `fix:` — Correção de bug
- `docs:` — Documentação
- `chore:` — Manutenção
- `refactor:` — Melhoria de código
- `test:` — Testes

### Frequência
Commit a cada 30-60 minutos de trabalho.

## 🎨 REGRA #5: CÓDIGO LIMPO

### TypeScript
- Strict mode sempre
- Tipos explícitos para funções públicas
- Evitar `any`

### React
- Componentes funcionais
- Hooks para estado
- Props tipadas

### CSS
- TailwindCSS preferencial
- Evitar CSS inline
- Design tokens para cores

## 🚫 REGRA #6: PROIBIÇÕES

- Hardcode de secrets
- Commits sem teste local
- Arquivos > limite de linhas
- Deploy sem validação humana
- Ignorar erros de lint

---

*"Qualidade sobre velocidade. Clareza sobre brevidade."*
