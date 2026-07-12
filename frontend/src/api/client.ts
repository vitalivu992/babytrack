import axios, { type AxiosError, type AxiosInstance } from "axios";

export const TOKEN_KEY = "babytrack.token";

const TOKEN_STORAGE = typeof localStorage !== "undefined" ? localStorage : null;

/** Read the JWT from local storage. */
export function getToken(): string | null {
  return TOKEN_STORAGE?.getItem(TOKEN_KEY) ?? null;
}

/** Persist the JWT to local storage. */
export function setToken(token: string): void {
  TOKEN_STORAGE?.setItem(TOKEN_KEY, token);
}

/** Remove the JWT from local storage. */
export function clearToken(): void {
  TOKEN_STORAGE?.removeItem(TOKEN_KEY);
}

/** Standard error shape returned by the backend. */
export interface ApiError {
  message: string;
  status: number;
}

// Base URL: same-origin in production (embedded SPA); dev proxy in development.
const baseURL = import.meta.env.VITE_API_URL || "/api";

export const api: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Attach bearer token to every request.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Unwrap the `{ data, error }` envelope and normalize errors.
api.interceptors.response.use(
  (response) => {
    // Backend wraps payloads as { data: ... }; surface the inner payload.
    const body = response.data;
    if (body && typeof body === "object" && "data" in body && Object.keys(body).length <= 2) {
      response.data = body.data;
    }
    return response;
  },
  (error: AxiosError<{ error?: string }>) => {
    const status = error.response?.status ?? 0;
    const message =
      error.response?.data?.error || error.message || "Something went wrong. Please try again.";

    // Auto-logout on auth failures.
    if (status === 401) {
      clearToken();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }

    return Promise.reject<ApiError>({ message, status });
  },
);

/** Extract a user-friendly message from any thrown value. */
export function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return "Something went wrong.";
}
