// backend/services/ai.service.js
// ══════════════════════════════════════════════════════════
//  Groq Cloud — IA gratuita, rápida, funciona no Brasil.
//  Chave em 30s: https://console.groq.com/keys
//  Modelo padrão: llama-3.3-70b-versatile (melhor PT-BR em 2026)
// ══════════════════════════════════════════════════════════

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Modelos gratuitos da Groq em ordem de qualidade
const MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "gemma2-9b-it",
  "mixtral-8x7b-32768"
];

function buildSystem(tipo, perfil) {
  let s = `Você é o NutriAI, assistente de nutrição e alimentação saudável.
Responda SEMPRE em português brasileiro, nunca em inglês.
Seja prático, direto e motivador. Use **negrito** em pontos-chave, • em listas.
Seja conciso mas completo.`;

  const focus = {
    nutricao:     "Foque em dados nutricionais precisos: calorias, proteínas, carboidratos, gorduras, fibras.",
    receita:      "Dê receitas práticas com ingredientes, modo de preparo e calorias estimadas.",
    dieta:        "Crie planos alimentares realistas baseados no perfil do usuário.",
    planner:      "Monte planejamento semanal variado com pratos específicos para cada refeição.",
    compras:      "Liste itens por categoria com quantidades para 1 semana.",
    substituicao: "Explique alternativas saudáveis com benefícios nutricionais.",
  };
  if (focus[tipo]) s += `\nFoco: ${focus[tipo]}`;

  if (perfil && typeof perfil === "object") {
    const p = [];
    if (perfil.nome)            p.push(`Nome: ${perfil.nome}`);
    if (perfil.peso)            p.push(`Peso: ${perfil.peso}kg`);
    if (perfil.altura)          p.push(`Altura: ${perfil.altura}cm`);
    if (perfil.idade)           p.push(`Idade: ${perfil.idade}`);
    if (perfil.sexo)            p.push(`Sexo: ${perfil.sexo}`);
    if (perfil.objetivo)        p.push(`Objetivo: ${String(perfil.objetivo).replace(/_/g," ")}`);
    if (perfil.nivel_atividade) p.push(`Atividade: ${perfil.nivel_atividade}`);
    if (perfil.meta_calorias)   p.push(`Meta: ${perfil.meta_calorias}kcal/dia`);
    if (p.length) s += `\nPerfil: ${p.join(" | ")}. Personalize a resposta.`;
  }
  return s;
}

async function callGroq(apiKey, model, system, prompt) {
  const resp = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user",   content: prompt }
      ],
      max_tokens:  1600,
      temperature: 0.7,
      top_p:       0.95,
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    const msg = err?.error?.message || `HTTP ${resp.status}`;
    const e = new Error(msg);
    e.status = resp.status;
    throw e;
  }
  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Resposta vazia do modelo");
  return text;
}

async function askAI({ prompt, tipo, perfil }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    const e = new Error("GROQ_API_KEY não configurada no .env. Crie em https://console.groq.com/keys");
    e.status = 500; throw e;
  }

  const system = buildSystem(tipo, perfil);
  const envModel = process.env.AI_MODEL;
  const order = envModel ? [envModel, ...MODELS.filter(m => m !== envModel)] : MODELS;

  let lastErr;
  for (const model of order) {
    try {
      console.log(`[AI] Groq → ${model}`);
      const text = await callGroq(apiKey, model, system, prompt);
      console.log(`[AI] OK ${model} (${text.length} chars)`);
      return { resposta: text, model };
    } catch (e) {
      console.warn(`[AI] ${model} falhou: ${e.status || "?"} - ${e.message}`);
      lastErr = e;
      if (e.status === 401) throw e;         // chave inválida, não tenta outros
      if (e.status === 429) throw e;         // rate limit, não adianta
    }
  }
  throw lastErr || new Error("Todos os modelos falharam");
}

module.exports = { askAI };
