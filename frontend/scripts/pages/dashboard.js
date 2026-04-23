// pages/dashboard.js - página inicial do sistema
// mostra resumo do dia, macros, refeições e sugestões da IA
// Padrão: renderiza HTML COMPLETO primeiro (com skeletons), DEPOIS
// carrega dados. Assim, se o usuário trocar de página durante o await,
// ctx.ok() retorna false e paramos silenciosamente.

const PAGE_DASHBOARD = {
  async render(main, ctx) {
    const nome = STATE.profile?.nome || STATE.user?.email?.split("@")[0] || "Usuário";
    const hora = new Date().getHours();
    const saud = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
    const data = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

    main.innerHTML = `
      <div class="page-head">
        <div><h1>${saud}, ${esc(nome)} 👋</h1><p class="page-sub">${data}</p></div>
        <div class="page-actions">
          <button class="btn-secondary btn-sm" onclick="UI.go('#/ia')">✦ IA</button>
          <button class="btn-primary btn-sm" onclick="UI.go('#/refeicoes')">+ Refeição</button>
        </div>
      </div>

      ${GUIDE.box("dashboard", "Bem-vindo ao NutriAI",
        "Este é seu <b>painel central</b>. Aqui você vê suas calorias e macros do dia, dicas da IA e ações rápidas. Comece por <b>Refeições → + Nova refeição</b> para registrar o que comeu hoje. A IA estima as calorias automaticamente!")}

      <div class="kpi-row" id="dash-kpis">${PAGE_DASHBOARD._skeletonKpis()}</div>

      <div class="dash-grid">
        <div class="dash-main">
          <div class="card">
            <div class="card-head"><h3>Refeições de hoje</h3><button class="btn-secondary btn-sm" onclick="UI.go('#/refeicoes')">+ Adicionar</button></div>
            <div id="dash-meals"><div class="skel-lines"><div></div><div></div><div></div></div></div>
          </div>
          <div class="card">
            <div class="card-head"><h3>Distribuição de macros</h3></div>
            <div class="macro-rows" id="dash-macros"><div class="skel-lines"><div></div><div></div><div></div><div></div></div></div>
          </div>
          <div class="card">
            <div class="card-head"><h3>Análise semanal</h3><span class="chip" id="score-chip">—</span></div>
            <div id="weekly-summary"><div class="skel-lines"><div></div><div></div></div></div>
          </div>
        </div>
        <div class="dash-side">
          <div class="card card-ai">
            <div class="ai-badge">Sugestão NutriAI</div>
            <p id="dash-tip" style="font-size:13px;color:var(--text2);margin-bottom:12px;line-height:1.55">${PAGE_DASHBOARD._randomTip()}</p>
            <button class="btn-primary btn-sm" onclick="UI.go('#/ia')">Abrir IA →</button>
          </div>
          <div class="card">
            <div class="card-head"><h3>Semana</h3></div>
            <div class="week-spark" id="dash-week"></div>
          </div>
          <div class="card">
            <div class="card-head"><h3>Atalhos</h3></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
              <button class="btn-secondary btn-sm" onclick="UI.go('#/refeicoes')">🧺 Ingredientes</button>
              <button class="btn-secondary btn-sm" onclick="UI.go('#/planner')">📅 Planner</button>
              <button class="btn-secondary btn-sm" onclick="UI.go('#/lista-compras')">🛒 Compras</button>
              <button class="btn-secondary btn-sm" onclick="UI.go('#/progresso')">📈 Progresso</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Carrega dados em background. Todos os _render checam ctx.ok()
    this._renderWeek(ctx);
    await this._loadData(ctx);
    if (!ctx.ok()) return;
    this._renderSummary(ctx);

    // Notificações não-bloqueantes
    NOTIF.checkRules().catch(() => {});
  },

  _skeletonKpis() {
    return Array(4).fill(0).map(() =>
      `<div class="kpi"><div class="skel-line" style="width:60%;height:9px;margin-bottom:8px"></div><div class="skel-line" style="width:40%;height:22px"></div></div>`
    ).join("");
  },

  async _loadData(ctx) {
    try {
      const { data } = await API.select("meals", {
        eq: { user_id: STATE.user.id, data_registro: todayISO() },
        order: { col: "created_at", asc: true },
      });
      if (!ctx.ok()) return;
      STATE.mealsToday = data || [];
      this._renderKpis(ctx);
      this._renderMeals(ctx);
      this._renderMacros(ctx);
    } catch (e) {
      if (!ctx.ok()) return;
      console.error("[Dashboard]", e.message);
      TOAST.show("Erro ao carregar dashboard", "err");
    }
  },

  _renderKpis(ctx) {
    if (!ctx.ok()) return;
    const el = $("dash-kpis");
    if (!el) return;

    const m = STATE.mealsToday;
    const kcal = m.reduce((s, r) => s + (r.calorias || 0), 0);
    const prot = m.reduce((s, r) => s + (+r.proteinas || 0), 0);
    const carb = m.reduce((s, r) => s + (+r.carboidratos || 0), 0);
    const gord = m.reduce((s, r) => s + (+r.gorduras || 0), 0);

    const mc  = STATE.profile?.meta_calorias     || DEFAULTS.calorias;
    const mp  = STATE.profile?.meta_proteinas    || DEFAULTS.proteinas;
    const mCb = STATE.profile?.meta_carboidratos || DEFAULTS.carboidratos;
    const mg  = STATE.profile?.meta_gorduras     || DEFAULTS.gorduras;

    const pct = (v, t) => Math.min(100, Math.round(v / t * 100));
    el.innerHTML = `
      <div class="kpi main">
        <div class="kpi-l">Calorias hoje</div>
        <div class="kpi-v"><span>${kcal}</span><small>/ ${mc}</small></div>
        <div class="kpi-bar"><div class="kpi-fill" style="width:${pct(kcal, mc)}%"></div></div>
      </div>
      <div class="kpi">
        <div class="kpi-l">Proteínas</div>
        <div class="kpi-v"><span>${Math.round(prot)}</span><small>g / ${mp}g</small></div>
        <div class="kpi-bar"><div class="kpi-fill fill-blue" style="width:${pct(prot, mp)}%"></div></div>
      </div>
      <div class="kpi">
        <div class="kpi-l">Carboidratos</div>
        <div class="kpi-v"><span>${Math.round(carb)}</span><small>g / ${mCb}g</small></div>
        <div class="kpi-bar"><div class="kpi-fill fill-amber" style="width:${pct(carb, mCb)}%"></div></div>
      </div>
      <div class="kpi">
        <div class="kpi-l">Gorduras</div>
        <div class="kpi-v"><span>${Math.round(gord)}</span><small>g / ${mg}g</small></div>
        <div class="kpi-bar"><div class="kpi-fill fill-rose" style="width:${pct(gord, mg)}%"></div></div>
      </div>
    `;
  },

  _renderMeals(ctx) {
    if (!ctx.ok()) return;
    const box = $("dash-meals");
    if (!box) return;
    if (!STATE.mealsToday.length) {
      box.innerHTML = `<div class="empty"><div class="eico">🍽️</div><p>Nenhuma refeição hoje</p><small>Clique em "+ Refeição" para começar</small></div>`;
      return;
    }
    box.innerHTML = STATE.mealsToday.map(m => `
      <div class="meal-item meal-fade">
        <div class="meal-ico">${getMealIcon(m.tipo_refeicao)}</div>
        <div class="meal-info">
          <div class="meal-name">${esc(m.nome)}${m.quantidade ? ` (${esc(m.quantidade)})` : ""}</div>
          <div class="meal-type">${esc(m.tipo_refeicao || "Refeição")}</div>
        </div>
        <div class="meal-kcal">${m.calorias || 0} kcal</div>
      </div>
    `).join("");
  },

  _renderMacros(ctx) {
    if (!ctx.ok()) return;
    const box = $("dash-macros");
    if (!box) return;
    const m = STATE.mealsToday;
    const pct = (v, t) => Math.min(100, (v / t) * 100);
    const prot = m.reduce((s, r) => s + (+r.proteinas || 0), 0);
    const carb = m.reduce((s, r) => s + (+r.carboidratos || 0), 0);
    const gord = m.reduce((s, r) => s + (+r.gorduras || 0), 0);
    const fib  = m.reduce((s, r) => s + (+r.fibras || 0), 0);

    const mp = STATE.profile?.meta_proteinas    || DEFAULTS.proteinas;
    const mc = STATE.profile?.meta_carboidratos || DEFAULTS.carboidratos;
    const mg = STATE.profile?.meta_gorduras     || DEFAULTS.gorduras;
    const mf = DEFAULTS.fibras;

    box.innerHTML = `
      <div class="mrow"><span class="mdot" style="background:#f5a623"></span><span class="mname">Carboidratos</span><div class="mbar-wrap"><div class="mbar" style="background:#f5a623;width:${pct(carb, mc)}%"></div></div><span class="mnum">${Math.round(carb)}g / ${mc}g</span></div>
      <div class="mrow"><span class="mdot" style="background:#4a9eff"></span><span class="mname">Proteínas</span><div class="mbar-wrap"><div class="mbar" style="background:#4a9eff;width:${pct(prot, mp)}%"></div></div><span class="mnum">${Math.round(prot)}g / ${mp}g</span></div>
      <div class="mrow"><span class="mdot" style="background:#f05e74"></span><span class="mname">Gorduras</span><div class="mbar-wrap"><div class="mbar" style="background:#f05e74;width:${pct(gord, mg)}%"></div></div><span class="mnum">${Math.round(gord)}g / ${mg}g</span></div>
      <div class="mrow"><span class="mdot" style="background:#2dd4c0"></span><span class="mname">Fibras</span><div class="mbar-wrap"><div class="mbar" style="background:#2dd4c0;width:${pct(fib, mf)}%"></div></div><span class="mnum">${Math.round(fib)}g / ${mf}g</span></div>
    `;
  },

  _renderWeek(ctx) {
    if (!ctx.ok()) return;
    const el = $("dash-week");
    if (!el) return;
    const days = ["S","T","Q","Q","S","S","D"];
    const dow = new Date().getDay();
    const mon = dow === 0 ? 6 : dow - 1;
    el.innerHTML = days.map((d, i) => {
      const h = 8 + Math.floor(Math.random() * 38);
      const cls = i === mon ? "today" : i < mon ? "has" : "";
      return `<div class="wsp"><div class="wsp-bar ${cls}" style="height:${h}px"></div><div class="wsp-lbl">${d}</div></div>`;
    }).join("");
  },

  _renderSummary(ctx) {
    if (!ctx.ok()) return;
    const el = $("weekly-summary");
    const chip = $("score-chip");
    if (!el) return;

    const m = STATE.mealsToday;
    const kcal = m.reduce((s, r) => s + (r.calorias || 0), 0);
    const meta = STATE.profile?.meta_calorias || DEFAULTS.calorias;
    const falt = Math.max(0, meta - kcal);

    // Nutri Score simples 0-100
    const prot = m.reduce((s, r) => s + (+r.proteinas || 0), 0);
    const metaProt = STATE.profile?.meta_proteinas || DEFAULTS.proteinas;
    let score = 0;
    if (kcal > 0) score += 25;
    if (kcal / meta >= 0.5) score += 25;
    if (prot / metaProt >= 0.6) score += 25;
    if (m.length >= 3) score += 25;

    if (chip) chip.textContent = `${score}/100`;

    let msg;
    if (m.length === 0) msg = `<strong>Nenhuma refeição registrada hoje.</strong><br>Comece registrando seu café da manhã ou almoço para acompanhar seus macros.`;
    else if (falt > 0)   msg = `Você consumiu <strong>${kcal} kcal</strong> hoje. Faltam <strong>${falt} kcal</strong> para atingir sua meta diária de ${meta} kcal.`;
    else                 msg = `<strong>🎯 Meta atingida!</strong> Você consumiu ${kcal} kcal de ${meta} kcal. Parabéns por manter a consistência!`;

    el.innerHTML = `<div style="font-size:13px;color:var(--text2);line-height:1.7">${msg}</div>`;
  },

  _randomTip() {
    const p = STATE.profile || {};
    const tips = [
      "Beba água regularmente ao longo do dia. 💧",
      "Inclua uma fonte de proteína em cada refeição.",
      "Vegetais verde-escuros são ricos em ferro e folato. 🥬",
      "Prefira carboidratos integrais a refinados.",
      "Durma 7-8h para otimizar o metabolismo. 😴",
      "Mastigar devagar ajuda na saciedade. 🍴",
    ];
    if (p.objetivo === "emagrecer") tips.push("Reduza líquidos calóricos e priorize proteína magra.");
    if (p.objetivo === "ganhar_massa") tips.push("Garanta 1.6-2g de proteína por kg de peso corporal.");
    return tips[Math.floor(Math.random() * tips.length)];
  },
};

ROUTER.register("dashboard", PAGE_DASHBOARD);
