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
    setUser(userData);
  }

  useEffect(() => {
    console.log(user);
  }, [user])

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }

  return user ? (
    <Dashboard user={user} onLogout={handleLogout} />
  ) : (
    <Login onLogin={handleLogin} />
  );
}
