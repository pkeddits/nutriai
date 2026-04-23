<div align="center">

<img src="frontend/favicon.svg" width="80" height="80" alt="NutriAI Logo"/>

# NutriAI

### Nutrição inteligente com IA — do protótipo estático ao SaaS em produção

[![Deploy](https://img.shields.io/badge/deploy-vercel-black?style=for-the-badge&logo=vercel)](https://nutriai-lovat.vercel.app)
[![Status](https://img.shields.io/badge/status-online-brightgreen?style=for-the-badge)](https://nutriai-lovat.vercel.app)
[![Stack](https://img.shields.io/badge/stack-HTML%20%2F%20JS%20%2F%20Supabase%20%2F%20Groq-F25C05?style=for-the-badge)](https://github.com/pkeddits/nutriai)
[![Licença](https://img.shields.io/badge/licença-MIT-blue?style=for-the-badge)](LICENSE)

**[🌐 Acessar o sistema](https://nutriai-lovat.vercel.app) · [📖 Como rodar](#-como-rodar-localmente)**

</div>

---

## 📖 Sobre o projeto

O **NutriAI** é um sistema web SaaS de nutrição com inteligência artificial desenvolvido como projeto da disciplina de **Análise e Projeto de Sistemas** — 3º semestre de ADS na Cruzeiro do Sul.

O projeto começou como um protótipo HTML estático com dados *hardcoded* e foi completamente reescrito **6 vezes** ao longo do desenvolvimento, até chegar ao que está em produção hoje: uma plataforma funcional com IA real, banco de dados, autenticação e deploy na nuvem, com **custo operacional de R$ 0/mês**.

> *"A diferença entre um código que funciona e um produto que entrega experiência real ao usuário."*

---

## ✨ Funcionalidades

| Módulo | Descrição |
|--------|-----------|
| 🏠 **Dashboard** | KPIs de macros do dia, streak de dias ativos, sugestões da IA, gráfico semanal |
| 🍽️ **Refeições** | Registro por tipo (café, almoço, lanche, jantar, ceia) com estimativa automática de calorias via IA |
| 📅 **Planner Semanal** | IA gera plano completo → preview → salvar em lote ou editar com IA |
| 🛒 **Lista de Compras** | IA gera lista organizada por categoria → preview → salvar tudo de uma vez |
| 📊 **Progresso** | Score nutricional 0-100, gráficos SVG de calorias e peso, histórico, análise por IA |
| 🤖 **IA Nutricional** | Chat, gerar dieta, receitas personalizadas, substituições, histórico de interações |
| 👤 **Perfil** | Dados físicos, objetivo, cálculo de TDEE via fórmula Mifflin-St Jeor |
| ⚙️ **Configurações** | Notificações, preferências, estatísticas reais, zona de perigo |
| 💬 **Chatbot flutuante** | Assistente contextual disponível em todas as páginas |
| 🔐 **Autenticação** | Login, cadastro, logout instantâneo, recuperação de senha por email |

---

## 🛠️ Tecnologias

```
Frontend          HTML5 · CSS3 · JavaScript ES6+ (vanilla, sem frameworks)
Banco de dados    Supabase (PostgreSQL gerenciado + Auth + Row Level Security)
Inteligência IA   Groq Cloud — Llama 3.3 70B com fallback de 4 modelos
Deploy            Vercel (frontend estático + serverless functions)
Versionamento     Git + GitHub
Custo mensal      R$ 0
```

**Por que essas escolhas?**

- **JavaScript vanilla** — aprender o DOM de verdade antes de abstrair. Cada linha foi escrita e entendida manualmente, sem depender de framework.
- **Supabase** — banco PostgreSQL gerenciado com autenticação JWT, RLS nativo e dashboard visual. Free tier generoso o suficiente pra produção real.
- **Groq Cloud** — IA gratuita com 50+ tokens/segundo de resposta. Sem cartão de crédito, sem limite diário que impactasse o uso.
- **Vercel Serverless** — elimina servidor backend rodando 24/7. O arquivo `frontend/api/ai.js` vira um endpoint automático a cada deploy.

---

## 🗺️ Linha do tempo — de protótipo a produto

```
┌─────────────────────────────────────────────────────────────────┐
│  v1 — Protótipo estático                                        │
│  HTML único · CSS inline · dados mockados/hardcoded             │
│  Nenhuma funcionalidade real. Chave da IA exposta no front-end. │
└────────────────────────────┬────────────────────────────────────┘
                             │ primeira integração real
┌────────────────────────────▼────────────────────────────────────┐
│  v2 — Supabase conectado                                        │
│  Login e cadastro funcionando com JWT                           │
│  Bug crítico: "Salvando..." infinito quando token expirava      │
└────────────────────────────┬────────────────────────────────────┘
                             │ refatoração completa
┌────────────────────────────▼────────────────────────────────────┐
│  v3 — Arquitetura modular                                       │
│  Código separado em módulos · SPA router criado do zero         │
│  Fix do spinner infinito via verificação de sessão              │
└────────────────────────────┬────────────────────────────────────┘
                             │ IA entra no projeto
┌────────────────────────────▼────────────────────────────────────┐
│  v4 — Groq Cloud integrado (paleta azul/roxo)                   │
│  Backend Node.js + Express · fallback de 4 modelos de IA        │
│  Primeiras respostas reais personalizadas com perfil do usuário  │
└────────────────────────────┬────────────────────────────────────┘
                             │ performance e UX
┌────────────────────────────▼────────────────────────────────────┐
│  v5 — Router com cancelamento de render                         │
│  Token de cancelamento · skeletons · timeout de queries         │
│  Watchdog de 8s com botão "tentar novamente"                    │
└────────────────────────────┬────────────────────────────────────┘
                             │ rebrand + deploy em produção
┌────────────────────────────▼────────────────────────────────────┐
│  v6 — Versão atual · no ar em nutriai-lovat.vercel.app          │
│  Paleta coral #F25C05 · backend migrado pra Vercel Serverless   │
│  Planner e lista de compras com preview da IA + salvar em lote  │
│  Chatbot flutuante · guias contextuais · configs separadas      │
│  Credenciais via env vars · custo: R$ 0/mês                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🐛 Bugs encontrados e soluções aplicadas

### Bug 1 — "Salvando..." infinito
**Sintoma:** botão travava sem feedback após algumas operações.
**Causa:** token JWT do Supabase expirava silenciosamente. A query aguardava autenticação que nunca vinha.
**Solução:** criação do `API.ensureSession()` — renova o token antes de cada operação, com timeout de 5s para não bloquear a interface.

---

### Bug 2 — Navegação travando após uso prolongado
**Sintoma:** depois de 5-10 minutos, clicar nos links do menu não carregava a página.
**Causa real identificada no console do navegador:**
```
Uncaught TypeError: Cannot read properties of null
  (reading 'parentElement') at ui.js:49
```
O código tentava acessar `.parentElement` de um elemento inexistente na tela de login. Como o listener era global (`document.addEventListener('click')`), **cada clique na página disparava o erro**, corrompendo o estado do router ao longo do tempo.
```javascript
// problema
const bell = $("tb-bell").parentElement  // explodia quando null

// solução
const bell = $("tb-bell")
if (bell && !bell.contains(e.target)) { ... }
```

---

### Bug 3 — Email de confirmação abrindo localhost
**Sintoma:** email de confirmação redirecionava para `localhost:3000` no dispositivo do usuário.
**Causa:** campo "Site URL" no Supabase estava com o valor do ambiente de desenvolvimento.
**Solução:** Supabase → Authentication → URL Configuration → Site URL → URL de produção.

---

### Bug 4 — Histórico da IA não salvava consistentemente
**Sintoma:** conversas às vezes não apareciam na aba Histórico.
**Causa:** o salvamento passava pelo `API.run()` que conflitava com o cache de sessão verificado recentemente.
**Solução:** `sb.from("ai_history").insert()` direto com `try/catch` próprio, sem bloquear a resposta principal da IA.

---

### Bug 5 — IA respondendo perguntas fora de nutrição
**Sintoma:** usuários conseguiam fazer a IA conversar sobre futebol, relacionamentos etc.
**Causa:** system prompt permissivo demais.
**Solução:** regras explícitas adicionadas ao prompt do sistema com recusa educada pra temas fora de nutrição.

---

## 🏛️ Arquitetura

```
nutriai/
├── frontend/                    ← deploy na Vercel
│   ├── api/                     ← serverless functions (endpoints automáticos)
│   │   ├── ai.js                ← chama Groq com fallback de 4 modelos
│   │   ├── env.js               ← serve credenciais via env vars em runtime
│   │   └── health.js            ← status: /api/health
│   ├── scripts/
│   │   ├── config.js            ← lê window.ENV (zero hardcode de chaves)
│   │   ├── state.js             ← estado global da aplicação
│   │   ├── api.js               ← wrapper Supabase com verificação de sessão
│   │   ├── ai.js                ← integração com /api/ai
│   │   ├── auth.js              ← login, cadastro, logout, recuperação de senha
│   │   ├── router.js            ← SPA hash router com cancelamento de render
│   │   ├── ui.js                ← helpers DOM, modais, toasts
│   │   ├── guide.js             ← guias contextuais + chatbot flutuante
│   │   └── pages/               ← uma página por arquivo
│   ├── styles/                  ← 4 arquivos CSS (auth, app, pages, landing)
│   ├── app.html                 ← SPA principal
│   ├── index.html               ← landing page pública
│   ├── favicon.svg
│   └── vercel.json              ← rewrite /env.js → /api/env
├── backend/                     ← apenas para rodar localmente
├── supabase_schema.sql          ← schema completo: tabelas, RLS, triggers
└── README.md
```

**Como as credenciais funcionam sem exposição:**

```
LOCAL                              PRODUÇÃO (Vercel)
─────────────────────────          ─────────────────────────────
frontend/env.js  (gitignored)      Painel Vercel → Env Variables
define window.ENV.*                SUPABASE_URL, SUPABASE_KEY,
        ↓                          GROQ_API_KEY, AI_ENDPOINT
config.js lê window.ENV                    ↓
                                   /api/env gera window.ENV
                                   dinamicamente em cada request
```

---

## 🚀 Como rodar localmente

**Pré-requisitos:** Node.js 18+ · conta [Supabase](https://supabase.com) · conta [Groq Cloud](https://console.groq.com)

```bash
# 1. Banco de dados
# Supabase → SQL Editor → cola supabase_schema.sql → Run
# Copia Project URL e anon key de Settings → API

# 2. Credenciais do frontend
cd frontend
cp env.js.example env.js
# Edita env.js com URL e anon key do Supabase

# 3. Backend local
cd ../backend
cp .env.example .env
# Edita .env com GROQ_API_KEY (console.groq.com/keys)
npm install
npm run dev
# → http://localhost:3000
```

---

## ☁️ Deploy (Vercel — gratuito)

```bash
# 1. vercel.com → Add New Project → importa pkeddits/nutriai
# 2. Root Directory: frontend
# 3. Framework: Other
# 4. Environment Variables:
#    SUPABASE_URL  SUPABASE_KEY  GROQ_API_KEY  AI_ENDPOINT=/api/ai
# 5. Deploy → pronto
```

Teste: `/api/health` deve retornar `{"ok":true,"ia":"configured"}`.

---

## 🔒 Segurança

- Credenciais fora do código — `env.js` no `.gitignore`, env vars na Vercel em produção
- RLS no Supabase — cada usuário acessa apenas seus próprios dados
- Chave Groq processada apenas na serverless function, nunca exposta no navegador
- JWT com refresh automático antes de cada operação crítica

---

## 📈 Roadmap

- [ ] Troca de tema (dark coral / dark azul / dark mint)
- [ ] Upload de foto de perfil
- [ ] PWA com suporte offline
- [ ] Painel para nutricionistas
- [ ] Integração com Apple Health / Google Fit
- [ ] Plano Premium com limites estendidos de IA

---

## 🐛 Troubleshooting

| Problema | Solução |
|----------|---------|
| "SUPABASE_URL não configurada" | `cp env.js.example env.js` e preenche |
| IA retorna erro 502 | Verifica `GROQ_API_KEY` nas env vars da Vercel |
| "Salvando..." trava | Roda `supabase_schema.sql` novamente |
| Email abre localhost | Supabase → Auth → URL Config → Site URL = URL Vercel |
| Página demora muito | Botão "🔄 Tentar novamente" aparece em 8s automaticamente |

---

<div align="center">

Desenvolvido por **Felipe Pereira Lima**

ADS · 3º Semestre · Cruzeiro do Sul · 2026

[![GitHub](https://img.shields.io/badge/github-pkeddits-181717?style=flat-square&logo=github)](https://github.com/pkeddits)

</div>
