// pages/compras.js — com preview da IA + salvar em lote
const PAGE_COMPRAS = {
  _items:   [],
  _preview: null,   // array [{nome, quantidade, categoria}, ...]
  _lastRaw: "",

  async render(main, ctx) {
    main.innerHTML = `
      <div class="page-head">
        <div><h1>Lista de Compras</h1><p class="page-sub">Organize suas compras da semana</p></div>
        <div class="page-actions">
          <button class="btn-secondary btn-sm" onclick="PAGE_COMPRAS.toggleForm()">+ Item</button>
          <button class="btn-primary btn-sm" onclick="PAGE_COMPRAS.generate()">✦ Gerar com IA</button>
        </div>
      </div>

      ${GUIDE.box("compras", "Lista inteligente",
        "Adicione itens manualmente ou use <b>✦ Gerar com IA</b> para criar uma lista completa. Depois de gerada, você pode <b>✓ Salvar lista completa</b> (adiciona todos os itens de uma vez), <b>✎ Editar com IA</b> ou <b>Descartar</b>. Marque a caixinha quando comprar.")}

      <div id="shop-ai" style="display:none"></div>

      <div class="card" id="shop-form" style="display:none">
        <div class="card-head"><h3>Novo item</h3></div>
        <div class="frow3">
          <div class="field" style="grid-column:span 2"><label>Item</label><input id="s-nome" type="text" placeholder="Ex: Arroz integral"/></div>
          <div class="field"><label>Quantidade</label><input id="s-qty" type="text" placeholder="1kg"/></div>
        </div>
        <div class="field"><label>Categoria</label>
          <select id="s-cat">
            <option>Proteínas</option><option>Vegetais & Frutas</option><option>Carboidratos</option><option>Laticínios</option><option>Outros</option>
          </select>
        </div>
        <div class="btn-row">
          <button class="btn-primary btn-sm" onclick="PAGE_COMPRAS.add()">Adicionar</button>
          <button class="btn-ghost-md" onclick="PAGE_COMPRAS.toggleForm()">Cancelar</button>
        </div>
      </div>

      <div id="shop-list"><div class="skel-lines"><div></div><div></div></div></div>
    `;

    await this._load(ctx);
    if (!ctx.ok()) return;
    this._render();
  },

  async _load(ctx) {
    try {
      const { data } = await API.select("shopping_list", {
        eq: { user_id: STATE.user.id },
        order: { col: "created_at", asc: false },
      });
      if (!ctx.ok()) return;
      this._items = data || [];
    } catch (e) {
      if (!ctx.ok()) return;
      console.error("[Compras]", e.message);
      this._items = [];
    }
  },

  _render() {
    const box = $("shop-list");
    if (!box) return;
    if (!this._items.length) {
      box.innerHTML = `<div class="card"><div class="empty"><div class="eico">🛒</div><p>Lista vazia</p><small>Adicione manualmente ou use <b>✦ Gerar com IA</b></small></div></div>`;
      return;
    }
    const groups = {};
    this._items.forEach(i => {
      const c = i.categoria || "Outros";
      (groups[c] ||= []).push(i);
    });
    const totalItens    = this._items.length;
    const totalComprados = this._items.filter(i => i.comprado).length;

    box.innerHTML = `
      <div class="shop-summary">
        <div><b>${totalItens}</b> itens · <b>${totalComprados}</b> comprados</div>
        <div class="shop-prog"><div class="shop-prog-fill" style="width:${totalItens ? (totalComprados/totalItens)*100 : 0}%"></div></div>
      </div>
      ${Object.entries(groups).map(([cat, its]) => `
        <div class="shop-group">
          <div class="shop-group-title">${esc(cat)} · ${its.length}</div>
          ${its.map(i => `
            <div class="sitem">
              <div class="schk ${i.comprado ? "checked" : ""}" onclick="PAGE_COMPRAS.toggle('${i.id}',${i.comprado})">${i.comprado ? "✓" : ""}</div>
              <span class="sname ${i.comprado ? "done" : ""}">${esc(i.nome)}</span>
              <span class="sqty">${esc(i.quantidade || "")}</span>
              <button class="sdel" onclick="PAGE_COMPRAS.del('${i.id}')">✕</button>
            </div>
          `).join("")}
        </div>
      `).join("")}
    `;
  },

  toggleForm() {
    const f = $("shop-form");
    if (f) f.style.display = f.style.display === "none" ? "block" : "none";
  },

  async add() {
    const nome = $("s-nome")?.value?.trim();
    const qty  = $("s-qty")?.value?.trim();
    const cat  = $("s-cat")?.value || "Outros";
    if (!nome) return TOAST.show("Digite o nome do item.", "err");
    try {
      const { data } = await API.insert("shopping_list",
        { user_id: STATE.user.id, nome, quantidade: qty, categoria: cat },
        { select: true, single: true });
      this._items.unshift(data);
      const n = $("s-nome"), q = $("s-qty"), f = $("shop-form");
      if (n) n.value = ""; if (q) q.value = ""; if (f) f.style.display = "none";
      this._render();
      TOAST.show(`✓ ${nome} adicionado`);
    } catch (e) {
      TOAST.show("Erro: " + e.message, "err");
    }
  },

  async toggle(id, was) {
    try {
      await API.update("shopping_list", { comprado: !was }, { id, user_id: STATE.user.id });
      const it = this._items.find(x => x.id === id);
      if (it) it.comprado = !was;
      this._render();
    } catch (e) {
      TOAST.show("Erro: " + e.message, "err");
    }
  },

  async del(id) {
    try {
      await API.delete("shopping_list", { id, user_id: STATE.user.id });
      this._items = this._items.filter(i => i.id !== id);
      this._render();
      TOAST.show("Item removido");
    } catch (e) {
      TOAST.show("Erro: " + e.message, "err");
    }
  },

  // ═════════ IA: gerar, preview, salvar em lote ═════════
  async generate() {
    const obj = STATE.profile?.objetivo?.replace("_", " ") || "saúde geral";
    await this._askIA(
      `Gere uma lista de compras semanal para objetivo: ${obj}. Formato OBRIGATÓRIO (apenas):

Proteínas
- 1kg Peito de frango
- 200g Salmão
- 1 dúzia Ovos

Vegetais & Frutas
- 1 maço Couve
- 500g Brócolis
- 6 Maçãs

Carboidratos
- 1kg Arroz integral
- 500g Batata doce
- 500g Aveia

Laticínios
- 1L Leite desnatado
- 500g Iogurte natural

Outros
- 500ml Azeite de oliva
- Sal, pimenta, alho

Use EXATAMENTE essas 5 categorias: Proteínas, Vegetais & Frutas, Carboidratos, Laticínios, Outros. Cada item começa com "- " seguido da quantidade e nome. Nada de markdown **negrito**, apenas texto puro. Sem introduções nem despedidas.`
    );
  },

  async _askIA(prompt) {
    const box = $("shop-ai");
    if (!box) return;
    box.style.display = "block";
    box.innerHTML = `<div class="ai-resp"><div class="ai-badge">NutriAI gerando lista</div><div class="ld"><span></span><span></span><span></span></div></div>`;

    try {
      const raw = await AI.call(prompt, "compras");
      this._lastRaw = raw;
      this._preview = this._parseList(raw);

      if (!this._preview.length) {
        box.innerHTML = `
          <div class="ai-resp">
            <div class="ai-badge">Lista gerada</div>
            <div class="ai-resp-body">${fmtAI(raw)}</div>
            <div style="margin-top:12px;padding:10px;background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.2);border-radius:8px;font-size:12px;color:#fca5a5">
              ⚠️ Não foi possível extrair os itens automaticamente. Tente gerar novamente.
            </div>
            <div style="display:flex;gap:8px;margin-top:10px">
              <button class="btn-secondary btn-sm" onclick="PAGE_COMPRAS.generate()">Gerar novamente</button>
            </div>
          </div>`;
        return;
      }

      this._renderPreview();
    } catch (e) {
      box.innerHTML = `<div class="ai-resp" style="border-color:rgba(239,68,68,.25)"><div class="ai-badge" style="color:#fca5a5">Erro</div><div class="ai-resp-body">⚠️ ${esc(e.message)}</div></div>`;
    }
  },

  _parseList(raw) {
    // Converte texto estruturado em array
    const catMap = {
      "proteinas":"Proteínas","proteínas":"Proteínas","prot":"Proteínas",
      "vegetais":"Vegetais & Frutas","vegetaisfrutas":"Vegetais & Frutas","vegetaiseeffrutas":"Vegetais & Frutas",
      "frutas":"Vegetais & Frutas","vegetaisefrutas":"Vegetais & Frutas",
      "carboidratos":"Carboidratos","carbs":"Carboidratos","carb":"Carboidratos",
      "laticinios":"Laticínios","laticínios":"Laticínios","lacteos":"Laticínios",
      "outros":"Outros","diversos":"Outros","temperos":"Outros",
    };
    const normalize = s => s.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/[^a-z]/g,"");

    const out = [];
    let catAtual = "Outros";

    for (const line of raw.split(/\n/)) {
      const l = line.trim();
      if (!l) continue;

      // É uma categoria? (linha curta sem "- " na frente)
      if (!l.startsWith("-") && !l.startsWith("*") && !l.startsWith("•") && l.length < 40) {
        const clean = l.replace(/[:\*#\-]/g, "").trim();
        const key = normalize(clean);
        if (catMap[key]) { catAtual = catMap[key]; continue; }
      }

      // É um item? Formato: "- 1kg Peito de frango" ou "* 1kg Peito..."
      const itemMatch = l.match(/^[\s\-\*•]+(.+)$/);
      if (itemMatch) {
        const txt = itemMatch[1].replace(/\*\*/g, "").trim();
        if (txt.length < 3) continue;

        // Tenta separar quantidade e nome (ex: "1kg Peito de frango")
        const qMatch = txt.match(/^([\d.,]+\s*(?:kg|g|mg|L|ml|l|un|unidade|unidades|dúzia|duzia|ma[cç]o|maço|pacote|potes?|d[úu]zia|pote|lata|latas|garrafa|sachê|sache|fil[ée]|fil[ée]s)?)\s+(.+)$/i);

        let nome, qty;
        if (qMatch) {
          qty = qMatch[1].trim();
          nome = qMatch[2].trim();
        } else {
          qty = "";
          nome = txt;
        }

        // Limita tamanho defensivamente
        if (nome.length > 100) nome = nome.slice(0, 100);
        if (qty.length > 40)   qty  = qty.slice(0, 40);

        out.push({ nome, quantidade: qty, categoria: catAtual });
      }
    }
    return out;
  },

  _renderPreview() {
    const box = $("shop-ai");
    if (!box) return;

    // Agrupa preview por categoria
    const groups = {};
    this._preview.forEach(i => {
      (groups[i.categoria] ||= []).push(i);
    });

    const total = this._preview.length;
    const numCats = Object.keys(groups).length;

    box.innerHTML = `
      <div class="ai-resp">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div class="ai-badge">Lista gerada pela IA</div>
          <span class="chip">${total} itens · ${numCats} categorias</span>
        </div>
        <div class="preview-shop">
          ${Object.entries(groups).map(([cat, its]) => `
            <div class="pvs-cat">
              <div class="pvs-cat-title">${esc(cat)} <span class="pvs-count">${its.length}</span></div>
              <ul class="pvs-list">
                ${its.map(i => `
                  <li>
                    <span class="pvs-qty">${esc(i.quantidade || "")}</span>
                    <span class="pvs-nome">${esc(i.nome)}</span>
                  </li>
                `).join("")}
              </ul>
            </div>
          `).join("")}
        </div>
        <div class="preview-actions">
          <button class="btn-primary" onclick="PAGE_COMPRAS.savePreview()">✓ Salvar lista completa</button>
          <button class="btn-secondary" onclick="PAGE_COMPRAS.editWithIA()">✎ Editar com IA</button>
          <button class="btn-secondary" onclick="PAGE_COMPRAS.generate()">🔄 Gerar outra</button>
          <button class="btn-ghost-md" onclick="PAGE_COMPRAS.discardPreview()">Descartar</button>
        </div>
      </div>
    `;
  },

  async savePreview() {
    if (!this._preview || !this._preview.length) return;

    const rows = this._preview.map(i => ({
      user_id: STATE.user.id,
      nome: i.nome,
      quantidade: i.quantidade,
      categoria: i.categoria,
      comprado: false,
    }));

    try {
      const { data } = await sb.from("shopping_list").insert(rows).select();
      if (data) this._items = [...data.reverse(), ...this._items];

      this._preview = null;
      this._lastRaw = "";
      const box = $("shop-ai");
      if (box) { box.style.display = "none"; box.innerHTML = ""; }

      this._render();
      TOAST.show(`✓ ${rows.length} itens adicionados à lista!`);
      NOTIF.create("🛒 Lista de compras atualizada", `${rows.length} itens adicionados automaticamente pela IA`, "success").catch(() => {});
    } catch (e) {
      TOAST.show("Erro ao salvar: " + e.message, "err");
    }
  },

  async editWithIA() {
    const instrucao = prompt(
      "O que você quer mudar na lista?\n\nExemplos:\n- Remova todos os laticínios\n- Adicione mais fontes de proteína vegetal\n- Troque o arroz por quinoa\n- Versão low-carb",
      ""
    );
    if (!instrucao || !instrucao.trim()) return;

    const p = `Aqui está uma lista de compras:

${this._lastRaw}

Usuário pediu: "${instrucao.trim()}"

Refaça a lista aplicando essa mudança. Use EXATAMENTE o mesmo formato:

Proteínas
- <quantidade> <nome>
...

Vegetais & Frutas
- ...

(e assim com as 5 categorias, sem markdown de negrito)`;

    await this._askIA(p);
  },

  discardPreview() {
    this._preview = null;
    this._lastRaw = "";
    const box = $("shop-ai");
    if (box) { box.style.display = "none"; box.innerHTML = ""; }
  },
};

ROUTER.register("lista-compras", PAGE_COMPRAS);
