// auth.js — autenticação (login, cadastro, logout, senha, email)

const AUTH = {
  switchTab(tab) {
    const login = tab === "login";
    $("form-login").style.display    = login ? "block" : "none";
    $("form-register").style.display = login ? "none"  : "block";
    $("tab-login").classList.toggle("active", login);
    $("tab-register").classList.toggle("active", !login);
    ["login-err","register-err","register-ok"].forEach(id => hideEl(id));
  },

  async login() {
    const email    = $("login-email").value.trim();
    const password = $("login-password").value;
    const btn      = $("btn-login");
    hideEl("login-err");

    if (!email || !password) return showMsg("login-err", "Preencha e-mail e senha.");

    this._loading(btn, "Entrando...");
    try {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        const msg = error.message.includes("Invalid") || error.message.includes("credentials")
          ? "E-mail ou senha incorretos."
          : error.message.includes("Email not confirmed")
          ? "Confirme seu e-mail antes de entrar."
          : "Erro ao entrar: " + error.message;
        showMsg("login-err", msg);
      }
      // Se OK, onAuthStateChange em app.js faz o boot
    } catch (e) {
      showMsg("login-err", e.message || "Erro de conexão.");
    } finally {
      this._resetBtn(btn, "Entrar na conta");
    }
  },

  async register() {
    const nome     = $("reg-nome").value.trim();
    const email    = $("reg-email").value.trim();
    const password = $("reg-password").value;
    const btn      = $("btn-register");
    hideEl("register-err"); hideEl("register-ok");

    if (!nome || !email || !password) return showMsg("register-err", "Preencha todos os campos.");
    if (password.length < 6)           return showMsg("register-err", "Senha: mínimo 6 caracteres.");
    if (!email.includes("@"))          return showMsg("register-err", "E-mail inválido.");

    this._loading(btn, "Criando conta...");
    try {
      const { error } = await sb.auth.signUp({
        email, password,
        options: { data: { nome } },
      });
      if (error) {
        const msg = error.message.includes("already") ? "E-mail já cadastrado."
                  : error.message.includes("Database") ? "Erro no banco. Execute o supabase_schema.sql novamente."
                  : "Erro: " + error.message;
        showMsg("register-err", msg);
      } else {
        showMsg("register-ok", "✓ Conta criada! Verifique seu e-mail para confirmar.");
        setTimeout(() => this.switchTab("login"), 2800);
      }
    } catch (e) {
      showMsg("register-err", e.message || "Erro de conexão.");
    } finally {
      this._resetBtn(btn, "Criar conta grátis");
    }
  },

  async forgot() {
    const email = $("login-email")?.value?.trim();
    hideEl("login-err"); hideEl("login-ok");

    if (!email || !email.includes("@")) {
      return showMsg("login-err", "Digite seu e-mail no campo acima antes.");
    }

    try {
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/app.html",
      });
      if (error) return showMsg("login-err", "Erro: " + error.message);
      showMsg("login-ok", `✓ Link de recuperação enviado para ${email}. Confira sua caixa de entrada.`);
    } catch (e) {
      showMsg("login-err", "Erro: " + e.message);
    }
  },

  logout() {
    // UI OTIMISTA: saímos IMEDIATAMENTE, sem esperar backend
    UI.closeUser();

    // 1. Cancela renders pendentes primeiro
    if (typeof ROUTER !== "undefined" && ROUTER._currentCtx) {
      ROUTER._currentCtx.alive = false;
    }

    // 2. Reset do estado em memória
    STATE.user = null; STATE.profile = null;
    STATE.ingredients = []; STATE.mealsToday = [];
    STATE.notifications = []; STATE.unreadNotif = 0;
    STATE.ready = false;

    // 3. Limpa localStorage sincronamente
    try {
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith("sb-") || k.includes("supabase") || k.startsWith("guide_dismissed_")) {
          localStorage.removeItem(k);
        }
      });
    } catch (_) {}

    // 4. signOut em fire-and-forget (não esperamos)
    try {
      sb.auth.signOut({ scope: "local" }).catch(() => {});
    } catch (_) {}

    // 5. Redireciona IMEDIATAMENTE para landing
    location.replace("index.html");
  },

  async changePassword() {
    const pw  = $("mpw-new").value;
    const pw2 = $("mpw-new2").value;
    hideEl("mpw-err"); hideEl("mpw-ok");
    if (!pw || pw.length < 6) return showMsg("mpw-err", "Senha: mínimo 6 caracteres.");
    if (pw !== pw2)            return showMsg("mpw-err", "Senhas não coincidem.");

    try {
      const { error } = await sb.auth.updateUser({ password: pw });
      if (error) return showMsg("mpw-err", "Erro: " + error.message);
      showMsg("mpw-ok", "✓ Senha alterada com sucesso!");
      setTimeout(() => {
        UI.closeModal("modal-pw");
        $("mpw-new").value = $("mpw-new2").value = "";
      }, 1800);
    } catch (e) {
      showMsg("mpw-err", e.message);
    }
  },

  async changeEmail() {
    const newEmail = $("mem-new").value.trim();
    hideEl("mem-err"); hideEl("mem-ok");
    if (!newEmail || !newEmail.includes("@")) return showMsg("mem-err", "E-mail inválido.");

    try {
      const { error } = await sb.auth.updateUser({ email: newEmail });
      if (error) return showMsg("mem-err", "Erro: " + error.message);
      showMsg("mem-ok", "✓ Confirme o link enviado para " + newEmail);
      setTimeout(() => UI.closeModal("modal-email"), 2800);
    } catch (e) {
      showMsg("mem-err", e.message);
    }
  },

  // Helpers internos
  _loading(btn, msg) {
    btn.disabled = true;
    const s = btn.querySelector("span");
    if (s) s.textContent = msg; else btn.textContent = msg;
  },
  _resetBtn(btn, msg) {
    btn.disabled = false;
    const s = btn.querySelector("span");
    if (s) s.textContent = msg; else btn.textContent = msg;
  },
};
