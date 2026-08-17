// In prod, set VITE_API_URL to the deployed server project's URL
// (e.g. https://vulnapp-server.vercel.app). Falls back to localhost
// for local dev against `npm run dev` in /server.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function login(username, password) {
  const res = await fetch(`${API_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Login failed');
  }
  return data;
}
