// backend/server.js
const express = require("express");
const cors    = require("cors");
const helmet  = require("helmet");
const path    = require("path");

const config = require("./config/env");
const aiRoutes = require("./routes/ai.routes");
const { notFound, errorHandler } = require("./middlewares/error.middleware");

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: config.frontendUrl === "*" ? true : config.frontendUrl }));
app.use(express.json({ limit: "1mb" }));

app.use((req, _res, next) => {
  if (req.path.startsWith("/api"))
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ── Rotas API ──
app.use("/api/ai", aiRoutes);
app.get("/api/health", (_req, res) =>
  res.json({ ok: true, ts: Date.now(), ia: config.groqKey ? "configured" : "missing" })
);

// ── Frontend estático (mesmo domínio opcional) ──
const FRONT_DIR = path.join(__dirname, "../frontend");
app.use(express.static(FRONT_DIR));
app.get("/", (_req, res) => res.sendFile(path.join(FRONT_DIR, "index.html")));
app.get("/app", (_req, res) => res.sendFile(path.join(FRONT_DIR, "app.html")));

// ── Error handling ──
app.use(notFound);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log("╔════════════════════════════════════════╗");
  console.log(`║ 🥗 NutriAI → http://localhost:${config.port}     ║`);
  console.log(`║ IA: ${config.groqKey ? "Groq configurado ✓" : "⚠ GROQ_API_KEY faltando "}       ║`);
  console.log("╚════════════════════════════════════════╝");
});
