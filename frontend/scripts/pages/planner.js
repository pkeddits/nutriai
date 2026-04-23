// pages/planner.js - planejamento semanal de refeições
// a IA gera um plano completo que o usuário pode salvar ou editar
const PAGE_PLANNER = {
  _plans:   {},     // { "Segunda|Almoço": "descrição" }
  _preview: null,   // objeto { "Segunda|Almoço": "...", ... } gerado pela IA
  _lastRaw: "",     // última resposta crua da IA (para editar)

  async render(main, ctx) {
    const mon = getMondayISO();
    const end = new Date(mon); end.setDate(end.getDate() + 6);

    main.innerHTML = `
      <div class="page-head">
        <div>
          <h1>Planner Semanal</h1>
          <p class="page-sub">${new Date(mon).toLocaleDateString("pt-BR")} — ${end.toLocaleDateString("pt-BR")}</p>
        </div>
        <div class="page-actions">
          <button class="btn-secondary btn-sm" onclick="PAGE_PLANNER.clear()">Limpar</button>
          <button class="btn-primary btn-sm" onclick="PAGE_PLANNER.generate()">✦ Gerar com IA</button>
        </div>
      </div>

      ${GUIDE.box("planner", "Planner Semanal",
        "Clique em qualquer célula para editar manualmente. Ou use <b>✦ Gerar com IA</b> para criar um plano completo baseado nos seus ingredientes e objetivo. Depois de gerado, você pode <b>adicionar ao planner</b> de uma vez ou <b>editar com IA</b> (ex: \"troque os jantares por opções low-carb\").")}

      <div id="planner-preview" style="display:none"></div>

      <div class="planner-grid" id="planner-grid">
        <div class="skel-lines" style="grid-column:1/-1"><div></div><div></div></div>
      </div>
    `;

    await this._load(ctx);
    if (!ctx.ok()) return;
    this._renderGrid();
  },

  async _load(ctx) {
    const mon = getMondayISO();
    try {
      const { data } = await API.select("meal_plans", {
        eq: { user_id: STATE.user.id, semana_inicio: mon },
      });
      if (!ctx.ok()) return;
      this._plans = {};
      (data || []).forEach(p => {
        this._plans[`${p.dia_semana}|${p.tipo_refeicao}`] = p.descricao;
      });
    } catch (e) {
      if (!ctx.ok()) return;
      console.error("[Planner]", e.message);
    }
  },

  _renderGrid() {
    const el = $("planner-grid");
    if (!el) return;
    const dias = ["Segunda","Terça","Quarta","Quinta","Sexta","Sábado","Domingo"];
    const refs = ["Café da Manhã","Almoço","Jantar"];
    const mon  = new Date(getMondayISO());
    const td   = new Date();

    el.innerHTML = dias.map((d, i) => {
      const dt = new Date(mon); dt.setDate(dt.getDate() + i);
      const isToday = dt.toDateString() === td.toDateString();
      return `
        <div class="pday${isToday ? " today" : ""}">
          <div class="pday-name">${d.slice(0,3)}</div>
          ${refs.map(r => {
            const v = this._plans[`${d}|${r}`];
            return `
              <div class="pslot ${v ? "filled" : ""}" onclick="PAGE_PLANNER.edit('${d}','${r}')">
                <div class="pslot-type">${r.split(" ")[0]}</div>
                <div class="pslot-desc">${esc(v || "+ adicionar")}</div>
              </div>`;
          }).join("")}
        </div>`;
    }).join("");
  },

  async edit(dia, ref) {
    const cur = this._plans[`${dia}|${ref}`] || "";
    const novo = prompt(`${dia} — ${ref}\n(vazio para remover)`, cur);
    if (novo === null) return;

    const mon = getMondayISO();
    try {
      if (!novo.trim()) {
        await API.delete("meal_plans", {
          user_id: STATE.user.id, semana_inicio: mon, dia_semana: dia, tipo_refeicao: ref,
        });
        delete this._plans[`${dia}|${ref}`];
      } else {
        await API.upsert("meal_plans", {
          user_id: STATE.user.id, semana_inicio: mon,
          dia_semana: dia, tipo_refeicao: ref, descricao: novo.trim(),
        }, { onConflict: "user_id,semana_inicio,dia_semana,tipo_refeicao" });
        this._plans[`${dia}|${ref}`] = novo.trim();
      }
      this._renderGrid();
      TOAST.show("✓ Atualizado");
    } catch (e) {
      TOAST.show("Erro: " + e.message, "err");
    }
  },

  async generate() {
    const ing = STATE.ingredients.map(i => i.nome).slice(0, 20).join(", ") || "variados";
    const obj = STATE.profile?.objetivo?.replace("_", " ") || "saúde geral";
    const meta = STATE.profile?.meta_calorias || 1800;

    await this._askIA(
      `Crie um plano alimentar para a semana (Segunda a Domingo), objetivo: ${obj}, meta ~${meta}kcal/dia, ingredientes disponíveis: ${ing}. Formato OBRIGATÓRIO (respeite exatamente):

Segunda-feira
- Café da Manhã: <descrição curta, 1 linha>
- Almoço: <descrição curta>
- Jantar: <descrição curta>

Terça-feira
- Café da Manhã: ...
- Almoço: ...
- Jantar: ...

E assim por diante até Domingo. Seja direto, sem introduções. Nada de markdown **negrito**, apenas texto puro.`
    );
  },

  async _askIA(prompt) {
    const box = $("planner-preview");
    if (!box) return;
    box.style.display = "block";
    box.innerHTML = `<div class="ai-resp"><div class="ai-badge">NutriAI gerando plano</div><div class="ld"><span></span><span></span><span></span></div></div>`;

    try {
      const raw = await AI.call(prompt, "planner");
      this._lastRaw = raw;
      this._preview = this._parsePlan(raw);

      if (Object.keys(this._preview).length < 3) {
        // Parse falhou — mostra bruto mas avisa
        box.innerHTML = `
          <div class="ai-resp">
            <div class="ai-badge">Plano gerado</div>
            <div class="ai-resp-body">${fmtAI(raw)}</div>
            <div style="margin-top:12px;padding:10px;background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.2);border-radius:8px;font-size:12px;color:#fca5a5">
              ⚠️ Não foi possível extrair o plano automaticamente. Tente gerar novamente ou clique nas células para editar manualmente.
            </div>
            <div style="display:flex;gap:8px;margin-top:10px">
              <button class="btn-secondary btn-sm" onclick="PAGE_PLANNER.generate()">Gerar novamente</button>
            </div>
          </div>`;
        return;
      }

      this._renderPreview();
    } catch (e) {
      box.innerHTML = `<div class="ai-resp" style="border-color:rgba(239,68,68,.25)"><div class="ai-badge" style="color:#fca5a5">Erro</div><div class="ai-resp-body">⚠️ ${esc(e.message)}</div></div>`;
    }
  },

  _parsePlan(raw) {
    // Converte "Segunda-feira\n- Café da Manhã: xxx\n- Almoço: yyy" em objeto
    const out = {};
    const diaMap = {
      "segunda":"Segunda","terca":"Terça","terça":"Terça","quarta":"Quarta",
      "quinta":"Quinta","sexta":"Sexta","sabado":"Sábado","sábado":"Sábado","domingo":"Domingo",
    };
    const refMap = {
      "cafe":"Café da Manhã","café":"Café da Manhã","cafedamanha":"Café da Manhã","cafedamanhã":"Café da Manhã",
      "almoco":"Almoço","almoço":"Almoço","jantar":"Jantar","lanche":"Lanche",
    };
    const normalize = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z]/g,"");

    let diaAtual = null;
    const lines = raw.split(/\n/);
    for (const line of lines) {
      const l = line.trim();
      if (!l) continue;

      // É um dia? (começa com "Segunda-feira", "Terça-feira"...)
      const diaMatch = l.match(/^(?:##?\s*)?\*?\*?(segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo)[\w\-\s]*/i);
      if (diaMatch && l.length < 25) {
        const key = normalize(diaMatch[1]);
        if (diaMap[key]) { diaAtual = diaMap[key]; continue; }
      }

      // É uma refeição? Formato: "- Café da Manhã: xxx" ou "* Almoço: xxx" ou "Jantar: xxx"
      const refMatch = l.match(/^[\s\-\*•]*\*?\*?(Café da Manhã|Café|Almoço|Jantar|Lanche)\*?\*?\s*:?\s*(.+)$/i);
      if (refMatch && diaAtual) {
        const refKey = normalize(refMatch[1]);
        const ref = refMap[refKey];
        if (!ref) continue;
        const desc = refMatch[2]
          .replace(/\*\*/g, "")
          .replace(/^[-–:]\s*/, "")
          .trim();
        if (desc && desc.length > 2) {
          out[`${diaAtual}|${ref}`] = desc.slice(0, 200);
        }
      }
    }
    return out;
  },

  _renderPreview() {
    const box = $("planner-preview");
    if (!box) return;
    const count = Object.keys(this._preview).length;

    box.innerHTML = `
      <div class="ai-resp">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div class="ai-badge">Plano gerado pela IA</div>
          <span class="chip">${count} refeições</span>
        </div>
        <div class="preview-plan">
          ${["Segunda","Terça","Quarta","Quinta","Sexta","Sábado","Domingo"].map(d => {
            const cafe   = this._preview[`${d}|Café da Manhã`];
            const almoco = this._preview[`${d}|Almoço`];
            const jantar = this._preview[`${d}|Jantar`];
            if (!cafe && !almoco && !jantar) return "";
            return `
              <div class="pv-day">
                <div class="pv-day-name">${d}</div>
                ${cafe   ? `<div class="pv-ref"><span class="pv-tp">🌅 Café</span>${esc(cafe)}</div>` : ""}
                ${almoco ? `<div class="pv-ref"><span class="pv-tp">☀️ Almoço</span>${esc(almoco)}</div>` : ""}
                ${jantar ? `<div class="pv-ref"><span class="pv-tp">🌙 Jantar</span>${esc(jantar)}</div>` : ""}
              </div>`;
          }).join("")}
        </div>
        <div class="preview-actions">
          <button class="btn-primary" onclick="PAGE_PLANNER.savePreview()">✓ Adicionar ao Planner</button>
          <button class="btn-secondary" onclick="PAGE_PLANNER.editWithIA()">✎ Editar com IA</button>
          <button class="btn-ghost-md" onclick="PAGE_PLANNER.discardPreview()">Descartar</button>
        </div>
      </div>
    `;
  },

  async savePreview() {
    if (!this._preview || !Object.keys(this._preview).length) return;
    const mon = getMondayISO();
    const rows = Object.entries(this._preview).map(([key, desc]) => {
      const [dia, ref] = key.split("|");
      return {
        user_id: STATE.user.id,
        semana_inicio: mon,
        dia_semana: dia,
        tipo_refeicao: ref,
        descricao: desc,
      };
    });

    try {
      // Upsert em lote
      await API.upsert("meal_plans", rows, {
        onConflict: "user_id,semana_inicio,dia_semana,tipo_refeicao",
      });

      // Atualiza estado local
      Object.assign(this._plans, this._preview);
      this._preview = null;
      const box = $("planner-preview");
      if (box) box.style.display = "none";

      this._renderGrid();
      TOAST.show(`✓ ${rows.length} refeições salvas no planner!`);

      // Notificação
      NOTIF.create("📅 Planner atualizado", `${rows.length} refeições adicionadas automaticamente pela IA`, "success").catch(() => {});
    } catch (e) {
      TOAST.show("Erro ao salvar: " + e.message, "err");
    }
  },

  async editWithIA() {
    const instrucao = prompt(
      "O que você quer mudar no plano?\n\nExemplos:\n- Troque todos os jantares por opções low-carb\n- Adicione mais proteína no café da manhã\n- Use menos frango e mais peixe",
      ""
    );
    if (!instrucao || !instrucao.trim()) return;

    const prompt_full = `Aqui está um plano alimentar semanal:

${this._lastRaw}

Usuário pediu: "${instrucao.trim()}"

Refaça o plano aplicando essa mudança. Use O MESMO FORMATO:

Segunda-feira
- Café da Manhã: ...
- Almoço: ...
- Jantar: ...

(e assim para todos os 7 dias, sem markdown de negrito)`;

    await this._askIA(prompt_full);
  },

  discardPreview() {
    this._preview = null;
    this._lastRaw = "";
    const box = $("planner-preview");
    if (box) { box.style.display = "none"; box.innerHTML = ""; }
  },

  async clear() {
    if (!confirm("Limpar planner da semana inteira?")) return;
    const mon = getMondayISO();
    try {
      await API.delete("meal_plans", { user_id: STATE.user.id, semana_inicio: mon });
      this._plans = {};
      this._renderGrid();
      TOAST.show("Planner limpo");
    } catch (e) {
      TOAST.show("Erro: " + e.message, "err");
    }
  },
};

ROUTER.register("planner", PAGE_PLANNER);
