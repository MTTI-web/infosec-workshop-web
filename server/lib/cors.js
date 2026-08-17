// Minimal CORS handling so the separately-deployed client project can
// call this API from a different Vercel domain. Returns true if the
// request was a preflight OPTIONS request that has already been
// responded to (caller should then just `return`).
function applyCors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

module.exports = { applyCors };
