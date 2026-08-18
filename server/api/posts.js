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
      const search = req.query?.search || req.query?.q || "";

      if (search.trim()) {
        query = db.prepare(`
          SELECT id, username, post
          FROM users
          WHERE username LIKE ?
          ORDER BY id DESC
        `);
        query.bind([`%${search.trim()}%`]);
      } else {
        query = db.prepare(`
          SELECT id, username, post
          FROM users
          ORDER BY id DESC
        `);
      }

      const posts = [];
      while (query.step()) {
        posts.push(query.getAsObject());
      }
      query.free();
      query = null;

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
    console.error("Post operation failed:", err);
    return res
      .status(500)
      .json({ error: "Post operation failed", detail: err.message });
  } finally {
    if (query) query.free();
  }
};
