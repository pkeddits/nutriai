// frontend/api/ai.js — Vercel Serverless Function
// Substitui o backend Express. Lê process.env do painel Vercel.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "gemma2-9b-it",
  "mixtral-8x7b-32768",
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
    if (perfil.objetivo)        p.push(`Objetivo: ${String(perfil.objetivo).replace(/_/g, " ")}`);
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
        { role: "user",   content: prompt },
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

// Handler Vercel (req/res estilo Node.js http)
export default async function handler(req, res) {
  // CORS liberado (mesma origem, mas por segurança)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { prompt, tipo, perfil } = req.body || {};

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "Campo 'prompt' obrigatório." });
    }
    if (prompt.length > 8000) {
      return res.status(400).json({ error: "Prompt muito longo (máx 8000)." });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "GROQ_API_KEY não configurada. Adicione nas Environment Variables do Vercel."
      });
    }

    const system = buildSystem(tipo || "geral", perfil);
    const envModel = process.env.AI_MODEL;
    const order = envModel ? [envModel, ...MODELS.filter(m => m !== envModel)] : MODELS;

    let lastErr;
    for (const model of order) {
      try {
        console.log(`[AI] Groq → ${model}`);
        const text = await callGroq(apiKey, model, system, prompt.trim());
        console.log(`[AI] OK ${model} (${text.length} chars)`);
        return res.json({
          resposta: text,
          model,
          tipo: tipo || "geral",
        });
      } catch (e) {
        console.warn(`[AI] ${model} falhou: ${e.status || "?"} - ${e.message}`);
        lastErr = e;
        if (e.status === 401) break;  // chave inválida
        if (e.status === 429) break;  // rate limit
      }
    }

    const status = lastErr?.status || 502;
    if (status === 401) {
      return res.status(502).json({ error: "Chave da IA inválida. Verifique GROQ_API_KEY." });
    }
    if (status === 429) {
      return res.status(429).json({ error: "Limite da IA atingido. Aguarde 30 segundos." });
    }
    return res.status(502).json({
      error: "IA indisponível no momento. Tente novamente em alguns segundos.",
    });

  } catch (e) {
    console.error("[AI handler]", e.message);
    return res.status(500).json({ error: e.message || "Erro interno" });
  }
}
