// utils.js — helpers globais

const $  = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

const esc = s => String(s || "")
  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
  .replace(/"/g,"&quot;").replace(/'/g,"&#039;");

// Formatar texto markdown leve → HTML
function fmtAI(t) {
  return String(t)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,"<em>$1</em>")
    .replace(/^(\d+\.\s)/gm,"<br><strong>$1</strong>")
    .replace(/^[•·\-]\s/gm,"<br>• ")
    .replace(/\n\n/g,"<br><br>")
    .replace(/\n/g,"<br>");
}

const todayISO = () => new Date().toISOString().split("T")[0];

// Timezone-safe monday-based week start
function getMondayISO() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split("T")[0];
}

// Emoji por tipo de refeição
const MEAL_ICONS = { "Café da Manhã":"🌅","Almoço":"☀️","Lanche":"🍎","Jantar":"🌙","Ceia":"🌙" };
const getMealIcon = t => MEAL_ICONS[t] || "🍽️";

// Emoji auto por nome do alimento
function foodEmoji(n) {
  const m = {
    frango:"🍗",peito:"🍗",carne:"🥩",peixe:"🐟",salmão:"🐟",atum:"🫙",
    arroz:"🍚",massa:"🍝",macarrão:"🍝",pão:"🍞",aveia:"🌾",batata:"🥔",
    brócolis:"🥦",brocolis:"🥦",espinafre:"🥬",couve:"🥬",alface:"🥬",
    cebola:"🧅",alho:"🧄",tomate:"🍅",cenoura:"🥕",ovo:"🥚",
    leite:"🥛",iogurte:"🥛",queijo:"🧀",azeite:"🫒",manteiga:"🧈",
    banana:"🍌",maçã:"🍎",maca:"🍎",laranja:"🍊",morango:"🍓",abacate:"🥑",
    limão:"🍋",limao:"🍋",feijão:"🫘",feijao:"🫘",lentilha:"🫘"
  };
  const k = n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  for (const [nm, v] of Object.entries(m)) {
    if (k.includes(nm.normalize("NFD").replace(/[\u0300-\u036f]/g,""))) return v;
  }
  return "🥫";
}

const GOAL_LABELS = {
  emagrecer:"⚡ Emagrecer",
  ganhar_massa:"💪 Ganhar massa",
  manutencao:"⚖️ Manutenção",
  saude_geral:"🌿 Saúde geral",
};
const goalLabel = g => GOAL_LABELS[g] || "—";

// Data relativa curta
function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)      return "agora";
  if (diff < 3600)    return `${Math.floor(diff/60)}min`;
  if (diff < 86400)   return `${Math.floor(diff/3600)}h`;
  if (diff < 604800)  return `${Math.floor(diff/86400)}d`;
  return new Date(iso).toLocaleDateString("pt-BR", { day:"numeric", month:"short" });
}

// Safe show/hide por id
const showEl = id => { const e = $(id); if (e) e.style.display = ""; };
const hideEl = id => { const e = $(id); if (e) e.style.display = "none"; };

// Mostrar mensagem num elemento
function showMsg(id, text) {
  const e = $(id); if (!e) return;
  if (text !== undefined) e.textContent = text;
  e.style.display = "block";
}
