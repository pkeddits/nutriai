// backend/controllers/ai.controller.js
const { askAI } = require("../services/ai.service");

async function handleAI(req, res) {
  try {
    const { prompt, tipo, perfil } = req.body || {};

    if (!prompt || typeof prompt !== "string" || !prompt.trim())
      return res.status(400).json({ error: "Campo 'prompt' obrigatório." });

    if (prompt.length > 8000)
      return res.status(400).json({ error: "Prompt muito longo (máx 8000)." });

    const result = await askAI({
      prompt: prompt.trim(),
      tipo: tipo || "geral",
      perfil: perfil && typeof perfil === "object" ? perfil : null,
    });

    return res.json({
      resposta: result.resposta,
      model:    result.model,
      tipo:     tipo || "geral",
    });

  } catch (e) {
    console.error("[AI controller]", e.message);
    const status = e.status || 502;

    if (status === 401)
      return res.status(502).json({ error: "Chave da IA inválida. Verifique GROQ_API_KEY." });
    if (status === 429)
      return res.status(429).json({ error: "Limite da IA atingido. Aguarde 30 segundos." });
    if (status === 500)
      return res.status(500).json({ error: e.message });

    return res.status(502).json({
      error: "IA indisponível no momento. Tente novamente em alguns segundos."
    });
  }
}

module.exports = { handleAI };
