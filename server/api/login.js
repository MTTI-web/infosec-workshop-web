const { getDb } = require('../lib/db');
const { applyCors } = require('../lib/cors');
const { encryptPin } = require('../lib/crypto');

module.exports = async (req, res) => {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body || {};

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'username and password are required' });
  }

  const db = await getDb();

  // --- INTENTIONAL VULNERABILITY: username enumeration ----------------
  // This first check is SAFE (parameterized), so it isn't injectable on
  // its own. But splitting "user doesn't exist" from "wrong password"
  // into two different responses lets an attacker enumerate valid
  // usernames one guess at a time before ever touching the SQLi bug
  // below. It also means the SQLi injection point (the password field,
  // see below) only becomes reachable once a real username is known.
  // ----------------------------------------------------------------------
  const checkStmt = db.prepare('SELECT id FROM users WHERE username = ?');
  checkStmt.bind([username]);
  const userExists = checkStmt.step();
  checkStmt.free();

  if (!userExists) {
    return res.status(401).json({ error: 'User does not exist' });
  }

  // --- INTENTIONAL VULNERABILITY: SQL Injection -----------------------
  // The password is concatenated directly into the SQL string instead
  // of using a parameterized query. Because the username was already
  // confirmed to be real above, this only works once you know a valid
  // username, e.g.:
  //
  //   username:  admin
  //   password:  ' OR '1'='1' --
  //
  // ...which turns the query into:
  //
  //   SELECT id, username, is_admin, secret_pin FROM users
  //   WHERE username = 'admin' AND password = '' OR '1'='1' --'
  //
  // (everything after `--` is commented out, and '1'='1' makes the
  // WHERE clause always true, so the password is never really checked).
  // ----------------------------------------------------------------------
  const query = `SELECT id, username, is_admin, secret_pin FROM users WHERE username = '${username}' AND password = '${password}'`;

  let result;
  try {
    result = db.exec(query);
  } catch (err) {
    // Deliberately leaking the raw DB error - handy for a workshop
    // (attackers use error messages like this to fingerprint a
    // vulnerable query), but never do this in production.
    return res.status(500).json({ error: 'Query failed', detail: err.message });
  }

  if (!result.length || !result[0].values.length) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  const [id, dbUsername, isAdmin, secretPin] = result[0].values[0];

  // --- INTENTIONAL VULNERABILITY: weak encryption of sensitive data ---
  // secret_pin is "encrypted" before being sent to the client using a
  // single-byte XOR cipher (see lib/crypto.js) - trivially reversible.
  // The client stores this encrypted value in localStorage, giving
  // freshers a target to crack: recover the real PIN without ever
  // seeing the server's source code.
  // ----------------------------------------------------------------------
  const encryptedPin = encryptPin(secretPin);

  // --- INTENTIONAL VULNERABILITY: trusted client-side admin flag ------
  // The server hands back `is_admin` as plain data and never checks it
  // again on any later request. The client is the one deciding what to
  // show based on this value, and nothing stops a user from editing it
  // directly (e.g. in localStorage via devtools) to grant themselves
  // admin UI without ever passing this check for real.
  // ----------------------------------------------------------------------
  return res.status(200).json({
    id,
    username: dbUsername,
    is_admin: !!isAdmin,
    encrypted_pin: encryptedPin,
  });
};