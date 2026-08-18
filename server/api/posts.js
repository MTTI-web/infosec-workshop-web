const { getDb } = require("../lib/db");
const { applyCors } = require("../lib/cors");

module.exports = async (req, res) => {
  if (applyCors(req, res)) return;

  try {
    const db = await getDb();

    // GET: Search / List Posts (Intentionally Vulnerable to SQL Injection)
    if (req.method === "GET") {
      const q = req.query.q;
      let sql;

      if (q !== undefined && q !== null) {
        // Raw string concatenation for workshop SQLi challenge
        sql = `SELECT username, post FROM users WHERE username = '${q}'`;
      } else {
        sql = `SELECT username, post FROM users WHERE post IS NOT NULL AND post != ''`;
      }

      const stmt = db.prepare(sql);
      const posts = [];
      while (stmt.step()) {
        posts.push(stmt.getAsObject());
      }
      stmt.free();

      return res.status(200).json(posts);
    }

    // POST: Update User Post
    if (req.method === "POST") {
      const body =
        typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      const { userId, username, post } = body;

      // Identify user by userId or username
      let userRow = null;
      if (userId) {
        const stmt = db.prepare("SELECT id FROM users WHERE id = ?");
        stmt.bind([userId]);
        if (stmt.step()) userRow = stmt.getAsObject();
        stmt.free();
      } else if (username) {
        const stmt = db.prepare("SELECT id FROM users WHERE username = ?");
        stmt.bind([username]);
        if (stmt.step()) userRow = stmt.getAsObject();
        stmt.free();
      }

      if (!userRow) {
        return res.status(404).json({ error: "SQL Error: User not found" });
      }

      // Update post
      const updateStmt = db.prepare("UPDATE users SET post = ? WHERE id = ?");
      updateStmt.bind([post || "", userRow.id]);
      updateStmt.step();
      updateStmt.free();

      return res.status(200).json({ success: true, post });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("Posts API error:", err);
    return res.status(500).json({ error: "SQL Error", detail: err.message });
  }
};
