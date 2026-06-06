const browserApiOrigin =
  typeof window !== "undefined" && (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost")
    ? `${window.location.protocol}//${window.location.hostname}:4000`
    : undefined;

const API_URL = import.meta.env.VITE_API_URL ?? browserApiOrigin ?? "http://localhost:4000";

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    displayName: string;
  };
}

export async function register(payload: { email: string; password: string; displayName: string }): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Unable to register");
  }

  return response.json();
}

export async function login(payload: { email: string; password: string }): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Unable to login");
  }

  return response.json();
}

export { API_URL };
