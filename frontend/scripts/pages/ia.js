// pages/ia.js
const PAGE_IA = {
  _tab: "chat",

  async render(main, ctx) {
    // Permite deeplink com ?tipo=dieta etc
    if (ctx.params?.tipo) {
      const map = { dieta:"dieta", receita:"receitas", substituicao:"substituicoes" };
      this._tab = map[ctx.params.tipo] || "chat";
    }
    main.innerHTML = `
      <div class="page-head">
        <div><h1>IA Nutricional</h1><p class="page-sub">Pergunte, gere planos e receitas personalizadas</p></div>
      </div>

      ${GUIDE.box("ia", "5 modos de uso da IA",
        "<b>Chat</b>: dúvidas rápidas de nutrição. <b>Gerar Dieta</b>: plano semanal baseado no seu perfil. <b>Receitas</b>: criações com os ingredientes que você tem em casa. <b>Substituições</b>: alternativas saudáveis explicadas. <b>Histórico</b>: suas interações anteriores. Dica: quanto mais completo seu perfil, melhores as respostas.")}

      <div class="sec-tabs" id="ia-tabs">
        <button class="sec-tab ${this._tab==="chat"?"active":""}"           data-t="chat">Chat</button>
        <button class="sec-tab ${this._tab==="dieta"?"active":""}"          data-t="dieta">Gerar Dieta</button>
        <button class="sec-tab ${this._tab==="receitas"?"active":""}"       data-t="receitas">Receitas</button>
        <button class="sec-tab ${this._tab==="substituicoes"?"active":""}"  data-t="substituicoes">Substituições</button>
        <button class="sec-tab ${this._tab==="historico"?"active":""}"       data-t="historico">Histórico</button>
      </div>
      <div id="ia-content"></div>
    `;
    $$("#ia-tabs .sec-tab").forEach(b => {
      b.onclick = () => {
        this._tab = b.dataset.t;
        $$("#ia-tabs .sec-tab").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        this._renderTab(ctx);
      };
    });
    this._renderTab(ctx);
  },

  _renderTab(ctx) {
    if (!ctx.ok()) return;
    const box = $("ia-content");
    if (!box) return;
    if (this._tab === "chat")          return this._renderChat(box);
    if (this._tab === "dieta")         return this._renderDieta(box);
    if (this._tab === "receitas")      return this._renderReceitas(box);
    if (this._tab === "substituicoes") return this._renderSub(box);
    if (this._tab === "historico")     return this._renderHist(box, ctx);
  },

  _renderChat(box) {
    box.innerHTML = `
      <div class="card">
        <div class="card-head"><h3>Faça uma pergunta</h3></div>
        <div class="ai-row">
          <textarea id="ia-chat-q" rows="2" placeholder="Ex: Quantas calorias tem 100g de arroz integral?"></textarea>
          <button class="btn-primary" onclick="PAGE_IA.ask()">Enviar</button>
        </div>
        <div class="quick-prompts">
          <button class="qp" onclick="PAGE_IA.fill('Quais alimentos ricos em proteína para ganhar massa?')">💪 Proteína</button>
          <button class="qp" onclick="PAGE_IA.fill('Dicas para manter dieta no fim de semana')">🎉 Fim de semana</button>
          <button class="qp" onclick="PAGE_IA.fill('Melhores lanches saudáveis entre refeições')">🍎 Lanches</button>
          <button class="qp" onclick="PAGE_IA.fill('Como calcular meu TDEE corretamente?')">📊 TDEE</button>
          <button class="qp" onclick="PAGE_IA.fill('Quanto de água devo beber por dia?')">💧 Água</button>
        </div>
        <div id="ia-chat-resp" style="display:none"></div>
      </div>
    `;
  },

  fill(q) {
    const i = $("ia-chat-q");
    if (i) i.value = q;
  },

  async ask() {
    const q = $("ia-chat-q")?.value?.trim();
    if (!q) return TOAST.show("Digite sua pergunta.", "err");
    await AI.showIn("ia-chat-resp", q, "geral");
  },

  _renderDieta(box) {
    box.innerHTML = `
      <div class="card card-ai">
        <div class="ai-badge">Plano personalizado</div>
        <h3 style="font-size:15px;margin-bottom:6px">Gerar dieta com seu perfil</h3>
        <p class="card-desc">A IA usará seus dados (peso, altura, objetivo, ingredientes) para criar um plano alimentar semanal completo.</p>
        <button class="btn-primary" onclick="PAGE_IA.genDieta()">✦ Gerar meu plano</button>
        <div id="ia-dieta-resp" style="display:none;margin-top:14px"></div>
      </div>
    `;
  },

  async genDieta() {
    if (!STATE.profile?.objetivo) {
      TOAST.show("Complete seu perfil primeiro.", "err");
      return UI.go("#/perfil");
    }
    const p = STATE.profile;
    const ing = STATE.ingredients.map(i => i.nome).slice(0, 15).join(", ");
    await AI.showIn("ia-dieta-resp",
      `Crie um plano alimentar semanal personalizado: Peso ${p.peso||"?"}kg, Altura ${p.altura||"?"}cm, Idade ${p.idade||"?"}, Sexo ${p.sexo||"?"}, Objetivo: ${String(p.objetivo).replace("_"," ")}, Atividade: ${p.nivel_atividade||"?"}. Ingredientes disponíveis: ${ing||"variados"}. Inclua total diário de calorias e macros.`,
      "dieta");
  },

  _renderReceitas(box) {
    const nomes = STATE.ingredients.map(i => i.nome).join(", ");
    box.innerHTML = `
      <div class="card">
        <div class="card-head"><h3>Perguntar à IA</h3></div>
        <div class="ai-row">
          <input id="ia-rec-q" type="text" placeholder="Ex: jantar leve com frango e legumes..."/>
          <button class="btn-primary" onclick="PAGE_IA.askReceita()">Enviar</button>
        </div>
        <div id="ia-rec-resp" style="display:none"></div>
      </div>
      <div class="card card-ai">
        <div class="ai-badge">Com seus ingredientes</div>
        <p class="card-desc">${STATE.ingredients.length ? `Você tem ${STATE.ingredients.length} ingredientes: <strong>${esc(nomes.slice(0,120))}${nomes.length > 120 ? "..." : ""}</strong>` : "Cadastre ingredientes em Refeições → Ingredientes primeiro."}</p>
        <button class="btn-primary" onclick="PAGE_IA.genRec()" ${!STATE.ingredients.length ? "disabled" : ""}>✦ Gerar 4 receitas</button>
        <div id="ia-rec-gen" style="display:none;margin-top:14px"></div>
      </div>
    `;
  },

  async askReceita() {
    const q = $("ia-rec-q")?.value?.trim();
    if (!q) return TOAST.show("Digite sua pergunta.", "err");
    const nomes = STATE.ingredients.map(i => i.nome).join(", ") || "variados";
    await AI.showIn("ia-rec-resp", `Ingredientes: ${nomes}.\nPedido: ${q}`, "receita");
  },

  async genRec() {
    const nomes = STATE.ingredients.map(i => i.nome).join(", ");
    const obj = STATE.profile?.objetivo?.replace("_", " ") || "saúde geral";
    await AI.showIn("ia-rec-gen",
      `Ingredientes: ${nomes}. Objetivo: ${obj}. Sugira 4 receitas saudáveis variadas com modo de preparo e calorias estimadas.`,
      "receita");
  },

  _renderSub(box) {
    box.innerHTML = `
      <div class="card">
        <div class="card-head"><h3>Substituições inteligentes</h3></div>
        <div class="ai-row">
          <input id="ia-sub-q" type="text" placeholder="Ex: substituir arroz branco, fritar sem óleo..."/>
          <button class="btn-primary" onclick="PAGE_IA.askSub()">Buscar</button>
        </div>
        <div id="ia-sub-resp" style="display:none"></div>
      </div>
      <div class="tips-grid">
        <div class="tip-card"><b>🍚 Arroz Branco → Integral</b><p>3× mais fibras, menor índice glicêmico.</p></div>
        <div class="tip-card"><b>🍟 Fritar → Assar/Grelhar</b><p>Reduz até 60% das calorias.</p></div>
        <div class="tip-card"><b>🧂 Sal → Ervas e Limão</b><p>Manjericão, alecrim, limão sem sódio extra.</p></div>
        <div class="tip-card"><b>🧈 Manteiga → Azeite</b><p>Gorduras monoinsaturadas que protegem o coração.</p></div>
        <div class="tip-card"><b>🥛 Leite Integral → Vegetal</b><p>Aveia ou amêndoa: menos calorias.</p></div>
        <div class="tip-card"><b>🍫 Choc. ao Leite → 70%+</b><p>Mais flavonoides, menos açúcar.</p></div>
      </div>
    `;
  },

  async askSub() {
    const q = $("ia-sub-q")?.value?.trim();
    if (!q) return TOAST.show("Digite o que quer substituir.", "err");
    await AI.showIn("ia-sub-resp",
      `Alternativas saudáveis com benefícios nutricionais para: "${q}". Seja prático e motivador.`,
      "substituicao");
  },

  async _renderHist(box, ctx) {
    box.innerHTML = `<div class="card"><div class="skel-lines"><div></div><div></div><div></div></div></div>`;
    try {
      const { data } = await API.select("ai_history", {
        eq: { user_id: STATE.user.id },
        order: { col: "created_at", asc: false },
        limit: 30,
      });
      if (!ctx.ok()) return;
      if (!data || !data.length) {
        box.innerHTML = `<div class="card"><div class="empty"><div class="eico">🤖</div><p>Nenhuma interação ainda</p><small>Suas conversas com a IA aparecerão aqui</small></div></div>`;
        return;
      }
      const lbs = { dieta:"Plano Alimentar", receita:"Receitas", substituicao:"Substituições", nutricao:"Nutrição", planner:"Planner", compras:"Compras", geral:"Geral" };
      box.innerHTML = data.map(h => `
        <div class="hist-item">
          <div class="hist-meta">
            <span class="hist-tipo">${lbs[h.tipo] || h.tipo}</span>
            <span class="hist-date">${new Date(h.created_at).toLocaleDateString("pt-BR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</span>
          </div>
          <div class="hist-text">${esc((h.resposta || "").slice(0, 280))}${(h.resposta?.length || 0) > 280 ? "..." : ""}</div>
        </div>
      `).join("");
    } catch (e) {
      if (!ctx.ok()) return;
      box.innerHTML = `<div class="card"><div class="empty"><div class="eico">⚠️</div><p>Erro ao carregar histórico</p></div></div>`;
    }
  },
};

ROUTER.register("ia", PAGE_IA);
