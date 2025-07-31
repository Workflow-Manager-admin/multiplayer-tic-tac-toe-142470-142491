const API_BASE = "/api";

/**
 * Makes API requests and handles basic error mapping.
 */
async function apiRequest(path: string, opts?: RequestInit): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...(opts || {}),
    headers: {
      ...(opts?.headers || {}),
      "Content-Type": "application/json",
    },
    credentials: "include",
  });
  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    data = { message: "Invalid server response" };
  }
  if (!res.ok) {
    throw new Error((data && data.message) || "API Error");
  }
  return data;
}

// PUBLIC_INTERFACE
export const api = {
  // Session
  getSession: () => apiRequest("/session"),
  // Auth/register
  registerOrLogin: (username: string) =>
    apiRequest("/users", {
      method: "POST",
      body: JSON.stringify({ username }),
    }),
  // Create new game
  createGame: () =>
    apiRequest("/games", { method: "POST" }),
  // Join existing game
  joinGame: (game_id: number) =>
    apiRequest(`/games/${game_id}/join`, { method: "POST" }),
  // Get game state
  getGame: (game_id: number) =>
    apiRequest(`/games/${game_id}`),
  // Make move
  makeMove: (game_id: number, i: number, j: number) =>
    apiRequest(`/games/${game_id}/move`, {
      method: "POST",
      body: JSON.stringify({ row: i, col: j }),
    }),
};
