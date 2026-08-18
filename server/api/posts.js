const { getDb } = require("../lib/db");
const { applyCors } = require("../lib/cors");

module.exports = async (req, res) => {
  if (applyCors(req, res)) return;

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  let db;
  let query;

  try {
    db = await getDb();

    // ==========================================
    // FETCH POSTS & SEARCH (GET Method)
    // ==========================================
    if (req.method === "GET") {
      const q = req.query?.q || req.query?.search || "";
      const posts = [];

      if (q) {
        // Intentionally vulnerable non-parameterized SQL query
        const sql = `SELECT id, username, post FROM users WHERE username = '${q}' AND is_admin = 0`;

        query = db.prepare(sql);
        while (query.step()) {
          posts.push(query.getAsObject());
        }
        query.free();
        query = null;
      } else {
        // Default load hides admin user
        query = db.prepare(
          `SELECT id, username, post FROM users WHERE is_admin = 0 ORDER BY id DESC`,
        );
        while (query.step()) {
          posts.push(query.getAsObject());
        }
        query.free();
        query = null;
      }

      return res.status(200).json(posts);
    }

    // ==========================================
    // UPDATE A POST (POST Method)
    // ==========================================
    if (req.method === "POST") {
      const { userId, post } = req.body || {};

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const sanitizedPost = typeof post === "string" ? post.trim() : "";

      query = db.prepare("UPDATE users SET post = ? WHERE id = ?");
      query.bind([sanitizedPost, userId]);
      query.step();
      query.free();
      query = null;

      const changesResult = db.exec("SELECT changes()");
      if (changesResult[0].values[0][0] === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.status(200).json({
        message: "Post updated successfully",
        post: sanitizedPost,
      });
    }
  } catch (err) {
    // Pass the raw SQLite database message directly in the error field
    const rawError = err.message || String(err);
    console.error("SQL Execution Error:", rawError);
    return res.status(400).json({ error: rawError, detail: rawError });
  } finally {
    if (query) query.free();
  }
};
