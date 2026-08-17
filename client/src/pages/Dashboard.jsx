import React from 'react';

export default function Dashboard({ user, onLogout }) {
  // --- INTENTIONAL VULNERABILITY: trusting the client-side flag ------
  // Whether the "admin panel" renders is decided entirely by the
  // `is_admin` value sitting in this component's props/localStorage.
  // The server is never asked again to confirm this on page load, so
  // editing `user` in localStorage (via devtools) to `is_admin: true`
  // is enough to unlock this view - no valid admin credentials needed.
  // ----------------------------------------------------------------------
  return (
    <div className="page">
      <div className="card wide">
        <div className="header-row">
          <h1>Dashboard</h1>
          <button className="secondary" onClick={onLogout}>
            Log out
          </button>
        </div>

        <p>
          Welcome, <strong>{user.username}</strong> (id: {user.id})
        </p>

        {user.is_admin ? (
          <div className="admin-panel">
            <h2>🔓 Admin Panel</h2>
            <p>You should not be able to see this without real admin credentials.</p>
            <p className="flag">FLAG: workshop_flag_is_admin_bypass</p>
          </div>
        ) : (
          <div className="user-panel">
            <h2>Standard User Area</h2>
            <p>Nothing interesting here... or is there?</p>
          </div>
        )}
      </div>
    </div>
  );
}
