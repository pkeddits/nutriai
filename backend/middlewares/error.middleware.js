function notFound(req, res, _next) {
  if (req.path.startsWith("/api"))
    return res.status(404).json({ error: "Rota não encontrada" });
  _next();
}

function errorHandler(err, _req, res, _next) {
  console.error("[ERROR]", err.message);
  if (res.headersSent) return;
  res.status(err.status || 500).json({
    error: err.message || "Erro interno do servidor"
  });
}

module.exports = { notFound, errorHandler };
