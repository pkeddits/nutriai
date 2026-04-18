// ══════════════════════════════════════════════════════════
// config.js — carrega credenciais SEM hardcode no código.
// Em DEV local: lê de /env.js (arquivo local, gitignored).
// Em PROD Vercel: lê de /env.js gerado dinamicamente pela API.
// ══════════════════════════════════════════════════════════

// As credenciais vêm de window.ENV — veja env.js
const SUPABASE_URL = (window.ENV && window.ENV.SUPABASE_URL)  || "";
const SUPABASE_KEY = (window.ENV && window.ENV.SUPABASE_KEY)  || "";
const AI_ENDPOINT  = (window.ENV && window.ENV.AI_ENDPOINT)   || "/api/ai";

// Metas padrão enquanto não há perfil
const DEFAULTS = {
  calorias:     1800,
  proteinas:    90,
  carboidratos: 200,
  gorduras:     60,
  fibras:       30,
};

// Validação com mensagem clara
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("⚠️ SUPABASE_URL ou SUPABASE_KEY não configuradas. Veja env.js.example");
}

// ═══════════ CLIENTE SUPABASE ═══════════
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession:    true,
    autoRefreshToken:  true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
  global: {
    fetch: (url, opts = {}) => {
      const ctrl = new AbortController();
      const id = setTimeout(() => ctrl.abort(), 25000);
      return fetch(url, { ...opts, signal: ctrl.signal })
        .finally(() => clearTimeout(id));
    },
  },
});
