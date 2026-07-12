import { api, setToken } from "./client";
import type { AuthResponse, User } from "./types";

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

/** Register a new account. The backend returns the user without a token, so we
 * immediately log in to obtain a JWT. */
export async function register(input: RegisterInput): Promise<User> {
  await api.post<User>("/auth/register", input);
  // Auto-login to receive a token (register does not return one).
  const res = await login({ email: input.email, password: input.password });
  return res.user;
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>("/auth/login", input);
  setToken(res.data.token);
  return res.data;
}

export async function getMe(): Promise<User> {
  const res = await api.get<User>("/auth/me");
  return res.data;
}
