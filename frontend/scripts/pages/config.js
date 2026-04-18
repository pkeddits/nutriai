// pages/config.js — Configurações (diferente do Perfil)
const PAGE_CONFIG = {
  async render(main, ctx) {
    main.innerHTML = `
      <div class="page-head">
        <div>
          <h1>Configurações</h1>
          <p class="page-sub">Personalize o sistema do seu jeito</p>
        </div>
      </div>

      ${GUIDE.box("config", "Ajustes do sistema",
        "Controle <b>tema visual</b>, <b>notificações</b>, <b>preferências de IA</b> e <b>dados da conta</b>. Para editar suas informações pessoais (nome, peso, objetivo), vá em <b>Meu Perfil</b>.")}

      <div class="two-col">
        <div>
          <!-- NOTIFICAÇÕES -->
          <div class="card">
            <div class="card-head"><h3>🔔 Notificações</h3></div>
            <div class="cfg-rows">
              <div class="cfg-row">
                <div>
                  <b>Alertas inteligentes</b>
                  <small>Lembretes de meta, proteína baixa, água</small>
                </div>
                <label class="toggle">
                  <input type="checkbox" id="cfg-alerts" checked/>
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="cfg-row">
                <div>
                  <b>Dicas diárias</b>
                  <small>Uma sugestão da IA por dia no Dashboard</small>
                </div>
                <label class="toggle">
                  <input type="checkbox" id="cfg-tips" checked/>
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="cfg-row">
                <div>
                  <b>Streaks e conquistas</b>
                  <small>Notifica quando atinge meta / mantém sequência</small>
                </div>
                <label class="toggle">
                  <input type="checkbox" id="cfg-streak" checked/>
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          <!-- IA -->
          <div class="card">
            <div class="card-head"><h3>✦ Preferências de IA</h3></div>
            <div class="field">
              <label>Estilo de resposta</label>
              <select id="cfg-ai-style">
                <option value="detailed">Detalhado (mais completo)</option>
                <option value="concise" selected>Conciso (direto ao ponto)</option>
                <option value="casual">Descontraído (informal)</option>
              </select>
            </div>
            <div class="field">
              <label>Unidade de medida</label>
              <select id="cfg-unit">
                <option value="metric" selected>Métrico (kg, cm, kcal)</option>
                <option value="imperial">Imperial (lb, in, cal)</option>
              </select>
            </div>
          </div>

          <!-- GUIAS -->
          <div class="card">
            <div class="card-head"><h3>📘 Guias contextuais</h3></div>
            <p class="card-desc">Os guias nas páginas ajudam a entender cada funcionalidade. Você ocultou alguns? Reative todos abaixo.</p>
            <button class="btn-secondary btn-sm" onclick="PAGE_CONFIG.resetGuides()">🔄 Reativar todos os guias</button>
          </div>

          <!-- AÇÕES DE CONTA -->
          <div class="card">
            <div class="card-head"><h3>🔐 Conta</h3></div>
            <div class="btn-row" style="flex-wrap:wrap">
              <button class="btn-secondary btn-sm" onclick="UI.go('#/perfil')">👤 Editar perfil</button>
              <button class="btn-secondary btn-sm" onclick="UI.openModal('modal-pw')">🔑 Alterar senha</button>
              <button class="btn-secondary btn-sm" onclick="UI.openModal('modal-email')">📧 Alterar e-mail</button>
            </div>
          </div>

          <!-- ZONA DE PERIGO -->
          <div class="card" style="border-color:rgba(239,68,68,.15)">
            <div class="card-head"><h3 style="color:#fca5a5">⚠️ Zona de perigo</h3></div>
            <p class="card-desc">Ações irreversíveis. Pense duas vezes antes.</p>
            <div class="btn-row" style="flex-wrap:wrap">
              <button class="btn-secondary btn-sm" onclick="PAGE_CONFIG.clearAll()" style="color:#fca5a5;border-color:rgba(239,68,68,.2)">🗑️ Limpar todos os dados</button>
              <button class="btn-secondary btn-sm" onclick="AUTH.logout()" style="color:#fca5a5;border-color:rgba(239,68,68,.2)">🚪 Sair da conta</button>
            </div>
          </div>
        </div>

        <div>
          <!-- INFO -->
          <div class="card card-ai">
            <div class="ai-badge">Sobre o NutriAI</div>
            <div class="cfg-info">
              <div class="cfg-info-row"><span>Versão</span><b>v6.3</b></div>
              <div class="cfg-info-row"><span>IA</span><b>Groq Cloud</b></div>
              <div class="cfg-info-row"><span>Banco</span><b>Supabase</b></div>
              <div class="cfg-info-row"><span>Última atualização</span><b>Abr/2026</b></div>
            </div>
          </div>

          <!-- ESTATÍSTICAS -->
          <div class="card">
            <div class="card-head"><h3>📊 Suas estatísticas</h3></div>
            <div id="stats-content">
              <div class="skel-lines"><div></div><div></div><div></div></div>
            </div>
          </div>

          <!-- ATALHOS -->
          <div class="card">
            <div class="card-head"><h3>⌨️ Atalhos</h3></div>
            <div class="cfg-rows">
              <div class="cfg-row"><b>Navegar</b><kbd>click</kbd></div>
              <div class="cfg-row"><b>Fechar modal</b><kbd>ESC</kbd></div>
              <div class="cfg-row"><b>Abrir chatbot</b><kbd>canto ↘</kbd></div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Carregar stats em background
    this._loadStats(ctx);
  },

  async _loadStats(ctx) {
    try {
      const [meals, plans, ing, hist] = await Promise.all([
        API.select("meals", { eq: { user_id: STATE.user.id }, columns: "id" }),
        API.select("meal_plans", { eq: { user_id: STATE.user.id }, columns: "id" }),
        API.select("ingredients", { eq: { user_id: STATE.user.id }, columns: "id" }),
        API.select("ai_history", { eq: { user_id: STATE.user.id }, columns: "id" }),
      ]);
      if (!ctx.ok()) return;
      const el = $("stats-content");
      if (!el) return;
      el.innerHTML = `
        <div class="cfg-info">
          <div class="cfg-info-row"><span>Refeições registradas</span><b>${meals?.data?.length || 0}</b></div>
          <div class="cfg-info-row"><span>Ingredientes cadastrados</span><b>${ing?.data?.length || 0}</b></div>
          <div class="cfg-info-row"><span>Itens no planner</span><b>${plans?.data?.length || 0}</b></div>
          <div class="cfg-info-row"><span>Interações com IA</span><b>${hist?.data?.length || 0}</b></div>
        </div>
      `;
    } catch (e) {
      if (!ctx.ok()) return;
      const el = $("stats-content");
      if (el) el.innerHTML = `<p style="font-size:12px;color:var(--text3)">Sem dados ainda</p>`;
    }
  },

  resetGuides() {
    Object.keys(localStorage)
      .filter(k => k.startsWith("guide_dismissed_"))
      .forEach(k => localStorage.removeItem(k));
    TOAST.show("✓ Todos os guias foram reativados");
  },

  async clearAll() {
    const c = prompt(`Isso apagará TODOS os seus dados (refeições, planner, ingredientes, histórico).\n\nDigite "LIMPAR" para confirmar.`);
    if (c !== "LIMPAR") return;

    try {
      await Promise.all([
        API.delete("meals",         { user_id: STATE.user.id }),
        API.delete("meal_plans",    { user_id: STATE.user.id }),
        API.delete("ingredients",   { user_id: STATE.user.id }),
        API.delete("shopping_list", { user_id: STATE.user.id }),
        API.delete("ai_history",    { user_id: STATE.user.id }),
        API.delete("progress_logs", { user_id: STATE.user.id }),
        API.delete("notifications", { user_id: STATE.user.id }),
      ]);
      STATE.ingredients = []; STATE.mealsToday = []; STATE.notifications = [];
      TOAST.show("✓ Dados apagados");
      setTimeout(() => UI.go("#/dashboard"), 800);
    } catch (e) {
      TOAST.show("Erro: " + e.message, "err");
    }
  },
};

ROUTER.register("configuracoes", PAGE_CONFIG);
