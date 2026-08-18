// src/api.js
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Example fetch call format:
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
