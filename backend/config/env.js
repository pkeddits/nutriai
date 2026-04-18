require("dotenv").config();

const config = {
  port:        Number(process.env.PORT || 3000),
  nodeEnv:     process.env.NODE_ENV || "development",
  frontendUrl: process.env.FRONTEND_URL || "*",
  groqKey:     process.env.GROQ_API_KEY || "",
  aiModel:     process.env.AI_MODEL || "",
};

module.exports = config;
