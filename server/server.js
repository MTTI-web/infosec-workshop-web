const express = require("express");
const cors = require("cors");

const login = require("./api/login");
const register = require("./api/register");
const health = require("./api/health");
const posts = require("./api/posts");

const app = express();

// Enable CORS and JSON parsing for local Express development
app.use(cors());
app.use(express.json());

// Route definitions
app.all("/api/login", login);
app.all("/api/register", register);
app.all("/api/health", health);
app.all("/api/posts", posts);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Vulnerable API listening on http://localhost:${PORT}`);
  console.log(`Try: POST http://localhost:${PORT}/api/login`);
});
