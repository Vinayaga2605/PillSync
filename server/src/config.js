const fs = require("fs");
const path = require("path");

/**
 * Minimal .env loader. We deliberately avoid the `dotenv` package here —
 * this backend has zero external dependencies by design (see server/README.md
 * for why), so we parse the handful of KEY=VALUE lines we need ourselves.
 */
function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.join(__dirname, "..", ".env"));

const config = {
  port: Number(process.env.PORT) || 4000,
  corsOrigins: (process.env.CORS_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  jwtSecret: process.env.JWT_SECRET || "dev-only-change-me",
  tokenTtlSeconds: Number(process.env.TOKEN_TTL_SECONDS) || 604800,
  enableDevLogin: String(process.env.ENABLE_DEV_LOGIN || "true").toLowerCase() === "true",
  dataDir: path.join(__dirname, "..", "data"),
};

module.exports = config;
