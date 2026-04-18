// frontend/api/health.js — endpoint de status
export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json({
    ok: true,
    ts: Date.now(),
    ia: process.env.GROQ_API_KEY ? "configured" : "missing",
    runtime: "vercel-serverless",
  });
}
