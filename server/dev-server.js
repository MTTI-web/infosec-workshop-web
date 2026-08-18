// Local development server. Vercel deploys api/*.js directly as
// serverless functions (no code changes needed), but for local testing
// this thin Express wrapper mounts the same handlers on a normal port.
const express = require('express');

const login = require('./api/login');
const health = require('./api/health');
const posts = require('./api/posts');

const app = express();
app.use(express.json());

app.all('/api/login', login);
app.all('/api/health', health);
app.all('/api/register', login);
app.all('/api/posts', posts);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Vulnerable API listening on http://localhost:${PORT}`);
  console.log(`Try: POST http://localhost:${PORT}/api/login`);
});
