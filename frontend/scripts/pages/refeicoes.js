// pages/refeicoes.js - registro de refeições do dia
// organiza por tipo (café, almoço, lanche, jantar) e calcula macros
const PAGE_REFEICOES = {
  _tab: "hoje",  // começa mostrando o dia
  _ctx: null,

  async render(main, ctx) {
    this._ctx = ctx;
    main.innerHTML = `
      <div class="page-head">
        <div>
          <h1>Refeições</h1>
          <p class="page-sub">Registre o que você comeu hoje e acompanhe seus macros</p>
        </div>
        <div class="page-actions">
          <button class="btn-primary btn-sm" onclick="PAGE_REFEICOES.openQuickAdd()">+ Nova refeição</button>
        </div>
      </div>

      ${GUIDE.box("refeicoes", "Como funciona",
        "1️⃣ Clique em <b>+ Nova refeição</b> para registrar o que comeu. 2️⃣ Use <b>✦ Estimar com IA</b> se não souber as calorias. 3️⃣ Cadastre <b>ingredientes</b> que você tem em casa para gerar receitas. 4️⃣ Veja o gráfico de macros do dia atualizado em tempo real.")}

      <div class="sec-tabs" id="ref-tabs">
        <button class="sec-tab ${this._tab==="hoje"?"active":""}"         data-tab="hoje">🍽️ Hoje</button>
        <button class="sec-tab ${this._tab==="registrar"?"active":""}"    data-tab="registrar">+ Registrar</button>
        <button class="sec-tab ${this._tab==="ingredientes"?"active":""}" data-tab="ingredientes">🧺 Ingredientes</button>
      </div>

      <div id="tab-content">
        <div class="skel-lines"><div></div><div></div><div></div></div>
      </div>
    `;

    // Bind tabs
    $$("#ref-tabs .sec-tab").forEach(b => {
      b.onclick = () => {
        this._tab = b.dataset.tab;
        $$("#ref-tabs .sec-tab").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        this._renderTab(ctx);
      };
    });

    await this._loadData(ctx);
    if (!ctx.ok()) return;
    this._renderTab(ctx);
  },

  openQuickAdd() {
    this._tab = "registrar";
    $$("#ref-tabs .sec-tab").forEach(b => b.classList.toggle("active", b.dataset.tab === "registrar"));
    this._renderTab(this._ctx);
  },

  async _loadData(ctx) {
    try {
      const [ing, ml] = await Promise.all([
        API.select("ingredients", { eq: { user_id: STATE.user.id }, order: { col: "created_at", asc: false } }),
        API.select("meals",       { eq: { user_id: STATE.user.id, data_registro: todayISO() }, order: { col: "created_at", asc: false } }),
      ]);
      if (!ctx.ok()) return;
      STATE.ingredients = ing.data || [];
      STATE.mealsToday  = ml.data  || [];
    } catch (e) {
      if (!ctx.ok()) return;
      console.error("[Refeicoes]", e.message);
    }
  },

  _renderTab(ctx) {
    if (!ctx.ok()) return;
    const box = $("tab-content");
    if (!box) return;
    if (this._tab === "registrar")    return this._renderRegistrar(box);
    if (this._tab === "ingredientes") return this._renderIngredientes(box);
    return this._renderHoje(box);
  },

  // ═════════ HOJE — cards por tipo de refeição ═════════
  _renderHoje(box) {
    const tipos = ["Café da Manhã", "Almoço", "Lanche", "Jantar", "Ceia"];
    const tipoIcons = {"Café da Manhã":"🌅","Almoço":"☀️","Lanche":"🍎","Jantar":"🌙","Ceia":"🌃"};
    const tipoHoras = {"Café da Manhã":"Pela manhã","Almoço":"12h-14h","Lanche":"15h-17h","Jantar":"19h-21h","Ceia":"Antes de dormir"};

    // Agrupa refeições por tipo
    const grupos = {};
    tipos.forEach(t => grupos[t] = []);
    STATE.mealsToday.forEach(m => {
      const t = m.tipo_refeicao || "Almoço";
      if (!grupos[t]) grupos[t] = [];
      grupos[t].push(m);
    });

    const totalKcal = STATE.mealsToday.reduce((s,r) => s + (r.calorias || 0), 0);
    const totalProt = STATE.mealsToday.reduce((s,r) => s + (+r.proteinas || 0), 0);

    box.innerHTML = `
      <div class="two-col">
        <div>
          <div class="hoje-summary">
            <div class="hs-stat">
              <div class="hs-l">Total hoje</div>
              <div class="hs-v">${totalKcal}<small>kcal</small></div>
            </div>
            <div class="hs-stat">
              <div class="hs-l">Refeições</div>
              <div class="hs-v">${STATE.mealsToday.length}</div>
            </div>
            <div class="hs-stat">
              <div class="hs-l">Proteínas</div>
              <div class="hs-v">${Math.round(totalProt)}<small>g</small></div>
            </div>
          </div>

          ${tipos.map(tipo => {
            const meals = grupos[tipo];
            const kcalTipo = meals.reduce((s,m) => s + (m.calorias || 0), 0);
            return `
              <div class="meal-card ${meals.length ? "has-meals" : ""}">
                <div class="meal-card-head">
                  <div class="meal-card-ico">${tipoIcons[tipo]}</div>
                  <div class="meal-card-info">
                    <div class="meal-card-title">${tipo}</div>
                    <div class="meal-card-sub">${tipoHoras[tipo]}</div>
                  </div>
                  <div class="meal-card-kcal">${kcalTipo > 0 ? kcalTipo + " kcal" : ""}</div>
                  <button class="btn-ghost-icon" onclick="PAGE_REFEICOES.quickLogTipo('${tipo}')" title="Adicionar ${tipo}">
                    <svg viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
                  </button>
                </div>
                ${meals.length ? `
                  <div class="meal-card-list">
                    ${meals.map(m => `
                      <div class="meal-line">
                        <span class="ml-nome">${esc(m.nome)}${m.quantidade ? ` <span class="ml-qty">(${esc(m.quantidade)})</span>` : ""}</span>
                        <span class="ml-macros">${Math.round(+m.proteinas||0)}p · ${Math.round(+m.carboidratos||0)}c · ${Math.round(+m.gorduras||0)}g</span>
                        <span class="ml-kcal">${m.calorias || 0}kcal</span>
                        <button class="meal-del" onclick="PAGE_REFEICOES.delMeal('${m.id}')">✕</button>
                      </div>
                    `).join("")}
                  </div>
                ` : `<div class="meal-card-empty">Nenhum ${tipo.toLowerCase()} registrado</div>`}
              </div>
            `;
          }).join("")}
        </div>
        <div>
          <div class="card">
            <div class="card-head"><h3>Macros hoje</h3></div>
            ${this._donutHTML()}
          </div>
          <div class="card card-ai">
            <div class="ai-badge">Dica rápida</div>
            <p style="font-size:12px;color:var(--text2);line-height:1.6;margin-bottom:10px">${this._dicaDoDia()}</p>
            <button class="btn-primary btn-sm" style="width:100%" onclick="UI.go('#/ia')">Conversar com a IA →</button>
          </div>
        </div>
      </div>
    `;
    this._fillDonut();
  },

  _donutHTML() {
    return `
      <div class="donut-wrap">
        <svg class="donut-svg" viewBox="0 0 110 110">
          <circle cx="55" cy="55" r="42" fill="none" stroke="var(--s3)" stroke-width="14"/>
          <circle cx="55" cy="55" r="42" fill="none" stroke="#f5a623" stroke-width="14" id="dn-c" stroke-dasharray="0 264" stroke-linecap="round" transform="rotate(-90 55 55)"/>
          <circle cx="55" cy="55" r="42" fill="none" stroke="#4a9eff" stroke-width="14" id="dn-p" stroke-dasharray="0 264" stroke-linecap="round" transform="rotate(-90 55 55)"/>
          <circle cx="55" cy="55" r="42" fill="none" stroke="#f05e74" stroke-width="14" id="dn-g" stroke-dasharray="0 264" stroke-linecap="round" transform="rotate(-90 55 55)"/>
        </svg>
        <div class="donut-ctr"><b id="dn-k">0</b><small>kcal</small></div>
      </div>
      <div class="leg-list">
        <div class="leg-row"><span style="background:#f5a623"></span>Carb<b id="dn-lc">0g</b></div>
        <div class="leg-row"><span style="background:#4a9eff"></span>Prot<b id="dn-lp">0g</b></div>
        <div class="leg-row"><span style="background:#f05e74"></span>Gord<b id="dn-lg">0g</b></div>
        <div class="leg-row"><span style="background:#2dd4c0"></span>Fibra<b id="dn-lf">0g</b></div>
      </div>
    `;
  },

  _fillDonut() {
    const m = STATE.mealsToday;
    const kcal = m.reduce((s,r) => s + (r.calorias || 0), 0);
    const prot = m.reduce((s,r) => s + (+r.proteinas || 0), 0);
    const carb = m.reduce((s,r) => s + (+r.carboidratos || 0), 0);
    const gord = m.reduce((s,r) => s + (+r.gorduras || 0), 0);
    const fib  = m.reduce((s,r) => s + (+r.fibras || 0), 0);
    const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
    set("dn-k", kcal);
    set("dn-lc", Math.round(carb) + "g");
    set("dn-lp", Math.round(prot) + "g");
    set("dn-lg", Math.round(gord) + "g");
    set("dn-lf", Math.round(fib) + "g");

    const total = carb + prot + gord || 1, c = 264;
    const cC = (carb/total)*c, cP = (prot/total)*c, cG = (gord/total)*c;
    const da = (id, val, off) => {
      const e = $(id); if (!e) return;
      e.setAttribute("stroke-dasharray", `${val.toFixed(1)} ${c}`);
      e.setAttribute("stroke-dashoffset", String(off));
    };
    da("dn-c", cC, 0);
    da("dn-p", cP, -cC);
    da("dn-g", cG, -(cC + cP));
  },

  _dicaDoDia() {
    const p = STATE.profile || {};
    const hora = new Date().getHours();
    if (hora < 10) return "☀️ Um bom café da manhã com proteína ajuda a controlar a fome o dia todo.";
    if (hora < 13) return "🥗 Monte seu prato assim: metade de vegetais, 1/4 de proteína, 1/4 de carboidrato.";
    if (hora < 17) return "🍎 Lanches com fibra + proteína (ex: maçã com pasta de amendoim) saciam mais.";
    if (p.objetivo === "emagrecer") return "🌙 Jantares leves favorecem a queima de gordura durante o sono.";
    return "💧 Beba 1 copo de água antes de cada refeição — ajuda na digestão e saciedade.";
  },

  async quickLogTipo(tipo) {
    const nome = prompt(`O que você comeu no ${tipo}?\n(ex: "200g frango grelhado com arroz")`);
    if (!nome?.trim()) return;

    TOAST.show("Estimando calorias...");
    let kcal=0, prot=0, carb=0, gord=0, fibra=0;
    try {
      const r = await AI.call(
        `Valores nutricionais para "${nome.trim()}". Responda SOMENTE em JSON puro, sem texto extra: {"calorias":N,"proteinas":N,"carboidratos":N,"gorduras":N,"fibras":N}`,
        "nutricao"
      );
      const match = r.match(/\{[\s\S]*?\}/);
      if (match) {
        const o = JSON.parse(match[0]);
        kcal  = Math.round(+o.calorias     || 0);
        prot  = Math.round(+o.proteinas    || 0);
        carb  = Math.round(+o.carboidratos || 0);
        gord  = Math.round(+o.gorduras     || 0);
        fibra = Math.round(+o.fibras       || 0);
      }
    } catch (_) {}

    try {
      const { data } = await API.insert("meals", {
        user_id: STATE.user.id, nome: nome.trim(), quantidade: "",
        tipo_refeicao: tipo, calorias: kcal, proteinas: prot, carboidratos: carb,
        gorduras: gord, fibras: fibra, data_registro: todayISO(),
      }, { select: true, single: true });

      STATE.mealsToday.unshift(data);
      this._renderHoje($("tab-content"));
      TOAST.show(`✓ ${tipo} registrado! (${kcal} kcal)`);
    } catch (e) {
      TOAST.show("Erro: " + e.message, "err");
    }
  },

  // ═════════ REGISTRAR (form tradicional) ═════════
  _renderRegistrar(box) {
    box.innerHTML = `
      <div class="two-col">
        <div>
          <div class="card">
            <div class="card-head"><h3>Nova refeição</h3></div>
            <div class="frow2-wide">
              <div class="field"><label>Alimento</label><input id="food-name" type="text" placeholder="Ex: Frango grelhado"/></div>
              <div class="field"><label>Quantidade</label><input id="food-qty" type="text" placeholder="150g"/></div>
              <div class="field"><label>Tipo</label>
                <select id="food-meal">
                  <option>Café da Manhã</option><option>Almoço</option><option>Lanche</option><option>Jantar</option><option>Ceia</option>
                </select>
              </div>
            </div>
            <div class="btn-row">
              <button class="btn-primary" id="btn-log" onclick="PAGE_REFEICOES.log()">Registrar</button>
              <button class="btn-secondary" onclick="PAGE_REFEICOES.estimar()">✦ Estimar com IA</button>
            </div>
            <div id="food-ai" style="display:none"></div>
          </div>
        </div>
        <div>
          <div class="card">
            <div class="card-head"><h3>Macros hoje</h3></div>
            ${this._donutHTML()}
          </div>
        </div>
      </div>
    `;
    this._fillDonut();
  },

  async estimar() {
    const nome = $("food-name")?.value?.trim();
    if (!nome) return TOAST.show("Digite o alimento primeiro.", "err");
    const qty = $("food-qty")?.value?.trim();
    await AI.showIn("food-ai",
      `Estime valores nutricionais completos para "${nome}"${qty ? `, ${qty}` : ""}. Calorias, proteínas, carboidratos, gorduras, fibras. Seja breve.`,
      "nutricao");
  },

  async log() {
    const nome = $("food-name")?.value?.trim();
    const qty  = $("food-qty")?.value?.trim();
    const tipo = $("food-meal")?.value;
    const btn  = $("btn-log");
    if (!nome) return TOAST.show("Digite o alimento.", "err");
    if (!btn)  return;

    btn.disabled = true; btn.textContent = "Estimando...";
    let kcal=0, prot=0, carb=0, gord=0, fibra=0;
    try {
      const r = await AI.call(
        `Valores nutricionais para "${nome}"${qty ? `, ${qty}` : " porção padrão"}. Responda SOMENTE em JSON puro: {"calorias":N,"proteinas":N,"carboidratos":N,"gorduras":N,"fibras":N}`,
        "nutricao");
      const match = r.match(/\{[\s\S]*?\}/);
      if (match) {
        const o = JSON.parse(match[0]);
        kcal  = Math.round(+o.calorias     || 0);
        prot  = Math.round(+o.proteinas    || 0);
        carb  = Math.round(+o.carboidratos || 0);
        gord  = Math.round(+o.gorduras     || 0);
        fibra = Math.round(+o.fibras       || 0);
      }
    } catch (_) {}

    btn.textContent = "Salvando...";
    try {
      const { data } = await API.insert("meals", {
        user_id: STATE.user.id, nome, quantidade: qty, tipo_refeicao: tipo,
        calorias: kcal, proteinas: prot, carboidratos: carb, gorduras: gord, fibras: fibra,
        data_registro: todayISO(),
      }, { select: true, single: true });

      STATE.mealsToday.unshift(data);
      const n = $("food-name"), q = $("food-qty"), r = $("food-ai");
      if (n) n.value = ""; if (q) q.value = ""; if (r) r.style.display = "none";
      this._fillDonut();
      TOAST.show(`✓ ${nome} registrado! (${kcal} kcal)`);

      // Volta pra aba Hoje pra ver o resultado
      setTimeout(() => {
        this._tab = "hoje";
        $$("#ref-tabs .sec-tab").forEach(b => b.classList.toggle("active", b.dataset.tab === "hoje"));
        this._renderTab(this._ctx);
      }, 600);
    } catch (e) {
      TOAST.show("Erro: " + e.message, "err");
    } finally {
      btn.disabled = false; btn.textContent = "Registrar";
    }
  },

  async delMeal(id) {
    try {
      await API.delete("meals", { id, user_id: STATE.user.id });
      STATE.mealsToday = STATE.mealsToday.filter(m => m.id !== id);
      const box = $("tab-content");
      if (box) this._renderHoje(box);
      TOAST.show("Refeição removida");
    } catch (e) {
      TOAST.show("Erro: " + e.message, "err");
    }
  },

  // ═════════ INGREDIENTES ═════════
  _renderIngredientes(box) {
    box.innerHTML = `
      <div class="two-col">
        <div>
          <div class="card">
            <div class="card-head"><h3>Adicionar ingrediente</h3></div>
            <div class="frow2">
              <div class="field"><label>Nome</label><input id="ing-name" type="text" placeholder="Ex: Peito de frango"/></div>
              <div class="field"><label>Quantidade</label><input id="ing-qty" type="text" placeholder="500g"/></div>
            </div>
            <div class="field"><label>Categoria</label>
              <div class="cat-pills" id="cat-pills">
                ${["Proteínas","Carboidratos","Vegetais","Frutas","Laticínios","Temperos","Outros"].map(c =>
                  `<button class="cpill ${STATE.selectedCat===c?"active":""}" data-cat="${c}">${this._catIcon(c)} ${c}</button>`
                ).join("")}
              </div>
            </div>
            <button class="btn-primary" id="btn-add-ing" onclick="PAGE_REFEICOES.addIng()">Adicionar</button>
          </div>
          <div class="card">
            <div class="card-head"><h3>Cadastrados</h3><span class="chip" id="ing-count">${STATE.ingredients.length} itens</span></div>
            <div id="ing-list"></div>
          </div>
        </div>
        <div>
          <div class="card card-ai">
            <div class="ai-badge">IA pronta</div>
            <div class="stat-mini-row">
              <div class="stat-mini"><b>${STATE.ingredients.length}</b><small>ingredientes</small></div>
              <div class="stat-mini"><b>${new Set(STATE.ingredients.map(i => i.categoria)).size}</b><small>categorias</small></div>
            </div>
            <button class="btn-primary btn-sm" style="width:100%;margin-top:12px" onclick="UI.go('#/ia')">✦ Gerar receitas</button>
          </div>
        </div>
      </div>
    `;
    $$("#cat-pills .cpill").forEach(p => {
      p.onclick = () => {
        $$("#cat-pills .cpill").forEach(x => x.classList.remove("active"));
        p.classList.add("active");
        STATE.selectedCat = p.dataset.cat;
      };
    });
    this._renderIngList();
  },

  _catIcon(c) {
    return {"Proteínas":"🥩","Carboidratos":"🍚","Vegetais":"🥦","Frutas":"🍎","Laticínios":"🥛","Temperos":"🧄","Outros":"📦"}[c] || "📦";
  },

  _renderIngList() {
    const box = $("ing-list");
    const cnt = $("ing-count");
    if (cnt) cnt.textContent = `${STATE.ingredients.length} itens`;
    if (!box) return;
    if (!STATE.ingredients.length) {
      box.innerHTML = `<div class="empty"><div class="eico">🧺</div><p>Nenhum ingrediente</p><small>Adicione acima para receitas com IA</small></div>`;
      return;
    }
    box.innerHTML = `<div class="ingr-chips">` +
      STATE.ingredients.map(i => `
        <div class="ichip">
          ${foodEmoji(i.nome)} ${esc(i.nome)}${i.quantidade ? ` · <span style="color:var(--text3)">${esc(i.quantidade)}</span>` : ""}
          <button class="ichip-del" onclick="PAGE_REFEICOES.delIng('${i.id}')">×</button>
        </div>
      `).join("") + `</div>`;
  },

  async addIng() {
    const nome = $("ing-name")?.value?.trim();
    const qty  = $("ing-qty")?.value?.trim();
    const cat  = STATE.selectedCat || "Outros";
    const btn  = $("btn-add-ing");
    if (!nome) return TOAST.show("Digite o nome do ingrediente.", "err");
    if (!btn) return;

    btn.disabled = true; btn.textContent = "Salvando...";
    try {
      const { data } = await API.insert("ingredients",
        { user_id: STATE.user.id, nome, quantidade: qty, categoria: cat },
        { select: true, single: true });
      STATE.ingredients.unshift(data);
      const n = $("ing-name"), q = $("ing-qty");
      if (n) n.value = ""; if (q) q.value = "";
      this._renderIngList();
      TOAST.show(`✓ ${nome} adicionado!`);
    } catch (e) {
      const msg = e.code === "42501" || (e.message && e.message.includes("row-level"))
        ? "Erro de permissão RLS. Execute supabase_schema.sql."
        : (e.message || "Erro");
      TOAST.show(msg, "err");
    } finally {
      btn.disabled = false; btn.textContent = "Adicionar";
    }
  },

  async delIng(id) {
    try {
      await API.delete("ingredients", { id, user_id: STATE.user.id });
      STATE.ingredients = STATE.ingredients.filter(i => i.id !== id);
      this._renderIngList();
      TOAST.show("Removido");
    } catch (e) {
      TOAST.show("Erro: " + e.message, "err");
    }
  },
};

ROUTER.register("refeicoes", PAGE_REFEICOES);
