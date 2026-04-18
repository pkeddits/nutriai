// ui.js — UI helpers

const UI = {
  // ── Dropdown usuário ───────────────────────────────────
  toggleUser(e) {
    if (e) e.stopPropagation();
    const dd = $("udd");
    const ch = $("uchev");
    const opening = dd.style.display === "none";
    dd.style.display = opening ? "block" : "none";
    if (ch) ch.classList.toggle("open", opening);
    // Fecha notificações se abriu user
    if (opening) $("ndd").style.display = "none";
  },
  closeUser() {
    $("udd").style.display = "none";
    $("uchev")?.classList.remove("open");
  },

  // ── Menu mobile ───────────────────────────────────────
  toggleMenu() {
    const m = $("mobile-menu");
    m.classList.toggle("open");
    document.body.style.overflow = m.classList.contains("open") ? "hidden" : "";
  },
  closeMenu() {
    $("mobile-menu").classList.remove("open");
    document.body.style.overflow = "";
  },

  // ── Navegação (por hash) ───────────────────────────────
  go(hash) {
    if (location.hash === hash) return;
    location.hash = hash;
  },

  // ── Modais ────────────────────────────────────────────
  openModal(id) { $(id).style.display = "flex"; },
  closeModal(id) { $(id).style.display = "none"; },
};

// Fechar dropdown user ao clicar fora
document.addEventListener("click", e => {
  const btn = $("tb-user"), dd = $("udd");
  if (btn && dd && !btn.contains(e.target) && !dd.contains(e.target)) {
    UI.closeUser();
  }
  // Fechar notificações ao clicar fora
  const bell = $("tb-bell");
  const ndd  = $("ndd");
  if (bell && ndd && !bell.contains(e.target) && !ndd.contains(e.target)) {
    ndd.style.display = "none";
  }
});

// Fechar modais ao clicar no overlay
document.addEventListener("click", e => {
  if (e.target.classList.contains("overlay")) e.target.style.display = "none";
});

// ESC fecha modais / dropdowns
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    document.querySelectorAll(".overlay").forEach(o => o.style.display = "none");
    UI.closeUser();
    UI.closeMenu();
    const ndd = $("ndd"); if (ndd) ndd.style.display = "none";
  }
});

// ── Toast ──────────────────────────────────────────────
const TOAST = {
  _timer: null,
  show(msg, type = "ok") {
    const t = $("toast");
    const m = $("toast-msg");
    const ic = $("toast-ico");
    m.textContent = msg;
    t.classList.remove("terr");
    if (type === "err") {
      t.classList.add("terr");
      ic.innerHTML = `<path d="M2 2l12 12M14 2L2 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
    } else {
      ic.innerHTML = `<path d="M13 4L6 11 3 8" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    t.classList.add("show");
    clearTimeout(this._timer);
    this._timer = setTimeout(() => t.classList.remove("show"), 3200);
  },
};

// ── Atualizar informações do usuário no topbar ─────────
function updateUserDisplay() {
  const p = STATE.profile;
  const nome = p?.nome || STATE.user?.email?.split("@")[0] || "Usuário";
  const inicial = nome.charAt(0).toUpperCase();
  const email = STATE.user?.email || "";

  if ($("uava"))     $("uava").textContent     = inicial;
  if ($("uava-lg"))  $("uava-lg").textContent  = inicial;
  if ($("uname"))    $("uname").textContent    = nome;
  if ($("uname-lg")) $("uname-lg").textContent = nome;
  if ($("uemail"))   $("uemail").textContent   = email;
  if ($("ugoal"))    $("ugoal").textContent    = goalLabel(p?.objetivo);
}
