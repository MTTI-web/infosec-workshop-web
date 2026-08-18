const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export async function login(username, password) {
  const res = await fetch(`${API_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.detail || "Login failed");
  }
  return data;
}

export async function register(username, password) {
  const res = await fetch(`${API_URL}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.detail || "Registration failed");
  }
  return data;
}

export async function getPosts(searchQuery = "") {
  const url = new URL(`${API_URL}/api/posts`);
  if (searchQuery.trim()) {
    url.searchParams.append("q", searchQuery.trim());
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.detail || "Failed to fetch posts");
  }
  return data;
}

export async function updatePost(user, post) {
  const res = await fetch(`${API_URL}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      userId: user.id, 
      username: user.username, 
      post 
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.detail || 'Failed to update post');
  }
  return data;
}