// pages/perfil.js
const PAGE_PERFIL = {
  async render(main, ctx) {
    main.innerHTML = `
      <div class="page-head">
        <div><h1>Meu Perfil</h1><p class="page-sub">Dados completos para a IA personalizar tudo</p></div>
      </div>

      ${GUIDE.box("perfil", "Por que completar o perfil?",
        "Seus dados físicos (<b>peso, altura, idade, sexo</b>), nível de atividade e objetivo são usados pela IA para personalizar <b>planos, receitas e metas</b>. Clique em <b>\"📊 Calcular metas\"</b> para gerar automaticamente suas metas de calorias e macros usando a fórmula Mifflin-St Jeor.")}

      <div class="two-col">
        <div>
          <div class="card">
            <div class="card-head"><h3>Dados pessoais</h3></div>
            <div class="field"><label>Nome</label><input id="pf-nome" type="text" placeholder="Seu nome"/></div>
            <div class="field"><label>E-mail</label><input id="pf-email" type="email" disabled style="opacity:.5;cursor:not-allowed"/></div>
            <div class="btn-row">
              <button class="btn-secondary btn-sm" onclick="UI.openModal('modal-email')">Alterar e-mail</button>
              <button class="btn-secondary btn-sm" onclick="UI.openModal('modal-pw')">Alterar senha</button>
            </div>
          </div>

          <div class="card">
            <div class="card-head"><h3>Dados físicos</h3></div>
            <div class="frow3">
              <div class="field"><label>Peso (kg)</label><input id="pf-peso" type="number" step="0.1" placeholder="70"/></div>
              <div class="field"><label>Altura (cm)</label><input id="pf-altura" type="number" placeholder="170"/></div>
              <div class="field"><label>Idade</label><input id="pf-idade" type="number" placeholder="25"/></div>
            </div>
            <div class="frow2">
              <div class="field"><label>Sexo</label>
                <select id="pf-sexo">
                  <option value="">Selecione</option>
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                  <option value="outro">Prefiro não informar</option>
                </select>
              </div>
              <div class="field"><label>Nível de atividade</label>
                <select id="pf-ativ">
                  <option value="">Selecione</option>
                  <option value="sedentario">Sedentário</option>
                  <option value="leve">Levemente ativo</option>
                  <option value="moderado">Moderadamente ativo</option>
                  <option value="intenso">Muito ativo</option>
                </select>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-head"><h3>Objetivo nutricional</h3></div>
            <div class="field">
              <div class="goal-grid">
                <label class="gopt"><input type="radio" name="pf-obj" value="emagrecer"/><div class="gcard"><span>⚡</span><b>Emagrecer</b></div></label>
                <label class="gopt"><input type="radio" name="pf-obj" value="ganhar_massa"/><div class="gcard"><span>💪</span><b>Ganhar massa</b></div></label>
                <label class="gopt"><input type="radio" name="pf-obj" value="manutencao"/><div class="gcard"><span>⚖️</span><b>Manutenção</b></div></label>
                <label class="gopt"><input type="radio" name="pf-obj" value="saude_geral"/><div class="gcard"><span>🌿</span><b>Saúde</b></div></label>
              </div>
            </div>
            <div class="field"><label>Tipo de dieta</label>
              <select id="pf-dieta">
                <option value="equilibrada">Equilibrada</option>
                <option value="low_carb">Low-carb</option>
                <option value="vegetariana">Vegetariana</option>
                <option value="vegana">Vegana</option>
                <option value="mediterranea">Mediterrânea</option>
              </select>
            </div>
          </div>

          <div id="pf-msg" style="display:none;margin-bottom:12px"></div>
          <button class="btn-primary" id="btn-save-pf" onclick="PAGE_PERFIL.save()" style="width:100%">Salvar alterações</button>
        </div>

        <div>
          <div class="card card-ai">
            <div class="ai-badge">Metas calculadas</div>
            <p class="card-desc">Cálculo com fórmula Mifflin-St Jeor baseado no seu perfil.</p>
            <button class="btn-primary btn-sm" style="width:100%" onclick="PAGE_PERFIL.calcMetas()">📊 Calcular metas</button>
            <div id="metas-result" style="display:none;margin-top:14px"></div>
          </div>

          <div class="card">
            <div class="card-head"><h3>Status do perfil</h3></div>
            <div id="pf-status"></div>
          </div>
        </div>
      </div>
    `;

    this._fill();
    this._renderStatus();
  },

  _fill() {
    const p = STATE.profile || {};
    const set = (id, v) => { const e = $(id); if (e && v != null) e.value = v; };
    set("pf-nome",   p.nome);
    set("pf-email",  STATE.user?.email);
    set("pf-peso",   p.peso);
    set("pf-altura", p.altura);
    set("pf-idade",  p.idade);
    set("pf-sexo",   p.sexo);
    set("pf-ativ",   p.nivel_atividade);
    set("pf-dieta",  p.tipo_dieta || "equilibrada");
    if (p.objetivo) {
      const radio = document.querySelector(`input[name="pf-obj"][value="${p.objetivo}"]`);
      if (radio) radio.checked = true;
    }
  },

  _renderStatus() {
    const p = STATE.profile || {};
    const campos = ["nome","peso","altura","idade","sexo","nivel_atividade","objetivo"];
    const ok = campos.filter(c => p[c]).length;
    const pct = Math.round(ok / campos.length * 100);
    const el = $("pf-status");
    if (!el) return;
    el.innerHTML = `
      <div class="prog-ind">
        <span><b>${pct}%</b> completo</span>
        <div class="prog-bar"><div class="prog-bar-fill" style="width:${pct}%"></div></div>
      </div>
      <div class="metas-blk">
        <div class="metas-row"><span>Nome</span><b>${p.nome ? "✓" : "—"}</b></div>
        <div class="metas-row"><span>Dados físicos</span><b>${(p.peso && p.altura && p.idade) ? "✓" : "—"}</b></div>
        <div class="metas-row"><span>Objetivo</span><b>${p.objetivo ? "✓" : "—"}</b></div>
        <div class="metas-row"><span>Nível atividade</span><b>${p.nivel_atividade ? "✓" : "—"}</b></div>
      </div>
    `;
  },

  async save() {
    const btn = $("btn-save-pf");
    const msgEl = $("pf-msg");
    if (msgEl) msgEl.style.display = "none";

    const updates = {
      nome:            $("pf-nome")?.value?.trim() || STATE.profile?.nome || "",
      peso:            parseFloat($("pf-peso")?.value)  || null,
      altura:          parseFloat($("pf-altura")?.value) || null,
      idade:           parseInt($("pf-idade")?.value)    || null,
      sexo:            $("pf-sexo")?.value || null,
      nivel_atividade: $("pf-ativ")?.value || null,
      objetivo:        document.querySelector('input[name="pf-obj"]:checked')?.value || null,
      tipo_dieta:      $("pf-dieta")?.value || "equilibrada",
    };

    btn.disabled = true; btn.textContent = "Salvando...";
    try {
      await API.update("profiles", updates, { id: STATE.user.id });
      STATE.profile = { ...STATE.profile, ...updates };
      updateUserDisplay();
      if (msgEl) {
        msgEl.className = "msg-ok";
        msgEl.textContent = "✓ Perfil atualizado!";
        msgEl.style.display = "block";
        setTimeout(() => { msgEl.style.display = "none"; }, 3000);
      }
      this._renderStatus();
      TOAST.show("✓ Perfil salvo!");
    } catch (e) {
      if (msgEl) {
        msgEl.className = "msg-err";
        msgEl.textContent = "Erro: " + e.message;
        msgEl.style.display = "block";
      }
    } finally {
      btn.disabled = false; btn.textContent = "Salvar alterações";
    }
  },

  async saveSetup() {
    const btn = $("btn-setup-save");
    hideEl("setup-err");

    const updates = {
      peso:            parseFloat($("su-peso")?.value)   || null,
      altura:          parseFloat($("su-altura")?.value) || null,
      idade:           parseInt($("su-idade")?.value)    || null,
      sexo:            $("su-sexo")?.value || null,
      nivel_atividade: $("su-ativ")?.value || null,
      objetivo:        document.querySelector('input[name="su-obj"]:checked')?.value || null,
    };

    btn.disabled = true; btn.textContent = "Salvando...";
    try {
      await API.update("profiles", updates, { id: STATE.user.id });
      STATE.profile = { ...STATE.profile, ...updates };
      updateUserDisplay();
      UI.closeModal("modal-setup");
      TOAST.show("✓ Perfil configurado!");
      NOTIF.create("👋 Bem-vindo ao NutriAI!", "Complete seu perfil e gere seu primeiro plano alimentar com IA.", "success").catch(() => {});
    } catch (e) {
      showMsg("setup-err", "Erro: " + e.message);
    } finally {
      btn.disabled = false; btn.textContent = "Salvar e continuar";
    }
  },

  calcMetas() {
    const p = STATE.profile || {};
    if (!p.peso || !p.altura || !p.idade) return TOAST.show("Preencha peso, altura e idade primeiro.", "err");

    const tmb = p.sexo === "feminino"
      ? 10*p.peso + 6.25*p.altura - 5*p.idade - 161
      : 10*p.peso + 6.25*p.altura - 5*p.idade + 5;
    const f  = { sedentario:1.2, leve:1.375, moderado:1.55, intenso:1.725 };
    const tdee = Math.round(tmb * (f[p.nivel_atividade] || 1.375));
    const aj = { emagrecer:-500, ganhar_massa:+400, manutencao:0, saude_geral:0 };
    const metaCal = tdee + (aj[p.objetivo] || 0);
    const prot = Math.round(p.peso * 1.8);
    const gord = Math.round((metaCal * 0.25) / 9);
    const carb = Math.round((metaCal - prot*4 - gord*9) / 4);

    const el = $("metas-result");
    if (el) {
      el.style.display = "block";
      el.innerHTML = `
        <div class="metas-blk">
          <div class="metas-row"><span>Calorias</span><b>${metaCal} kcal</b></div>
          <div class="metas-row"><span>Proteínas</span><b>${prot}g</b></div>
          <div class="metas-row"><span>Carboidratos</span><b>${carb}g</b></div>
          <div class="metas-row"><span>Gorduras</span><b>${gord}g</b></div>
          <div style="margin-top:8px;font-size:11px;color:var(--text3)">TMB ${Math.round(tmb)} · TDEE ${tdee} · ${String(p.objetivo || "").replace("_"," ")}</div>
        </div>
      `;
    }
    const metas = { meta_calorias: metaCal, meta_proteinas: prot, meta_carboidratos: carb, meta_gorduras: gord };
    API.update("profiles", metas, { id: STATE.user.id })
      .then(() => { STATE.profile = { ...STATE.profile, ...metas }; })
      .catch(() => {});
    TOAST.show("✓ Metas calculadas!");
  },
};

const PROFILE = PAGE_PERFIL; // alias usado pelo modal de setup
ROUTER.register("perfil", PAGE_PERFIL);
