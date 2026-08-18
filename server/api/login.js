const { getDb } = require('../lib/db');
const { applyCors } = require('../lib/cors');
const { encryptPin } = require('../lib/crypto');

module.exports = async (req, res) => {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, username, password } = req.body || {};

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'username and password are required' });
  }

  // Determine mode from body payload, query string, or endpoint URL
  const isRegister =
    action === 'register' ||
    req.query?.action === 'register' ||
    req.url?.includes('register');

  let db;
  let query;

  try {
    db = await getDb();
    const cleanUsername = username.trim();

    if (isRegister) {
      if (!cleanUsername || !password) {
        return res.status(400).json({ error: 'username and password are required' });
      }

      // 1. Check if user already exists
      query = db.prepare('SELECT id FROM users WHERE username = ?');
      query.bind([cleanUsername]);

      if (query.step()) {
        return res.status(409).json({ error: 'Username already exists' });
      }
      query.free();

      // 2. Generate PIN and insert new user
      const secretPin = Math.floor(1000 + Math.random() * 9000).toString();
      query = db.prepare(`
        INSERT INTO users (username, password, is_admin, secret_pin) 
        VALUES (?, ?, 0, ?)
      `);
      query.bind([cleanUsername, password, secretPin]);
      query.step();
      query.free();

      // 3. Fetch newly created row ID
      const result = db.exec("SELECT last_insert_rowid()");
      const newId = result[0].values[0][0];
      query = null;

      return res.status(201).json({
        id: newId,
        username: cleanUsername,
        is_admin: false,
        encrypted_pin: encryptPin(secretPin),
      });

    } else {
      // Login Flow
      query = db.prepare(`
        SELECT id, username, is_admin, secret_pin
        FROM users
        WHERE username = ? AND password = ?
      `);
      query.bind([cleanUsername, password]);

      let row = null;
      if (query.step()) {
        row = query.getAsObject();
      }

      if (!row) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      const { id, username: dbUsername, is_admin, secret_pin } = row;

      return res.status(200).json({
        id,
        username: dbUsername,
        is_admin: !!is_admin,
        encrypted_pin: encryptPin(secret_pin),
      });
    }

  } catch (err) {
    console.error('Auth request failed:', err);
    return res.status(500).json({ error: 'Authentication request failed', detail: err.message });
  } finally {
    if (query) {
      query.free();
    }
  }
};