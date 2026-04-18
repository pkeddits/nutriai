# NutriAI 🥗

Sistema SaaS de nutrição com IA, 100% deploy gratuito na Vercel.

**Stack:** HTML/CSS/JS · Vercel Serverless Functions · Supabase · Groq Cloud

---

## ✨ Funcionalidades

- Dashboard com KPIs de macros, streak, análise semanal
- Refeições com cards visuais por tipo + IA estimando calorias
- Planner Semanal com preview IA + salvar em lote + editar com IA
- Lista de Compras com preview IA + salvar tudo de uma vez
- Progresso com gráficos, score nutricional 0-100, histórico de peso
- IA Nutricional com 5 modos (chat, dieta, receitas, substituições, histórico)
- Perfil com cálculo TDEE (Mifflin-St Jeor)
- Configurações com estatísticas, notificações, preferências
- Chatbot flutuante contextual em todas as páginas
- Esqueci minha senha · Logout instantâneo · Navegação SPA

---

## 📁 Estrutura

```
nutriai/
├── frontend/               ← tudo roda aqui no deploy Vercel
│   ├── api/                ← serverless functions
│   │   ├── ai.js           ← chama Groq (substitui o backend Express)
│   │   ├── env.js          ← injeta credenciais em runtime
│   │   └── health.js       ← endpoint de teste
│   ├── scripts/            ← JS do app (SPA)
│   ├── styles/             ← CSS
│   ├── app.html · index.html
│   ├── env.js.example      ← template de credenciais
│   ├── vercel.json         ← config da Vercel
│   └── package.json
├── backend/                ← só pra rodar LOCAL com Express
│   └── ...
├── supabase_schema.sql
└── README.md
```

**Em produção**, o `backend/` **não é usado** — a Vercel lê o `frontend/api/` e cria endpoints automaticamente.

---

## 🚀 Setup Local (15 min)

### 1. Banco — Supabase
1. [supabase.com](https://supabase.com) → New project
2. SQL Editor → cole `supabase_schema.sql` → Run → deve dar `SETUP OK ✓`
3. Settings → API → copie Project URL e anon key

### 2. IA — Groq Cloud
1. [console.groq.com/keys](https://console.groq.com/keys) → entre com Google/GitHub
2. Create API Key → copia (começa com `gsk_`)

### 3. Frontend — credenciais
```bash
cd frontend
copy env.js.example env.js
```
Edite `env.js` e preencha com URL + anon key do Supabase.

### 4. Backend local (opcional)
```bash
cd backend
copy .env.example .env
```
Edite `.env` e cole `GROQ_API_KEY=gsk_...`. Depois:
```bash
npm install
npm run dev
```

### 5. Acesse
- http://localhost:3000 — landing
- http://localhost:3000/app.html — sistema

---

## ☁️ Deploy em produção — tudo na Vercel (grátis)

### 1. Criar projeto
1. [vercel.com](https://vercel.com) → Login with GitHub
2. **Add New Project** → importe `seu-usuario/nutriai`
3. **Root Directory:** `frontend`
4. **Framework Preset:** Other

### 2. Environment Variables
Adicione antes de fazer deploy:

| Nome | Valor |
|---|---|
| `SUPABASE_URL` | URL do Supabase |
| `SUPABASE_KEY` | anon key do Supabase |
| `AI_ENDPOINT` | `/api/ai` |
| `GROQ_API_KEY` | `gsk_sua_chave` |

### 3. Deploy
Clique **Deploy**, aguarde ~1 min.

### 4. Testar
- Health: `https://seu-projeto.vercel.app/api/health` → deve retornar JSON com `"ia":"configured"`
- App: `https://seu-projeto.vercel.app/app.html`

### 5. Ajustar Supabase
Supabase → Authentication → URL Configuration:
- **Site URL:** `https://seu-projeto.vercel.app`
- **Redirect URLs:** adicione `https://seu-projeto.vercel.app/app.html`

---

## 🔒 Segurança
- Credenciais **nunca** hardcoded no código
- `env.js` local (gitignored) + Vercel Environment Variables em produção
- RLS Supabase em todas as tabelas
- Groq key só no servidor (serverless), nunca no navegador

---

## 🐛 Troubleshooting

| Problema | Solução |
|---|---|
| "SUPABASE_URL não configurada" | Crie `frontend/env.js` (local) ou adicione env vars (Vercel) |
| `/api/health` retorna "ia":"missing" | Adicione `GROQ_API_KEY` em Environment Variables |
| Erro 404 no `/app.html` | Root Directory na Vercel deve ser `frontend` |
| "Salvando..." infinito | Rode `supabase_schema.sql` de novo |

---

**Desenvolvido por Felipe Pereira Lima · ADS — Cruzeiro do Sul · 2026**
