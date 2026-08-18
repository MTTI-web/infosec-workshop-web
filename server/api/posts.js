const { getDb } = require("../lib/db");
const { applyCors } = require("../lib/cors");

module.exports = async (req, res) => {
  if (applyCors(req, res)) return;

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  let db;

  try {
    db = await getDb();

    // ==========================================
    // FETCH POSTS & SEARCH (GET Method)
    // Vulnerability: Unsanitized SQL Concatenation
    // ==========================================
    if (req.method === "GET") {
      const q = req.query?.q || req.query?.search || "";
      const posts = [];
      let query;

      try {
        if (q) {
          // VULNERABLE QUERY: Allows dumping all posts (including admin) via ' OR 1=1 --
          const sql = `SELECT id, username, post FROM users WHERE username = '${q}' AND is_admin = 0`;
          query = db.prepare(sql);
        } else {
          // Default load hides admin user
          query = db.prepare(
            `SELECT id, username, post FROM users WHERE is_admin = 0 ORDER BY id DESC`,
          );
        }

        while (query.step()) {
          posts.push(query.getAsObject());
        }
      } finally {
        if (query) query.free();
      }

      return res.status(200).json(posts);
    }

    // ==========================================
    // UPDATE A POST (POST Method)
    // Vulnerability: Insecure Direct Object Reference / Client Trust
    // ==========================================
    if (req.method === "POST") {
      // Safely parse body
      const body =
        typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      const { userId, username, post } = body;

      // VULNERABILITY: We trust the client-provided username.
      // An attacker can change their username to 'admin' in the request payload to overwrite the admin post.
      const identifier = username || userId;

      if (!identifier) {
        return res
          .status(400)
          .json({ error: "User identifier required (username or userId)" });
      }

      const sanitizedPost = typeof post === "string" ? post.trim() : "";

      // 1. Find the user first
      let row = null;
      let checkStmt;
      try {
        if (username) {
          checkStmt = db.prepare("SELECT id FROM users WHERE username = ?");
          checkStmt.bind([username]);
        } else {
          checkStmt = db.prepare("SELECT id FROM users WHERE id = ?");
          checkStmt.bind([userId]);
        }

        if (checkStmt.step()) {
          row = checkStmt.getAsObject();
        }
      } finally {
        if (checkStmt) checkStmt.free();
      }

      // Handle Vercel in-memory state loss gracefully
      if (!row) {
        return res.status(404).json({
          error: "SQL Error: User not found.",
          detail:
            "Note: Newly registered users disappear on Vercel due to serverless in-memory DB resets. Log in as a seeded user ('bob' or 'alice') to test updates!",
        });
      }

      // 2. Update the post
      let updateStmt;
      try {
        updateStmt = db.prepare("UPDATE users SET post = ? WHERE id = ?");
        updateStmt.bind([sanitizedPost, row.id]);
        updateStmt.step();
      } finally {
        if (updateStmt) updateStmt.free();
      }

      return res.status(200).json({
        message: "Post updated successfully",
        post: sanitizedPost,
      });
    }
  } catch (err) {
    // Pass the raw SQLite database message directly in the error field for the workshop frontend
    const rawError = err.message || String(err);
    console.error("SQL Execution Error:", rawError);
    return res.status(400).json({ error: rawError, detail: rawError });
  }
};
