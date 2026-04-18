// ai.js — integração com IA via backend

const AI = {
  async call(prompt, tipo = "geral") {
    const r = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, tipo, perfil: STATE.profile }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.error || `Erro ${r.status} na IA`);
    }
    const data = await r.json();
    return data.resposta;
  },

  // Mostrar resposta num container, com loading
  async showIn(elId, prompt, tipo = "geral") {
    const box = $(elId);
    if (!box) return;
    box.style.display = "block";
    box.innerHTML = `
      <div class="ai-resp">
        <div class="ai-badge">NutriAI</div>
        <div class="ld"><span></span><span></span><span></span></div>
      </div>`;

    // Desabilita botões na mesma card
    const card = box.closest(".card") || box.parentElement;
    const btns = card ? card.querySelectorAll("button") : [];
    btns.forEach(b => b.disabled = true);

    try {
      const txt = await this.call(prompt, tipo);
      box.innerHTML = `
        <div class="ai-resp">
          <div class="ai-badge">NutriAI</div>
          <div class="ai-resp-body">${fmtAI(txt)}</div>
        </div>`;

      // Salva no histórico (fire and forget)
      if (STATE.user) {
        API.insert("ai_history", {
          user_id: STATE.user.id,
          tipo,
          prompt_used: prompt.slice(0, 600),
          resposta: txt,
        }).catch(() => {});
      }
      return txt;
    } catch (e) {
      box.innerHTML = `
        <div class="ai-resp" style="border-color:rgba(239,68,68,.25)">
          <div class="ai-badge" style="color:#fca5a5">Erro</div>
          <div class="ai-resp-body">⚠️ ${esc(e.message || "Erro ao conectar à IA. Verifique sua GROQ_API_KEY.")}</div>
        </div>`;
      throw e;
    } finally {
      btns.forEach(b => b.disabled = false);
    }
  },
};
