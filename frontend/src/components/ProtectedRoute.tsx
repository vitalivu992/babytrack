import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getToken } from "../api/client";
import { FullScreenLoader } from "./Layout";

/** Guards routes that require an authenticated user. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (!getToken()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (loading) {
    return <FullScreenLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

/** Inverse guard — redirects authenticated users away from auth pages. */
export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (user && getToken()) return <Navigate to="/app" replace />;
  return <>{children}</>;
}
