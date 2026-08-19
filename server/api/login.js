const { getDb } = require("../lib/db");
const { applyCors } = require("../lib/cors");
const { encryptPin } = require("../lib/crypto");

// Helper to run SELECT queries safely and auto-free WASM memory
function fetchOne(db, sql, params = []) {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    if (stmt.step()) {
      return stmt.getAsObject();
    }
    return null;
  } finally {
    stmt.free();
  }
}

// Helper to run INSERT/UPDATE queries safely and auto-free WASM memory
function runQuery(db, sql, params = []) {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    stmt.step();
  } finally {
    stmt.free();
  }
}

module.exports = async (req, res) => {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Parse body safely
  const body =
    typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  const { action, username, password } = body;

  if (typeof username !== "string" || typeof password !== "string") {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  const isRegister =
    action === "register" ||
    req.query?.action === "register" ||
    req.url?.includes("register");

  try {
    const db = await getDb();
    const cleanUsername = username.trim();

    if (isRegister) {
      if (!cleanUsername || !password) {
        return res
          .status(400)
          .json({ error: "Username and password are required" });
      }

      // 1. Check if user already exists
      const existingUser = fetchOne(
        db,
        "SELECT id FROM users WHERE username = ?",
        [cleanUsername],
      );
      if (existingUser) {
        return res.status(409).json({ error: "Username already exists" });
      }

      // 2. Generate PIN and insert new user
      const secretPin = Math.floor(1000 + Math.random() * 9000).toString();
      runQuery(
        db,
        "INSERT INTO users (username, password, is_hidden, secret_pin) VALUES (?, ?, 0, ?)",
        [cleanUsername, password, secretPin],
      );

      // 3. Fetch newly created row ID
      const result = db.exec("SELECT last_insert_rowid()");
      const newId = result[0].values[0][0];

      return res.status(201).json({
        id: newId,
        username: cleanUsername,
        is_hidden: false,
        is_admin: false,
        encrypted_pin: encryptPin(secretPin),
      });
    } else {
      // Login Flow
      const row = fetchOne(
        db,
        "SELECT id, username, is_hidden, secret_pin FROM users WHERE username = ? AND password = ?",
        [cleanUsername, password],
      );

      if (!row) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      return res.status(200).json({
        id: row.id,
        username: row.username,
        is_hidden: !!row.is_hidden,
        is_admin: !!row.is_hidden,
        encrypted_pin: encryptPin(row.secret_pin),
      });
    }
  } catch (err) {
    console.error("Auth request failed:", err);
    return res
      .status(500)
      .json({ error: "Authentication request failed", detail: err.message });
  }
};
