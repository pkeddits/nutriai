// ══════════════════════════════════════════════════════════
// guide.js — guia contextual + chatbot flutuante em cada página
// ══════════════════════════════════════════════════════════

const GUIDE = {
  // Box fixo explicativo no topo de cada página (dismissível)
  box(pageId, titulo, html) {
    const dismissed = localStorage.getItem(`guide_dismissed_${pageId}`) === "1";
    if (dismissed) return "";
    return `
      <div class="guide-box" id="guide-${pageId}">
        <div class="guide-ico">💡</div>
        <div class="guide-body">
          <div class="guide-title">${esc(titulo)}</div>
          <div class="guide-text">${html}</div>
        </div>
        <button class="guide-close" onclick="GUIDE.dismiss('${pageId}')" title="Ocultar">×</button>
      </div>
    `;
  },

  dismiss(pageId) {
    localStorage.setItem(`guide_dismissed_${pageId}`, "1");
    const el = document.getElementById(`guide-${pageId}`);
    if (el) {
      el.style.animation = "guideDismiss 240ms cubic-bezier(.16,1,.3,1) forwards";
      setTimeout(() => el.remove(), 240);
    }
  },

  // Reset do guide (usar no botão "ajuda" se quiser)
  resetAll() {
    Object.keys(localStorage)
      .filter(k => k.startsWith("guide_dismissed_"))
      .forEach(k => localStorage.removeItem(k));
    TOAST.show("✓ Guias reativados");
    ROUTER.navigate();
  },
};

// ══════════════════════════════════════════════════════════
// CHATBOT FLUTUANTE — botão no canto + modal de chat
// ══════════════════════════════════════════════════════════
const CHATBOT = {
  _open: false,
  _history: [],  // Mantido em memória durante a sessão
  _loading: false,

  init() {
    if (document.getElementById("chatbot-fab")) return;
    const fab = document.createElement("div");
    fab.id = "chatbot-fab";
    fab.innerHTML = `
      <button class="cb-fab" onclick="CHATBOT.toggle()" aria-label="Abrir chat NutriAI">
        <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
          <path d="M12 2a10 10 0 0110 10c0 2-1 4-2 5l1 4-4-1a10 10 0 01-5 1A10 10 0 1112 2z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="8" cy="12" r="1" fill="currentColor"/>
          <circle cx="12" cy="12" r="1" fill="currentColor"/>
          <circle cx="16" cy="12" r="1" fill="currentColor"/>
        </svg>
      </button>
      <div class="cb-panel" id="cb-panel" style="display:none">
        <div class="cb-head">
          <div class="cb-head-info">
            <div class="cb-avatar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 3C12 3 7 8 7 13C7 16.3 9.2 18.5 12 18.5C14.8 18.5 17 16.3 17 13C17 10 14.5 7.5 13.2 6" stroke="#fff" stroke-width="2.3" stroke-linecap="round"/>
                <circle cx="13.2" cy="5.2" r="2" fill="#fff"/>
              </svg>
            </div>
            <div>
              <div class="cb-title">NutriAI</div>
              <div class="cb-subtitle"><span class="cb-dot"></span>Online</div>
            </div>
          </div>
          <button class="cb-close" onclick="CHATBOT.toggle()">×</button>
        </div>
        <div class="cb-messages" id="cb-messages"></div>
        <div class="cb-input-area">
          <input id="cb-input" type="text" placeholder="Pergunte algo sobre nutrição..." onkeypress="if(event.key==='Enter')CHATBOT.send()"/>
          <button class="cb-send" onclick="CHATBOT.send()" aria-label="Enviar">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(fab);
    // Primeira mensagem
    this._addMsg("ai", "Olá! 👋 Sou o <strong>NutriAI</strong>, seu assistente nutricional. Posso responder dúvidas, sugerir receitas e ajustar seu plano. Como posso ajudar?");
  },

  toggle() {
    const panel = document.getElementById("cb-panel");
    if (!panel) return;
    this._open = !this._open;
    panel.style.display = this._open ? "flex" : "none";
    if (this._open) {
      setTimeout(() => document.getElementById("cb-input")?.focus(), 100);
    }
  },

  _addMsg(role, content) {
    const list = document.getElementById("cb-messages");
    if (!list) return;
    const div = document.createElement("div");
    div.className = `cb-msg cb-${role}`;
    div.innerHTML = role === "ai" ? content : esc(content);
    list.appendChild(div);
    list.scrollTop = list.scrollHeight;
    this._history.push({ role, content });
  },

  _addTyping() {
    const list = document.getElementById("cb-messages");
    if (!list) return null;
    const div = document.createElement("div");
    div.className = "cb-msg cb-ai cb-typing";
    div.innerHTML = `<span></span><span></span><span></span>`;
    list.appendChild(div);
    list.scrollTop = list.scrollHeight;
    return div;
  },

  async send() {
    if (this._loading) return;
    const input = document.getElementById("cb-input");
    if (!input) return;
    const txt = input.value.trim();
    if (!txt) return;
    input.value = "";
    this._addMsg("user", txt);
    const typing = this._addTyping();
    this._loading = true;

    // Contexto da página atual + histórico curto
    const pageCtx = {
      dashboard: "Usuário na página Dashboard",
      refeicoes: "Usuário na página Refeições (registra o que comeu)",
      planner: "Usuário na página Planner Semanal",
      "lista-compras": "Usuário na página Lista de Compras",
      ia: "Usuário na página IA",
      perfil: "Usuário editando o perfil",
      progresso: "Usuário vendo página de Progresso e gráficos",
    }[STATE.currentPage] || "";

    const last = this._history.slice(-6, -1)
      .map(m => `${m.role === "user" ? "Usuário" : "NutriAI"}: ${m.content.replace(/<[^>]+>/g,"")}`)
      .join("\n");

    const prompt = `${pageCtx}\n\nHistórico recente:\n${last}\n\nNova pergunta: ${txt}\n\nResponda de forma breve e prática (máx 4-5 linhas).`;

    try {
      const resp = await AI.call(prompt, "geral");
      typing?.remove();
      this._addMsg("ai", fmtAI(resp));
    } catch (e) {
      typing?.remove();
      this._addMsg("ai", `<span style="color:#fca5a5">⚠️ ${esc(e.message || "Erro ao conectar")}</span>`);
    } finally {
      this._loading = false;
    }
  },
};
