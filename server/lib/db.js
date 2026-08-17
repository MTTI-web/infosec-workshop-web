const initSqlJs = require('sql.js');

// sql.js is a pure WASM build of SQLite - no native compilation needed,
// which makes it deploy cleanly on Vercel's Node serverless runtime.
// The database lives entirely in memory and is reseeded whenever a
// fresh function instance starts up (perfect for a workshop demo where
// persistence across cold starts doesn't matter).

let dbPromise = null;

async function getDb() {
  if (!dbPromise) {
    dbPromise = initSqlJs().then((SQL) => {
      const db = new SQL.Database();

      db.run(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL,
          password TEXT NOT NULL,
          is_admin INTEGER NOT NULL DEFAULT 0,
          secret_pin TEXT NOT NULL
        );
      `);

      // Seed data - deliberately simple, plaintext passwords on purpose.
      // Freshers only know the username "bob" going in; everything else
      // (the admin account, its password) has to be discovered/bypassed.
      // secret_pin is each user's "sensitive" 4-digit PIN, stored here
      // in plaintext (server-side storage isn't the vuln being taught -
      // see crypto.js and login.js for the actual weak-encryption bug).
      db.run(`
        INSERT INTO users (username, password, is_admin, secret_pin) VALUES
          ('bob', 'letmein123', 0, '4821'),
          ('alice', 'sunshine99', 0, '7734'),
          ('admin', 'S3cr3t-Adm1n-Pass!', 1, '9999');
      `);

      return db;
    });
  }
  return dbPromise;
}

module.exports = { getDb };