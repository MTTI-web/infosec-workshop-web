# VulnApp — Intro Cybersecurity Workshop Demo

A deliberately vulnerable login app with two bugs, built for a hands-on
intro-to-security session. Two separate projects, deploy each to Vercel
independently:

```
vulnerable-app/
├── server/   → Node/Express API (deploy as its own Vercel project)
└── client/   → Vite + React frontend (deploy as its own Vercel project)
```

## The two vulnerabilities

1. **SQL Injection in `/api/login`** (`server/api/login.js`)
   The username/password are concatenated directly into a raw SQL
   string instead of using a parameterized query. Example payloads:

   - Username: `admin' --`  Password: `anything`
     → comments out the password check, logs in as `admin`
   - Username: `' OR '1'='1' --`  Password: `anything`
     → classic bypass, logs in as whichever row comes back first

2. **Trusted client-side `is_admin` flag** (`client/src/pages/Dashboard.jsx`)
   After login, the server returns an `is_admin` field and the client
   stores it in `localStorage` under the key `user`, then uses it
   *locally* to decide whether to render the admin panel. Nothing
   re-checks this with the server. So even without solving #1, opening
   devtools → Application → Local Storage and changing `is_admin` to
   `true` unlocks the admin panel.

Freshers only get the username `bob` at the start — a good excuse to
show them devtools → Network/Application tabs before anything else.

## Local development

**Server**
```bash
cd server
npm install
npm run dev        # http://localhost:3001
```

**Client** (in a second terminal)
```bash
cd client
npm install
cp .env.example .env   # defaults to http://localhost:3001
npm run dev             # http://localhost:5173
```

## Deploying to Vercel

Deploy `server/` and `client/` as **two separate Vercel projects**
(two `vercel --prod` runs, or two "Import Project" clicks pointing at
the same repo with different Root Directory settings).

1. **Server**: Import with Root Directory = `server`. Vercel
   auto-detects the files under `api/` as serverless functions — no
   extra config needed. Note the deployed URL, e.g.
   `https://vulnapp-server.vercel.app`.
2. **Client**: Import with Root Directory = `client`. In the project's
   Environment Variables settings, set:
   ```
   VITE_API_URL=https://vulnapp-server.vercel.app
   ```
   Vercel auto-detects the Vite build. Deploy.

That's it — no database to provision, since the SQLite database
(via `sql.js`, pure WASM, no native build step) lives entirely in
memory and reseeds itself whenever a fresh function instance spins up.

## Fixing the vulnerabilities (for the second half of the workshop)

1. Replace the string-concatenated query with a parameterized one
   (`db.prepare('SELECT ... WHERE username = ? AND password = ?')`
   equivalent in sql.js is `stmt.bind([username, password])`), and
   hash passwords instead of storing them in plaintext.
2. Never trust client-supplied authorization flags. Issue a signed
   session token (JWT or opaque session id) on login, and have any
   route that returns admin data verify that token server-side rather
   than reading `is_admin` out of whatever the client sends back.
