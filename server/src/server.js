const http = require("http");
const { URL } = require("url");
const config = require("./config");
const { sendJson, readJsonBody, HttpError, matchRoute } = require("./utils/http");
const authRoutes = require("./routes/authRoutes");
const medicineRoutes = require("./routes/medicineRoutes");

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && config.corsOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (config.corsOrigins.includes("*")) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
}

// Ordered [method, pattern, handler] table. Patterns support ":param" segments.
// Handlers receive (req, res, params) and may be async; return value (if any)
// is sent as a 200 JSON body, or they can send the response themselves.
const routes = [
  ["POST", "/api/auth/register", async (req) => ({ status: 201, body: authRoutes.register(await readJsonBody(req)) })],
  ["POST", "/api/auth/login", async (req) => ({ status: 200, body: authRoutes.login(await readJsonBody(req)) })],
  ["POST", "/api/auth/dev-login", async () => ({ status: 200, body: authRoutes.devLogin() })],
  ["GET", "/api/auth/me", async (req) => ({ status: 200, body: authRoutes.me(req) })],

  ["GET", "/api/medicines", async (req) => ({ status: 200, body: medicineRoutes.list(req) })],
  ["POST", "/api/medicines", async (req) => ({ status: 201, body: await medicineRoutes.create(req, await readJsonBody(req)) })],
  ["GET", "/api/medicines/:id", async (req, params) => ({ status: 200, body: medicineRoutes.getOne(req, params.id) })],
  ["PUT", "/api/medicines/:id", async (req, params) => ({
    status: 200,
    body: await medicineRoutes.update(req, params.id, await readJsonBody(req)),
  })],
  ["PATCH", "/api/medicines/:id", async (req, params) => ({
    status: 200,
    body: await medicineRoutes.update(req, params.id, await readJsonBody(req)),
  })],
  ["DELETE", "/api/medicines/:id", async (req, params) => ({ status: 200, body: await medicineRoutes.softDelete(req, params.id) })],
  ["POST", "/api/medicines/:id/restore", async (req, params) => ({ status: 200, body: await medicineRoutes.restore(req, params.id) })],
];

const server = http.createServer(async (req, res) => {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (req.method === "GET" && pathname === "/api/health") {
    return sendJson(res, 200, { ok: true, service: "pillsync-medicine-server", time: new Date().toISOString() });
  }

  for (const [method, pattern, handler] of routes) {
    if (method !== req.method) continue;
    const params = matchRoute(pattern, pathname);
    if (!params) continue;

    try {
      const result = await handler(req, params);
      if (result === undefined) return; // handler already sent the response
      return sendJson(res, result.status, result.body);
    } catch (err) {
      if (err instanceof HttpError) {
        return sendJson(res, err.statusCode, { error: err.message });
      }
      console.error(`[pillsync-medicine-server] ${method} ${pathname} failed:`, err);
      return sendJson(res, 500, { error: "Internal server error" });
    }
  }

  return sendJson(res, 404, { error: `No route for ${req.method} ${pathname}` });
});

server.listen(config.port, () => {
  console.log(`PillSync Medicine Management API listening on http://localhost:${config.port}`);
  console.log(`Allowed CORS origins: ${config.corsOrigins.join(", ")}`);
  if (config.enableDevLogin) {
    console.log(`Dev login enabled: POST http://localhost:${config.port}/api/auth/dev-login`);
  }
});

module.exports = server;
