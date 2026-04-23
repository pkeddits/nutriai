// app.js - arquivo principal que inicializa o sistema
// verifica se o usuário está logado e carrega a página certa

(async function initApp() {
  // checa se o config.js foi preenchido antes de tentar conectar
  if (SUPABASE_URL.includes("COLE_SUA") || SUPABASE_KEY.includes("COLE_SUA")) {
    $("boot-loader").innerHTML = `
      <div style="max-width:500px;padding:24px;text-align:center">
        <div style="font-size:40px;margin-bottom:16px">⚠️</div>
        <h2 style="font-size:18px;margin-bottom:10px;color:#fff">Configuração necessária</h2>
        <p style="font-size:13px;color:#7a85aa;line-height:1.7">
          Abra <code style="background:#161c28;padding:2px 6px;border-radius:4px;color:#9AACFF">frontend/scripts/config.js</code> e preencha suas credenciais do Supabase antes de continuar.
        </p>
      </div>`;
    return;
  }

  // pega o parâmetro tab da url (ex: ?tab=register vindo da landing)
  const params = new URLSearchParams(window.location.search);
  const initTab = params.get("tab");

  try {
    const { data: { session } } = await sb.auth.getSession();
    console.log("sessão atual:", session ? "logado" : "não logado");

    if (session?.user) {
      await boot(session.user);
    } else {
      showScreen("auth");
      if (initTab === "register") AUTH.switchTab("register");
    }
  } catch (e) {
    console.error("[init] erro ao verificar auth:", e.message);
    showScreen("auth");
  }

  // escuta quando o usuário faz login/logout
  sb.auth.onAuthStateChange(async (event, session) => {
    console.log("[auth]", event);
    if (event === "SIGNED_IN" && session?.user) {
      await boot(session.user);
    } else if (event === "SIGNED_OUT") {
      STATE.ready = false;
      showScreen("auth");
      location.hash = "";
    }
  });
})();

async function boot(user) {
  STATE.user = user;
  API._sessionChecked = Date.now();

  try {
    // Carrega perfil
    let profile;
    try {
      const r = await API.select("profiles", {
        eq: { id: user.id }, single: true,
      });
      profile = r.data;
    } catch (e) {
      // Se perfil não existe, o trigger deveria ter criado. Cria manualmente:
      if (e.code === "PGRST116" || e.message?.includes("row")) {
        console.log("[boot] Criando perfil manualmente...");
        const r = await API.insert("profiles", {
          id: user.id,
          nome: user.user_metadata?.nome || user.email?.split("@")[0] || "Usuário",
        }, { select: true, single: true });
        profile = r.data;
      } else throw e;
    }

    STATE.profile = profile;
    STATE.ready = true;

    // Esconder loader, mostrar app
    showScreen("app");
    updateUserDisplay();

    // Navegação inicial
    if (!location.hash) location.hash = "#/dashboard";
    ROUTER.start();

    // Inicializa chatbot flutuante
    CHATBOT.init();

    // Carregar notificações em paralelo
    NOTIF.load().catch(() => {});
    // Carregar ingredientes em paralelo (usados em várias páginas)
    API.select("ingredients", {
      eq: { user_id: user.id },
      order: { col: "created_at", asc: false }
    }).then(({ data }) => { STATE.ingredients = data || []; }).catch(() => {});

    // Modal de setup se perfil incompleto
    if (!profile?.objetivo) {
      setTimeout(() => UI.openModal("modal-setup"), 800);
    }

  } catch (e) {
    console.error("[boot]", e);
    $("boot-loader").innerHTML = `
      <div style="max-width:440px;padding:24px;text-align:center">
        <div style="font-size:40px;margin-bottom:16px">⚠️</div>
        <h2 style="font-size:18px;margin-bottom:10px;color:#fff">Erro ao carregar</h2>
        <p style="font-size:13px;color:#7a85aa;line-height:1.7;margin-bottom:16px">
          ${esc(e.message || "Erro desconhecido")}
        </p>
        <button style="padding:9px 18px;background:#6482FF;border:none;border-radius:8px;color:#fff;font-weight:700;cursor:pointer;font-family:'Sora',sans-serif" onclick="location.reload()">Recarregar</button>
      </div>`;
  }
}

function showScreen(screen) {
  $("boot-loader").style.display  = "none";
  $("auth-screen").style.display  = screen === "auth" ? "flex" : "none";
  $("app").style.display          = screen === "app"  ? "flex" : "none";
}
