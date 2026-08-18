const initSqlJs = require("sql.js");
const path = require("path");

let dbPromise = null;

async function getDb() {
  if (!dbPromise) {
    dbPromise = initSqlJs({
      // __dirname forces Vercel's build tracer to discover and bundle sql-wasm.wasm
      locateFile: (file) =>
        path.join(__dirname, "../node_modules/sql.js/dist", file),
    }).then((SQL) => {
      const db = new SQL.Database();

      // Create users table, now including their single 'post' property
      db.run(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL,
          password TEXT NOT NULL,
          is_admin INTEGER NOT NULL DEFAULT 0,
          secret_pin TEXT NOT NULL,
          post TEXT
        );
      `);

      // Seed user data along with their single post
      db.run(`
        INSERT INTO users (username, password, is_admin, secret_pin, post) VALUES
          ('bob', 'letmein123', 0, '4821', 'Hello world! This is my first post.'),
          ('alice', 'sunshine99', 0, '7734', 'Sunshine makes everything better!'),
          ('admin', '70141889550cec0cfa21962be7d171ef', 1, '9999', 'I heard hashes are unbreakable. My password is');
      `);

      return db;
    });
  }
  return dbPromise;
}

module.exports = { getDb };
