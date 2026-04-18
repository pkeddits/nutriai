// state.js — estado global da aplicação
const STATE = {
  user:         null,   // usuário autenticado do Supabase
  profile:      null,   // registro da tabela profiles
  ingredients:  [],
  mealsToday:   [],
  notifications:[],
  unreadNotif:  0,

  ready:        false,  // true quando auth + profile carregaram
  currentPage:  null,
  selectedCat:  "Proteínas",

  // Cache de respostas AI para histórico rápido
  lastAIResponses: [],
};
