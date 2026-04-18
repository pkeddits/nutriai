# NutriAI 🥗

Sistema SaaS de nutrição com IA real, desenvolvido como projeto de ADS (Análise e Desenvolvimento de Sistemas).

**Stack:** HTML/CSS/JS vanilla · Node.js + Express · Supabase · Groq Cloud

---

## ✨ Funcionalidades

- **Dashboard** com KPIs de macros, refeições do dia, análise semanal, streak
- **Refeições** com cards visuais por tipo (Café, Almoço, Lanche, Jantar, Ceia) e IA que estima calorias
- **Planner Semanal** com geração por IA (preview + salvar em lote + editar com IA)
- **Lista de Compras** com geração por IA organizada por categoria
- **Progresso** com gráficos SVG, score nutricional 0-100, histórico de peso
- **IA Nutricional** com 5 modos: chat, gerar dieta, receitas, substituições, histórico
- **Perfil** com cálculo TDEE/Mifflin-St Jeor
- **Configurações** com preferências e estatísticas
- **Chatbot flutuante** contextual em todas as páginas
- **Guias dismissíveis** explicando cada funcionalidade
- Esqueci minha senha · Notificações inteligentes · Logout instantâneo

---

## 🚀 Setup Local

### 1. Banco de dados — Supabase
1. [supabase.com](https://supabase.com) → **New project** → aguarde ~2 min
2. **SQL Editor** → cole `supabase_schema.sql` → **Run**
3. **Settings → API** → copie **Project URL** e **anon public** key

### 2. IA — Groq Cloud
1. [console.groq.com/keys](https://console.groq.com/keys) → entre com Google/GitHub
2. **Create API Key** → copie (começa com `gsk_`)

### 3. Frontend — credenciais
```bash
cd frontend
cp env.js.example env.js      # Windows: copy env.js.example env.js
```
Edite `env.js` e preencha suas credenciais do Supabase.

### 4. Backend
```bash
cd backend
cp .env.example .env          # Windows: copy .env.example .env
```
Edite `.env` e cole `GROQ_API_KEY=gsk_sua_chave`. Depois:
```bash
npm install
npm run dev
```

### 5. Acesse
- Landing: http://localhost:3000
- Sistema: http://localhost:3000/app.html

---

## ☁️ Deploy em produção (Vercel + Railway)

### Backend → Railway
1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
2. **Root Directory:** `backend`
3. **Variables:**
   - `GROQ_API_KEY` → sua chave
   - `NODE_ENV` → `production`
   - `FRONTEND_URL` → URL Vercel (colocar depois)
4. **Settings → Networking → Generate Domain** → copie URL

### Frontend → Vercel
1. [vercel.com](https://vercel.com) → **Add New Project** → importe o repo
2. **Root Directory:** `frontend` · **Framework:** Other
3. **Environment Variables** (clique Add em cada uma):
   - `SUPABASE_URL` → URL do Supabase
   - `SUPABASE_KEY` → anon key do Supabase
   - `AI_ENDPOINT` → URL Railway + `/api/ai` (ex: `https://nutriai.up.railway.app/api/ai`)
4. **Deploy**

### Ajustes finais
- Railway → Variables → atualize `FRONTEND_URL` com a URL do Vercel
- Supabase → Auth → URL Configuration → adicione as URLs da Vercel em **Site URL** e **Redirect URLs**

---

## 🔒 Como as credenciais funcionam

Este projeto **não** faz hardcode de chaves no código:

- **Local:** você cria `frontend/env.js` (gitignored) que injeta `window.ENV.*`
- **Vercel:** environment variables do painel são servidas via `/api/env` (serverless function). O arquivo `vercel.json` faz rewrite `/env.js → /api/env` automaticamente

Assim o repositório pode ficar **público** sem risco de expor chaves.

---

## 🐛 Troubleshooting

| Problema | Solução |
|---|---|
| "SUPABASE_URL ou KEY não configuradas" | Crie `frontend/env.js` a partir do `.example` |
| "IA indisponível" | Verifique `GROQ_API_KEY` no `.env` do backend |
| "Salvando..." infinito | Execute `supabase_schema.sql` novamente |
| Deploy Vercel dá 404 em `/app.html` | Certifique que Root Directory é `frontend` |
| CORS error em produção | Atualize `FRONTEND_URL` no Railway com a URL exata do Vercel |

---

**Desenvolvido por Felipe Pereira Lima · ADS — Cruzeiro do Sul · 2026**
