const { verifyToken } = require("../auth");
const { HttpError } = require("../utils/http");
const db = require("../db");

/**
 * Reads the "Authorization: Bearer <token>" header, verifies it, and
 * returns the matching user (without the password hash). Throws a 401
 * HttpError if anything is missing/invalid/expired — every medicine route
 * is expected to call this before touching the database, so one user can
 * never read/write another user's medicines.
 */
function requireAuth(req) {
  const header = req.headers["authorization"] || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new HttpError(401, "Missing or invalid Authorization header");
  }
  const payload = verifyToken(token);
  if (!payload || !payload.sub) {
    throw new HttpError(401, "Invalid or expired token");
  }
  const user = db.users.findOne((u) => u.id === payload.sub);
  if (!user) {
    throw new HttpError(401, "User no longer exists");
  }
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

module.exports = { requireAuth };
