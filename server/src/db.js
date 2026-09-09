const fs = require("fs");
const path = require("path");
const config = require("./config");

/**
 * Tiny JSON-file "database".
 *
 * Why not a real database? This sandbox has no network access to install
 * a DB driver (sqlite3/pg/mongoose etc. all require an npm registry we
 * can't reach here), and the existing frontend has no backend/DB precedent
 * to follow. A JSON file per collection keeps this dependency-free while
 * still giving every route a real create/read/update/delete round trip
 * against persisted data on disk.
 *
 * Swapping this for Postgres/Mongo/SQLite later only touches this file —
 * every route calls `db.medicines.*` / `db.users.*`, never the filesystem
 * directly.
 */

if (!fs.existsSync(config.dataDir)) {
  fs.mkdirSync(config.dataDir, { recursive: true });
}

// Serialize writes per-collection so concurrent requests can't clobber
// each other (a real DB gives you this for free; here we do it by hand).
const writeQueues = new Map();

function queueWrite(collection, fn) {
  const prev = writeQueues.get(collection) || Promise.resolve();
  const next = prev.then(fn, fn);
  writeQueues.set(collection, next);
  return next;
}

class Collection {
  constructor(name) {
    this.name = name;
    this.file = path.join(config.dataDir, `${name}.json`);
    if (!fs.existsSync(this.file)) {
      fs.writeFileSync(this.file, "[]", "utf8");
    }
  }

  _readSync() {
    try {
      const raw = fs.readFileSync(this.file, "utf8");
      return raw.trim() ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  _writeSync(rows) {
    // Write to a temp file then rename — avoids truncated/corrupt files
    // if the process dies mid-write.
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(rows, null, 2), "utf8");
    fs.renameSync(tmp, this.file);
  }

  all() {
    return this._readSync();
  }

  find(predicate) {
    return this._readSync().filter(predicate);
  }

  findOne(predicate) {
    return this._readSync().find(predicate);
  }

  insert(row) {
    return queueWrite(this.name, () => {
      const rows = this._readSync();
      rows.push(row);
      this._writeSync(rows);
      return row;
    });
  }

  updateOne(predicate, updater) {
    return queueWrite(this.name, () => {
      const rows = this._readSync();
      const idx = rows.findIndex(predicate);
      if (idx === -1) return null;
      rows[idx] = updater(rows[idx]);
      this._writeSync(rows);
      return rows[idx];
    });
  }

  deleteOne(predicate) {
    return queueWrite(this.name, () => {
      const rows = this._readSync();
      const idx = rows.findIndex(predicate);
      if (idx === -1) return false;
      rows.splice(idx, 1);
      this._writeSync(rows);
      return true;
    });
  }
}

module.exports = {
  users: new Collection("users"),
  medicines: new Collection("medicines"),
};
