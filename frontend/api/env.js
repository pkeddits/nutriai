// api/env.js — Vercel Serverless Function
// Gera dinamicamente um script JS com as env vars definidas no painel Vercel.
// Assim nenhuma chave fica hardcoded no repositório.

export default function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL || "";
  const SUPABASE_KEY = process.env.SUPABASE_KEY || "";
  const AI_ENDPOINT  = process.env.AI_ENDPOINT  || "/api/ai";

  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  res.status(200).send(`
window.ENV = {
  SUPABASE_URL: ${JSON.stringify(SUPABASE_URL)},
  SUPABASE_KEY: ${JSON.stringify(SUPABASE_KEY)},
  AI_ENDPOINT:  ${JSON.stringify(AI_ENDPOINT)}
};
  `);
}
