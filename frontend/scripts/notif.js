// notif.js — sistema de notificações

const NOTIF = {
  toggle(e) {
    if (e) e.stopPropagation();
    const ndd = $("ndd");
    const opening = ndd.style.display === "none";
    ndd.style.display = opening ? "block" : "none";
    // Fecha user se abriu
    if (opening) { UI.closeUser(); this.render(); }
  },

  async load() {
    try {
      const { data } = await API.select("notifications", {
        eq: { user_id: STATE.user.id },
        order: { col: "created_at", asc: false },
        limit: 30,
      });
      STATE.notifications = data || [];
      STATE.unreadNotif = STATE.notifications.filter(n => !n.lida).length;
      this.updateBell();
    } catch (e) {
      console.error("[NOTIF] load:", e.message);
    }
  },

  updateBell() {
    const dot = $("bell-dot");
    if (dot) dot.style.display = STATE.unreadNotif > 0 ? "block" : "none";
  },

  render() {
    const list = $("ndd-list");
    if (!list) return;
    if (!STATE.notifications.length) {
      list.innerHTML = `<div class="ndd-empty">Nenhuma notificação</div>`;
      return;
    }
    list.innerHTML = STATE.notifications.map(n => `
      <div class="ndd-item ${n.lida ? "" : "unread"}" onclick="NOTIF.markRead('${n.id}')">
        <div class="nt">${esc(n.titulo)}</div>
        ${n.mensagem ? `<div class="nm">${esc(n.mensagem)}</div>` : ""}
        <div class="nd">${timeAgo(n.created_at)}</div>
      </div>
    `).join("");
  },

  async markRead(id) {
    try {
      await API.update("notifications", { lida: true }, { id });
      const n = STATE.notifications.find(x => x.id === id);
      if (n && !n.lida) { n.lida = true; STATE.unreadNotif = Math.max(0, STATE.unreadNotif - 1); }
      this.updateBell();
      this.render();
    } catch (e) {
      console.error(e);
    }
  },

  async markAllRead() {
    try {
      await API.update("notifications", { lida: true }, { user_id: STATE.user.id });
      STATE.notifications.forEach(n => n.lida = true);
      STATE.unreadNotif = 0;
      this.updateBell();
      this.render();
      TOAST.show("Notificações marcadas como lidas");
    } catch (e) {
      TOAST.show("Erro ao marcar", "err");
    }
  },

  // Criar notificação manualmente
  async create(titulo, mensagem = "", tipo = "info") {
    try {
      await API.insert("notifications", {
        user_id: STATE.user.id, titulo, mensagem, tipo,
      });
      await this.load();
    } catch (e) {
      console.error(e);
    }
  },

  // ── Regras inteligentes ──
  // Chamado após cada refeição/refresh do dashboard
  async checkRules() {
    if (!STATE.user || !STATE.profile) return;

    const meta = STATE.profile.meta_calorias || DEFAULTS.calorias;
    const metaProt = STATE.profile.meta_proteinas || DEFAULTS.proteinas;
    const kcal = STATE.mealsToday.reduce((s, m) => s + (m.calorias || 0), 0);
    const prot = STATE.mealsToday.reduce((s, m) => s + (parseFloat(m.proteinas) || 0), 0);

    const hora = new Date().getHours();
    const hoje = todayISO();
    const key = `ntf_${hoje}_`;

    // Regra 1: Meta atingida
    if (kcal >= meta && meta > 0 && !localStorage.getItem(key + "meta_ok")) {
      localStorage.setItem(key + "meta_ok", "1");
      await this.create("🎉 Meta atingida!", `Você alcançou ${meta} kcal hoje. Continue firme!`, "success");
    }
    // Regra 2: Proteína baixa à noite
    else if (hora >= 18 && prot < metaProt * 0.5 && kcal > 0 && !localStorage.getItem(key + "prot_low")) {
      localStorage.setItem(key + "prot_low", "1");
      await this.create("💪 Proteína baixa hoje", `Você está em ${Math.round(prot)}g de ${metaProt}g. Considere um jantar proteico.`, "warning");
    }
    // Regra 3: Sem refeições registradas
    else if (hora >= 14 && STATE.mealsToday.length === 0 && !localStorage.getItem(key + "no_meals")) {
      localStorage.setItem(key + "no_meals", "1");
      await this.create("🍽️ Registre suas refeições", "Adicione o que comeu hoje para acompanhar seus macros.", "info");
    }
  },
};
