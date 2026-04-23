// ai.js - chama a IA e mostra o resultado na tela

const AI = {
  // faz a chamada pra IA passando o prompt e o perfil do usuário
  async call(prompt, tipo = "geral") {
    const resp = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        tipo,
        perfil: STATE.profile // manda o perfil pra IA personalizar a resposta
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || `Erro ${resp.status} na IA`);
    }

    const data = await resp.json();
    return data.resposta;
  },

  // mostra a resposta da IA dentro de um elemento HTML
  // exibe loading enquanto aguarda e trata erros
  async showIn(elId, prompt, tipo = "geral") {
    const box = $(elId);
    if (!box) return;

    box.style.display = "block";
    box.innerHTML = `
      <div class="ai-resp">
        <div class="ai-badge">NutriAI</div>
        <div class="ld"><span></span><span></span><span></span></div>
      </div>`;

    // desabilita botões enquanto carrega pra evitar double-click
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

      // salva no histórico - usa sb direto pra evitar o ensureSession do API.run
      // que às vezes bloqueia quando a sessão foi verificada há pouco tempo
      if (STATE.user) {
        try {
          await sb.from("ai_history").insert({
            user_id: STATE.user.id,
            tipo,
            prompt_used: prompt.slice(0, 600),
            resposta: txt,
          });
          console.log("histórico salvo ok");
        } catch (err) {
          // não bloqueia a resposta se falhar o histórico
          console.log("falhou ao salvar histórico:", err.message);
        }
      }

      return txt;
    } catch (e) {
      box.innerHTML = `
        <div class="ai-resp" style="border-color:rgba(239,68,68,.25)">
          <div class="ai-badge" style="color:#fca5a5">Erro</div>
          <div class="ai-resp-body">⚠️ ${esc(e.message || "Não foi possível conectar à IA.")}</div>
        </div>`;
      throw e;
    } finally {
      btns.forEach(b => b.disabled = false);
    }
  },
};
