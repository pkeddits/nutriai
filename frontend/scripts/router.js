// ══════════════════════════════════════════════════════════
// router.js — SPA Router com cancelamento + watchdog
//
// FIXES críticos nesta versão:
//   1. Hash igual força re-render (clicar no link atual funciona)
//   2. Timeout hard de 10s por render — se travar, exibe erro
//   3. Watchdog: se render demorar >5s, mostra "ainda carregando"
//      e oferece botão pra re-tentar
// ══════════════════════════════════════════════════════════

const ROUTER = {
  routes: {},
  currentPage: null,
  _renderToken: 0,
  _currentCtx:  null,

  register(path, module) {
    this.routes[path] = module;
  },

  parseHash() {
    const raw  = location.hash.replace(/^#/, "") || "/dashboard";
    const [path, query] = raw.split("?");
    const page = path.startsWith("/") ? path.slice(1) : path;
    const params = {};
    if (query) for (const p of query.split("&")) {
      const [k, v] = p.split("=");
      params[decodeURIComponent(k)] = decodeURIComponent(v || "");
    }
    return { page: page || "dashboard", params };
  },

  async navigate() {
    if (!STATE.ready) return;

    const { page, params } = this.parseHash();
    const route  = this.routes[page] || this.routes["dashboard"];
    const target = this.routes[page] ? page : "dashboard";

    // Token novo — invalida renders anteriores
    const myToken = ++this._renderToken;
    if (this._currentCtx) this._currentCtx.alive = false;

    const ctx = {
      alive: true,
      token: myToken,
      page:  target,
      params,
      ok: () => this._currentCtx === ctx && ctx.alive,
    };
    this._currentCtx = ctx;

    this.currentPage = target;
    STATE.currentPage = target;
    this._updateActiveLinks(target);

    const main = $("main");
    if (!main) return;

    // Limpa DOM imediatamente com loader
    main.innerHTML = `<div class="page-loading"><div class="ld"><span></span><span></span><span></span></div></div>`;

    // WATCHDOG: se passou 8s e ainda está renderizando, mostra aviso
    const watchdog = setTimeout(() => {
      if (!ctx.ok()) return;
      const loading = main.querySelector(".page-loading");
      if (loading) {
        loading.innerHTML = `
          <div style="text-align:center;padding:40px 20px">
            <div style="font-size:32px;margin-bottom:10px">⏳</div>
            <p style="font-size:13px;color:var(--text2);margin-bottom:14px">Isso está demorando mais que o normal...</p>
            <button class="btn-primary btn-sm" onclick="ROUTER.forceReload()">🔄 Tentar novamente</button>
          </div>`;
      }
    }, 8000);

    // TIMEOUT HARD: se passar 20s, cancela e mostra erro
    const timeout = setTimeout(() => {
      if (!ctx.ok()) return;
      ctx.alive = false;
      main.innerHTML = this._errorTpl("Tempo esgotado ao carregar página. Verifique sua conexão.");
    }, 20000);

    try {
      if (route && typeof route.render === "function") {
        await route.render(main, ctx);
        clearTimeout(watchdog);
        clearTimeout(timeout);

        if (!ctx.ok()) return;
        main.classList.remove("page-enter");
        void main.offsetWidth;
        main.classList.add("page-enter");
      } else {
        clearTimeout(watchdog);
        clearTimeout(timeout);
        main.innerHTML = this._notFound();
      }
    } catch (err) {
      clearTimeout(watchdog);
      clearTimeout(timeout);
      if (!ctx.ok()) return;
      console.error("[ROUTER]", target, err);
      main.innerHTML = this._errorTpl(err.message);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  // Força re-render da página atual (mesmo hash)
  forceReload() {
    // Invalida ctx atual
    if (this._currentCtx) this._currentCtx.alive = false;
    this._currentCtx = null;
    // Re-navega
    this.navigate();
  },

  _notFound() {
    return `<div class="empty"><div class="eico">🔍</div><p>Página não encontrada</p><button class="btn-primary btn-sm" style="margin-top:10px" onclick="UI.go('#/dashboard')">Ir para Dashboard</button></div>`;
  },

  _errorTpl(msg) {
    return `<div class="empty"><div class="eico">⚠️</div><p>Erro ao carregar</p><small>${esc(msg || "Tente recarregar")}</small><div style="display:flex;gap:8px;margin-top:12px"><button class="btn-primary btn-sm" onclick="ROUTER.forceReload()">🔄 Tentar novamente</button><button class="btn-secondary btn-sm" onclick="UI.go('#/dashboard')">Ir para Dashboard</button></div></div>`;
  },

  _updateActiveLinks(page) {
    $$(".tb-link, .mm-link").forEach(el => {
      el.classList.toggle("active", el.dataset.page === page);
    });
  },

  start() {
    window.addEventListener("hashchange", () => this.navigate());

    // FIX: clique em link do mesmo hash força re-render
    $$(".tb-link, .mm-link").forEach(link => {
      link.addEventListener("click", (e) => {
        const href = link.getAttribute("href") || "";
        if (href === location.hash) {
          e.preventDefault();
          this.forceReload();
        }
      });
    });

    if (!location.hash) location.hash = "#/dashboard";
    else this.navigate();
  },
};
