import React, { useState } from "react";
import { login, register } from "../api.js";

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegistering = mode === "register";

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    if (!password) {
      setError("Password is required");
      return;
    }

    if (isRegistering && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const user = isRegistering
        ? await register(username.trim(), password)
        : await login(username.trim(), password);

      onLogin(user);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Public Messenger</h1>
          <p className="subtext">
            Please &mdash; {isRegistering ? "create an account" : "sign in"}
          </p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              disabled={loading}
              placeholder="Enter your username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isRegistering ? "new-password" : "current-password"}
              disabled={loading}
              placeholder="••••••••"
            />
          </div>

          {isRegistering && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm password</label>
              <input
                id="confirmPassword"
                type="password"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                disabled={loading}
                placeholder="••••••••"
              />
            </div>
          )}

          <button
            className="btn btn-primary btn-full"
            type="submit"
            disabled={loading}
          >
            {loading
              ? isRegistering
                ? "Creating account..."
                : "Signing in..."
              : isRegistering
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <div className="auth-footer">
          {!isRegistering ? (
            <>
              <p className="switch-text">
                Don't have an account?{" "}
                <button
                  type="button"
                  className="link-button"
                  onClick={() => switchMode("register")}
                  disabled={loading}
                >
                  Register
                </button>
              </p>
            </>
          ) : (
            <p className="switch-text">
              Already have an account?{" "}
              <button
                type="button"
                className="link-button"
                onClick={() => switchMode("login")}
                disabled={loading}
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
