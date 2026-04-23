// pages/progresso.js - acompanhamento do progresso nutricional
// mostra gráficos, score, streak e histórico de peso
const PAGE_PROGRESSO = {
  _logs:   [],
  _meals7: [],
  _loaded: false,

  async render(main, ctx) {
    main.innerHTML = `
      <div class="page-head">
        <div>
          <h1>Progresso</h1>
          <p class="page-sub">Acompanhe sua evolução nutricional</p>
        </div>
        <div class="page-actions">
          <button class="btn-primary btn-sm" onclick="PAGE_PROGRESSO.logWeight()">+ Registrar peso</button>
        </div>
      </div>

      ${GUIDE.box("progresso", "O que você vê aqui",
        "Seu <b>score nutricional</b> (0-100) é calculado pelos dias com refeições, consumo de calorias e proteína. Gráficos mostram calorias dos últimos 7 dias e histórico de peso. Registre seu peso regularmente para ver a evolução.")}

      <div class="kpi-row" id="prog-kpis"></div>

      <div class="dash-grid">
        <div class="dash-main">
          <div class="card">
            <div class="card-head"><h3>Calorias — últimos 7 dias</h3><span class="chip" id="avg-chip">—</span></div>
            <div id="chart-kcal" style="min-height:220px"></div>
          </div>
          <div class="card">
            <div class="card-head"><h3>Peso — histórico</h3><span class="chip" id="weight-chip">—</span></div>
            <div id="chart-weight" style="min-height:200px"></div>
          </div>
          <div class="card">
            <div class="card-head">
              <h3>Análise IA</h3>
              <span class="chip" id="analysis-chip">—</span>
            </div>
            <div id="ai-analysis"></div>
          </div>
        </div>
        <div class="dash-side">
          <div class="card card-ai">
            <div class="ai-badge">Streak</div>
            <div style="font-size:52px;font-weight:800;color:var(--text);letter-spacing:-2.5px;text-align:center;margin:14px 0 4px;background:linear-gradient(135deg,var(--acc) 0%,#9AACFF 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent" id="streak-num">0</div>
            <p style="font-size:12px;color:var(--text2);text-align:center;line-height:1.5" id="streak-desc">Carregando...</p>
          </div>
          <div class="card">
            <div class="card-head"><h3>Resumo semanal</h3></div>
            <div id="week-summary">
              <div class="skel-lines"><div></div><div></div><div></div></div>
            </div>
          </div>
          <div class="card">
            <div class="card-head"><h3>Ações rápidas</h3></div>
            <div style="display:flex;flex-direction:column;gap:6px">
              <button class="btn-secondary btn-sm" onclick="PAGE_PROGRESSO.genAnalysis()">✦ Gerar análise IA</button>
              <button class="btn-secondary btn-sm" onclick="UI.go('#/refeicoes')">📝 Registrar refeição</button>
            </div>
          </div>
        </div>
      </div>
    `;

    await this._load(ctx);
    if (!ctx.ok()) return;

    // Renderiza TUDO, mesmo com dados zerados
    this._renderKpis();
    this._renderCaloriasChart();
    this._renderWeightChart();
    this._renderStreak();
    this._renderWeekSummary();
    this._renderAIPlaceholder();
  },

  async _load(ctx) {
    this._loaded = false;
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const cutoff = sevenDaysAgo.toISOString().split("T")[0];

      // USA API.run com timeout correto
      const meals = await API.run(() =>
        sb.from("meals").select("*")
          .eq("user_id", STATE.user.id)
          .gte("data_registro", cutoff)
          .order("data_registro", { ascending: true })
      );
      if (!ctx.ok()) return;

      const logs = await API.select("progress_logs", {
        eq: { user_id: STATE.user.id },
        order: { col: "data", asc: true },
        limit: 30,
      });
      if (!ctx.ok()) return;

      this._meals7 = meals?.data || [];
      this._logs   = logs?.data  || [];
      this._loaded = true;
    } catch (e) {
      console.error("[Progresso] load:", e.message);
      this._meals7 = [];
      this._logs   = [];
      this._loaded = true;  // marca como "carregou mas vazio"
    }
  },

  _renderKpis() {
    const el = $("prog-kpis");
    if (!el) return;

    const byDay = {};
    this._meals7.forEach(m => {
      byDay[m.data_registro] = (byDay[m.data_registro] || 0) + (m.calorias || 0);
    });
    const days = Object.values(byDay);
    const avg = days.length ? Math.round(days.reduce((a,b) => a+b, 0) / days.length) : 0;
    const meta = STATE.profile?.meta_calorias || DEFAULTS.calorias;
    const diffMeta = avg - meta;

    const peso = this._logs.length ? this._logs[this._logs.length - 1].peso : STATE.profile?.peso;
    const pesoInicial = this._logs[0]?.peso;
    const diffPeso = pesoInicial && peso ? (peso - pesoInicial).toFixed(1) : null;

    const score = this._calcScore();

    el.innerHTML = `
      <div class="kpi main">
        <div class="kpi-l">Score nutricional</div>
        <div class="kpi-v"><span>${score}</span><small>/ 100</small></div>
        <div class="kpi-bar"><div class="kpi-fill" style="width:${score}%"></div></div>
      </div>
      <div class="kpi">
        <div class="kpi-l">Média 7 dias</div>
        <div class="kpi-v"><span>${avg}</span><small>kcal/dia</small></div>
        <div class="kpi-bar"><div class="kpi-fill fill-blue" style="width:${Math.min(100, (avg/meta)*100)}%"></div></div>
      </div>
      <div class="kpi">
        <div class="kpi-l">Diferença da meta</div>
        <div class="kpi-v"><span style="color:${diffMeta > 0 ? "#f05e74" : diffMeta < 0 ? "#f5a623" : "#34d399"}">${diffMeta > 0 ? "+" : ""}${diffMeta}</span><small>kcal</small></div>
        <div class="kpi-bar"><div class="kpi-fill ${diffMeta > 0 ? "fill-rose" : "fill-amber"}" style="width:${Math.min(100, Math.abs(diffMeta/meta)*100)}%"></div></div>
      </div>
      <div class="kpi">
        <div class="kpi-l">Peso atual</div>
        <div class="kpi-v"><span>${peso || "—"}</span><small>kg${diffPeso ? ` (${diffPeso > 0 ? "+" : ""}${diffPeso})` : ""}</small></div>
        <div class="kpi-bar"><div class="kpi-fill fill-amber" style="width:${peso ? 60 : 0}%"></div></div>
      </div>
    `;

    const avgChip = $("avg-chip");
    if (avgChip) avgChip.textContent = `Média ${avg} kcal`;
    const weightChip = $("weight-chip");
    if (weightChip) weightChip.textContent = this._logs.length ? `${this._logs.length} registros` : "Sem dados";
  },

  _calcScore() {
    if (!this._meals7.length) return 0;
    const mealsByDay = {};
    this._meals7.forEach(m => { (mealsByDay[m.data_registro] ||= []).push(m); });

    const days = Object.keys(mealsByDay).length;
    const metaCal = STATE.profile?.meta_calorias || DEFAULTS.calorias;
    const metaProt = STATE.profile?.meta_proteinas || DEFAULTS.proteinas;

    let consistencia = Math.min(40, days * 6);
    let calorias = 0, proteinas = 0;
    Object.values(mealsByDay).forEach(ms => {
      const k = ms.reduce((s,r) => s + (r.calorias || 0), 0);
      const p = ms.reduce((s,r) => s + (+r.proteinas || 0), 0);
      if (k / metaCal >= 0.7) calorias += 4;
      if (p / metaProt >= 0.6) proteinas += 4;
    });
    return Math.min(100, consistencia + calorias + proteinas);
  },

  _renderCaloriasChart() {
    const el = $("chart-kcal");
    if (!el) return;

    if (!this._meals7.length) {
      el.innerHTML = `<div class="empty"><div class="eico">📊</div><p>Sem refeições registradas</p><small>Comece registrando suas refeições para ver o gráfico</small><button class="btn-primary btn-sm" style="margin-top:10px" onclick="UI.go('#/refeicoes')">Registrar agora</button></div>`;
      return;
    }

    const byDay = {};
    this._meals7.forEach(m => {
      byDay[m.data_registro] = (byDay[m.data_registro] || 0) + (m.calorias || 0);
    });

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = d.toISOString().split("T")[0];
      days.push({
        iso,
        label: d.toLocaleDateString("pt-BR", { weekday: "short" }).slice(0, 3),
        kcal: byDay[iso] || 0
      });
    }

    const meta = STATE.profile?.meta_calorias || DEFAULTS.calorias;
    const max = Math.max(meta * 1.2, ...days.map(d => d.kcal)) || 100;

    const w = 100, h = 100;
    const barW = w / days.length - 2;
    el.innerHTML = `
      <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:180px">
        <line x1="0" y1="${h - (meta/max)*h}" x2="${w}" y2="${h - (meta/max)*h}"
              stroke="var(--acc)" stroke-width="0.3" stroke-dasharray="1,1" opacity="0.7"/>
        ${days.map((d, i) => {
          const bH = (d.kcal / max) * h;
          const x = i * (w / days.length) + 1;
          const y = h - bH;
          const color = d.kcal === 0 ? "var(--s3)"
                     : d.kcal >= meta * 0.8 && d.kcal <= meta * 1.15 ? "#34d399"
                     : d.kcal > meta * 1.15 ? "#f05e74"
                     : "#4a9eff";
          return `<rect x="${x}" y="${y}" width="${barW}" height="${Math.max(bH, 0.5)}" rx="0.5" fill="${color}" opacity="0.9">
            <title>${d.label}: ${d.kcal} kcal</title>
          </rect>`;
        }).join("")}
      </svg>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;font-size:10px;color:var(--text3);text-align:center;margin-top:8px">
        ${days.map(d => `<div>${d.label}<br><b style="color:var(--text2);font-size:10px">${d.kcal}</b></div>`).join("")}
      </div>
      <div style="font-size:11px;color:var(--text3);text-align:center;margin-top:8px">
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="display:inline-block;width:8px;height:2px;background:var(--acc)"></span> Meta: ${meta} kcal</span>
      </div>
    `;
  },

  _renderWeightChart() {
    const el = $("chart-weight");
    if (!el) return;

    const pontos = this._logs.filter(l => l.peso).map(l => ({ data: l.data, peso: +l.peso }));

    if (!pontos.length) {
      el.innerHTML = `<div class="empty"><div class="eico">⚖️</div><p>Nenhum peso registrado</p><small>Clique em "Registrar peso" no topo</small><button class="btn-primary btn-sm" style="margin-top:10px" onclick="PAGE_PROGRESSO.logWeight()">+ Registrar peso</button></div>`;
      return;
    }

    const max = Math.max(...pontos.map(p => p.peso)) + 1;
    const min = Math.min(...pontos.map(p => p.peso)) - 1;
    const range = max - min || 1;
    const w = 100, h = 100;

    const points = pontos.map((p, i) => {
      const x = pontos.length === 1 ? w / 2 : (i / (pontos.length - 1)) * w;
      const y = h - ((p.peso - min) / range) * h;
      return `${x},${y}`;
    }).join(" ");

    el.innerHTML = `
      <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:170px">
        <defs>
          <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--acc)" stop-opacity=".3"/>
            <stop offset="100%" stop-color="var(--acc)" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <polygon fill="url(#wGrad)" points="0,${h} ${points} ${w},${h}"/>
        <polyline fill="none" stroke="var(--acc)" stroke-width="0.8" stroke-linejoin="round" stroke-linecap="round" points="${points}"/>
        ${pontos.map((p, i) => {
          const x = pontos.length === 1 ? w / 2 : (i / (pontos.length - 1)) * w;
          const y = h - ((p.peso - min) / range) * h;
          return `<circle cx="${x}" cy="${y}" r="1.4" fill="#fff" stroke="var(--acc)" stroke-width="0.6"/>`;
        }).join("")}
      </svg>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text3);margin-top:6px">
        <span>${new Date(pontos[0].data).toLocaleDateString("pt-BR", { day:"numeric", month:"short" })} · ${pontos[0].peso}kg</span>
        <span>${new Date(pontos[pontos.length-1].data).toLocaleDateString("pt-BR", { day:"numeric", month:"short" })} · ${pontos[pontos.length-1].peso}kg</span>
      </div>
    `;
  },

  _renderStreak() {
    const byDay = {};
    this._meals7.forEach(m => { byDay[m.data_registro] = true; });

    let streak = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = d.toISOString().split("T")[0];
      if (byDay[iso]) streak++;
      else if (i > 0) break;
    }
    const num = $("streak-num");
    const desc = $("streak-desc");
    if (num) num.textContent = streak;
    if (desc) desc.textContent = streak === 0 ? "Comece registrando hoje!"
      : streak === 1 ? "1 dia. Continue amanhã!"
      : `${streak} dias seguidos 🔥`;
  },

  _renderWeekSummary() {
    const el = $("week-summary");
    if (!el) return;

    const byDay = {};
    this._meals7.forEach(m => {
      if (!byDay[m.data_registro]) byDay[m.data_registro] = { kcal: 0, prot: 0, count: 0 };
      byDay[m.data_registro].kcal += m.calorias || 0;
      byDay[m.data_registro].prot += +m.proteinas || 0;
      byDay[m.data_registro].count++;
    });

    const dias = Object.values(byDay);
    const totalKcal = dias.reduce((s, d) => s + d.kcal, 0);
    const totalProt = dias.reduce((s, d) => s + d.prot, 0);
    const totalRef  = dias.reduce((s, d) => s + d.count, 0);

    el.innerHTML = `
      <div class="metas-blk">
        <div class="metas-row"><span>Total refeições</span><b>${totalRef}</b></div>
        <div class="metas-row"><span>Total calorias</span><b>${totalKcal.toLocaleString("pt-BR")}</b></div>
        <div class="metas-row"><span>Total proteínas</span><b>${Math.round(totalProt)}g</b></div>
        <div class="metas-row"><span>Dias ativos</span><b>${dias.length}/7</b></div>
      </div>
    `;
  },

  _renderAIPlaceholder() {
    const box = $("ai-analysis");
    if (!box) return;
    if (!this._meals7.length) {
      box.innerHTML = `<div class="empty"><div class="eico">🧠</div><p>Sem dados suficientes</p><small>Registre ao menos 1 refeição para a IA analisar seu padrão</small></div>`;
      return;
    }
    box.innerHTML = `<div class="empty"><div class="eico">✨</div><p>Gere uma análise personalizada</p><small>A IA avalia seus últimos 7 dias e sugere ajustes</small><button class="btn-primary btn-sm" style="margin-top:10px" onclick="PAGE_PROGRESSO.genAnalysis()">✦ Gerar análise</button></div>`;
  },

  async logWeight() {
    const peso = prompt("Seu peso atual em kg:", STATE.profile?.peso || "");
    const v = parseFloat(peso);
    if (!v || v < 20 || v > 300) return TOAST.show("Peso inválido.", "err");

    try {
      await API.upsert("progress_logs",
        { user_id: STATE.user.id, peso: v, data: todayISO() },
        { onConflict: "user_id,data" });
      await API.update("profiles", { peso: v }, { id: STATE.user.id });
      STATE.profile = { ...STATE.profile, peso: v };
      TOAST.show(`✓ Peso registrado: ${v}kg`);
      ROUTER.navigate();
    } catch (e) {
      TOAST.show("Erro: " + e.message, "err");
    }
  },

  async genAnalysis() {
    const byDay = {};
    this._meals7.forEach(m => {
      if (!byDay[m.data_registro]) byDay[m.data_registro] = { kcal: 0, prot: 0, carb: 0, gord: 0 };
      byDay[m.data_registro].kcal += m.calorias || 0;
      byDay[m.data_registro].prot += +m.proteinas || 0;
      byDay[m.data_registro].carb += +m.carboidratos || 0;
      byDay[m.data_registro].gord += +m.gorduras || 0;
    });
    const resumo = Object.entries(byDay).map(([d, v]) =>
      `${d}: ${v.kcal}kcal, ${Math.round(v.prot)}g prot, ${Math.round(v.carb)}g carb, ${Math.round(v.gord)}g gord`
    ).join("\n");

    const box = $("ai-analysis");
    if (!box) return;
    box.innerHTML = `<div class="ai-resp"><div class="ai-badge">NutriAI analisando</div><div class="ld"><span></span><span></span><span></span></div></div>`;

    try {
      const analise = await AI.call(
        `Analise meus últimos 7 dias:\n\n${resumo || "Nenhuma refeição"}\n\nMeta: ${STATE.profile?.meta_calorias || 1800}kcal/dia. Seja direto e prático: **Pontos positivos**, **Pontos de atenção** e **3 ações concretas** para os próximos dias.`,
        "dieta"
      );
      box.innerHTML = `<div class="ai-resp"><div class="ai-badge">Análise NutriAI</div><div class="ai-resp-body">${fmtAI(analise)}</div></div>`;
      const chip = $("analysis-chip");
      if (chip) chip.textContent = "Atualizada";
    } catch (e) {
      box.innerHTML = `<div class="ai-resp" style="border-color:rgba(239,68,68,.25)"><div class="ai-badge" style="color:#fca5a5">Erro</div><div class="ai-resp-body">⚠️ ${esc(e.message)}</div></div>`;
    }
  },
};

ROUTER.register("progresso", PAGE_PROGRESSO);
