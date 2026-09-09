const crypto = require("crypto");
const db = require("../db");
const { HttpError } = require("../utils/http");
const { requireAuth } = require("../middleware/authMiddleware");


const REQUIRED_ON_CREATE = ["name", "category", "type", "dosage", "unit", "quantity", "frequency", "foodTiming"];

const STRING_FIELDS_DEFAULT_EMPTY = [
  "genericName",
  "brandName",
  "disease",
  "reminderTime",
  "doctor",
  "hospital",
  "prescriptionNo",
  "description",
  "usage",
  "notes",
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function validateCreatePayload(body) {
  if (!body || typeof body !== "object") {
    throw new HttpError(400, "Request body must be a JSON object");
  }
  const missing = REQUIRED_ON_CREATE.filter((key) => {
    const value = body[key];
    return value === undefined || value === null || value === "";
  });
  if (missing.length) {
    throw new HttpError(400, `Missing required field(s): ${missing.join(", ")}`);
  }
  const quantity = Number(body.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new HttpError(400, "quantity must be a positive number");
  }
}

function buildMedicineRecord(body, userId) {
  const quantity = Number(body.quantity);
  const remaining =
    body.remaining !== undefined && body.remaining !== null && Number(body.remaining) >= 0
      ? Number(body.remaining)
      : quantity;

  const record = {
    id: crypto.randomUUID(),
    userId,
    name: String(body.name).trim(),
    category: String(body.category).trim(),
    type: String(body.type).trim(),
    dosage: String(body.dosage).trim(),
    unit: String(body.unit).trim(),
    quantity,
    remaining,
    frequency: String(body.frequency).trim(),
    foodTiming: String(body.foodTiming).trim(),
    status: "active",
    createdAt: todayISO(),
    deleted: false,
    trend: Array.isArray(body.trend) ? body.trend : [quantity, remaining],
    sideEffects: Array.isArray(body.sideEffects) ? body.sideEffects : [],
  };

  for (const field of STRING_FIELDS_DEFAULT_EMPTY) {
    record[field] = typeof body[field] === "string" ? body[field] : "";
  }

  return record;
}

function assertOwned(medicine, userId) {
  if (!medicine || medicine.userId !== userId) {
    throw new HttpError(404, "Medicine not found");
  }
}

function list(req) {
  const user = requireAuth(req);
  return db.medicines.find((m) => m.userId === user.id);
}

async function create(req, body) {
  const user = requireAuth(req);
  validateCreatePayload(body);
  const record = buildMedicineRecord(body, user.id);
  return db.medicines.insert(record);
}

function getOne(req, id) {
  const user = requireAuth(req);
  const medicine = db.medicines.findOne((m) => m.id === id);
  assertOwned(medicine, user.id);
  return medicine;
}

const NON_PATCHABLE_FIELDS = new Set(["id", "userId", "createdAt"]);

async function update(req, id, body) {
  const user = requireAuth(req);
  const existing = db.medicines.findOne((m) => m.id === id);
  assertOwned(existing, user.id);

  if (body.quantity !== undefined) {
    const q = Number(body.quantity);
    if (!Number.isFinite(q) || q <= 0) {
      throw new HttpError(400, "quantity must be a positive number");
    }
  }
  if (body.remaining !== undefined) {
    const r = Number(body.remaining);
    if (!Number.isFinite(r) || r < 0) {
      throw new HttpError(400, "remaining must be zero or a positive number");
    }
  }

  const patch = { ...body };
  for (const key of NON_PATCHABLE_FIELDS) delete patch[key];

  const updated = await db.medicines.updateOne(
    (m) => m.id === id,
    (m) => ({ ...m, ...patch })
  );
  return updated;
}

async function softDelete(req, id) {
  const user = requireAuth(req);
  const existing = db.medicines.findOne((m) => m.id === id);
  assertOwned(existing, user.id);
  return db.medicines.updateOne(
    (m) => m.id === id,
    (m) => ({ ...m, deleted: true, deletedAt: todayISO() })
  );
}

async function restore(req, id) {
  const user = requireAuth(req);
  const existing = db.medicines.findOne((m) => m.id === id);
  assertOwned(existing, user.id);
  return db.medicines.updateOne(
    (m) => m.id === id,
    (m) => {
      const { deletedAt, ...rest } = m;
      return { ...rest, deleted: false };
    }
  );
}

module.exports = { list, create, getOne, update, softDelete, restore };
