// api.js - wrapper pra todas as chamadas ao Supabase
// verifica se a sessão ainda é válida antes de cada operação
// evita o problema de "Salvando..." infinito quando o token expira

const API = {
  _sessionChecked: 0,  // timestamp da última verificação
  _sessionInvalid: false,

  // verifica se o usuário ainda está logado antes de qualquer query
  async ensureSession() {
    const now = Date.now();
    // Só revalida se passou mais de 30s desde a última checagem
    if (now - this._sessionChecked < 30000) return true;

    try {
      // Timeout curto de 5s só pra pegar a sessão — não deixa travar UI
      const sessionPromise = sb.auth.getSession();
      const timeoutPromise = new Promise((_, rej) =>
        setTimeout(() => rej(new Error("Timeout ao verificar sessão")), 5000)
      );
      const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);

      if (!session) {
        this._sessionInvalid = true;
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      // Se o token vai expirar em menos de 60s, renova
      const expiresAt = (session.expires_at || 0) * 1000;
      if (expiresAt - now < 60000) {
        console.log("[API] Renovando token...");
        const { error } = await sb.auth.refreshSession();
        if (error) {
          this._sessionInvalid = true;
          throw new Error("Não foi possível renovar sessão");
        }
      }

      this._sessionChecked = now;
      this._sessionInvalid = false;
      return true;
    } catch (e) {
      console.error("[API] ensureSession falhou:", e.message);
      // Se a sessão está realmente inválida, força logout pra tela de login
      if (this._sessionInvalid && STATE.ready) {
        console.warn("[API] Sessão inválida — redirecionando para login");
        setTimeout(() => { if (typeof AUTH !== "undefined") AUTH.logout(); }, 100);
      }
      throw e;
    }
  },

  // Executa uma operação Supabase com session check, timeout e retry.
  async run(queryBuilder, { timeoutMs = 15000, retries = 1 } = {}) {
    await this.ensureSession();

    const attempt = async () => {
      const timeoutPromise = new Promise((_, rej) =>
        setTimeout(() => rej(new Error(`Tempo esgotado (${timeoutMs/1000}s)`)), timeoutMs)
      );

      // queryBuilder pode ser uma Promise OU uma função que retorna Promise
      const promise = typeof queryBuilder === "function" ? queryBuilder() : queryBuilder;
      return Promise.race([promise, timeoutPromise]);
    };

    let lastErr;
    for (let i = 0; i <= retries; i++) {
      try {
        const result = await attempt();
        if (result && result.error) throw result.error;
        return result;
      } catch (e) {
        lastErr = e;
        // Se foi erro de sessão, tenta renovar e retry
        if (e.message?.includes("JWT") || e.message?.includes("expired") || e.message?.includes("sess")) {
          console.log("[API] Erro de sessão, renovando e tentando novamente...");
          try {
            await sb.auth.refreshSession();
            this._sessionChecked = Date.now();
          } catch (_) {}
          continue;
        }
        // Outros erros: só tenta de novo se for timeout/network
        if (i < retries && (e.message?.includes("Tempo esgotado") || e.message?.includes("fetch"))) {
          console.log(`[API] Retry ${i+1}/${retries}...`);
          await new Promise(r => setTimeout(r, 500));
          continue;
        }
        throw e;
      }
    }
    throw lastErr;
  },

  // ── SHORTCUTS ────────────────────────────────────────
  async select(table, opts = {}) {
    return this.run(() => {
      let q = sb.from(table).select(opts.columns || "*");
      if (opts.eq)     for (const [k, v] of Object.entries(opts.eq))     q = q.eq(k, v);
      if (opts.order)  q = q.order(opts.order.col, { ascending: opts.order.asc !== false });
      if (opts.limit)  q = q.limit(opts.limit);
      if (opts.single) q = q.single();
      return q;
    });
  },

  async insert(table, rows, opts = {}) {
    return this.run(() => {
      let q = sb.from(table).insert(rows);
      if (opts.select) q = q.select();
      if (opts.single) q = q.single();
      return q;
    });
  },

  async update(table, updates, where) {
    return this.run(() => {
      let q = sb.from(table).update(updates);
      for (const [k, v] of Object.entries(where)) q = q.eq(k, v);
      return q;
    });
  },

  async upsert(table, rows, opts = {}) {
    return this.run(() => sb.from(table).upsert(rows, opts));
  },

  async delete(table, where) {
    return this.run(() => {
      let q = sb.from(table).delete();
      for (const [k, v] of Object.entries(where)) q = q.eq(k, v);
      return q;
    });
  },
};
