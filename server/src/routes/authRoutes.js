const crypto = require("crypto");
const db = require("../db");
const config = require("../config");
const { hashPassword, verifyPassword, signToken } = require("../auth");
const { HttpError } = require("../utils/http");
const { requireAuth } = require("../middleware/authMiddleware");

/**
 * NOTE ON SCOPE: PillSync's Auth module (login/register UI, session
 * handling) belongs to a different team member's module, not Module 3
 * (Medicine Management). These routes exist only so Medicine Management
 * has *something* real to authenticate against — every /medicines
 * endpoint needs a logged-in user to scope data to. They're intentionally
 * minimal and should be treated as provisional: swap them out (or point
 * the frontend at the real Auth module's token) whenever that module is
 * ready, and set ENABLE_DEV_LOGIN=false once it is.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toSafeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

function register(body) {
  const { name, email, password } = body || {};
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    throw new HttpError(400, "name must be at least 2 characters");
  }
  if (!email || !EMAIL_RE.test(String(email))) {
    throw new HttpError(400, "A valid email is required");
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    throw new HttpError(400, "password must be at least 6 characters");
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  if (db.users.findOne((u) => u.email === normalizedEmail)) {
    throw new HttpError(409, "An account with this email already exists");
  }

  const user = {
    id: crypto.randomUUID(),
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  db.users.insert(user);

  const token = signToken({ sub: user.id, email: user.email });
  return { token, user: toSafeUser(user) };
}

function login(body) {
  const { email, password } = body || {};
  if (!email || !password) {
    throw new HttpError(400, "email and password are required");
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = db.users.findOne((u) => u.email === normalizedEmail);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new HttpError(401, "Invalid email or password");
  }
  const token = signToken({ sub: user.id, email: user.email });
  return { token, user: toSafeUser(user) };
}

function me(req) {
  const user = requireAuth(req);
  return user;
}

/**
 * Dev-only convenience: provisions (or reuses) a single demo user and
 * returns a token for it, so Module 3 can be tested end-to-end without
 * waiting on the real Auth module's login page. Gated behind
 * ENABLE_DEV_LOGIN so it can't be hit in a real deployment by accident.
 */
function devLogin() {
  if (!config.enableDevLogin) {
    throw new HttpError(404, "Not found");
  }
  const demoEmail = "demo@pillsync.local";
  let user = db.users.findOne((u) => u.email === demoEmail);
  if (!user) {
    user = {
      id: crypto.randomUUID(),
      name: "Demo User",
      email: demoEmail,
      passwordHash: hashPassword("demo-password-not-for-production"),
      createdAt: new Date().toISOString(),
    };
    db.users.insert(user);
  }
  const token = signToken({ sub: user.id, email: user.email });
  return { token, user: toSafeUser(user) };
}

module.exports = { register, login, me, devLogin };
