import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getMe } from "../api/auth";
import { clearToken, getToken } from "../api/client";
import type { User } from "../api/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setUser: (u: User | null) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const USER_KEY = "babytrack.user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(readCachedUser());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUserState(null);
      setLoading(false);
      return;
    }
    try {
      const me = await getMe();
      setUserState(me);
      cacheUser(me);
    } catch {
      clearToken();
      setUserState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    if (u) cacheUser(u);
    else localStorage.removeItem(USER_KEY);
  }, []);

  const signOut = useCallback(() => {
    clearToken();
    localStorage.removeItem(USER_KEY);
    setUserState(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, setUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

function readCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function cacheUser(u: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(u));
}
