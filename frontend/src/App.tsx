import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { AuthProvider } from "./hooks/useAuth";
import { ActiveChildProvider, useActiveChild } from "./hooks/useActiveChild";
import {
  ProtectedRoute,
  PublicOnlyRoute,
} from "./components/ProtectedRoute";
import { FullScreenLoader, AppLayout } from "./components/Layout";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import AddLog from "./pages/AddLog";
import ChildProfile from "./pages/ChildProfile";
import LogHistory from "./pages/LogHistory";
import Insights from "./pages/Insights";
import Share from "./pages/Share";
import Settings from "./pages/Settings";
import AcceptInvite from "./pages/AcceptInvite";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
        <Route path="/invite" element={<AcceptInvite />} />

        {/* Onboarding (auth required) */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />

        {/* Authenticated app */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <ActiveChildProvider>
                <RequireChild>
                  <AppLayout />
                </RequireChild>
              </ActiveChildProvider>
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="logs" element={<LogHistory />} />
          <Route path="child" element={<ChildProfile />} />
          <Route path="insights" element={<Insights />} />
          <Route path="share" element={<Share />} />
          <Route path="settings" element={<Settings />} />
          <Route path="log/new" element={<AddLog />} />
        </Route>

        {/* Fallbacks */}
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </AuthProvider>
  );
}

/**
 * Ensures the user has at least one child before entering the app shell.
 * Redirects to onboarding if the children list is empty (and not loading).
 */
function RequireChild({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { activeChild, children: list, loading } = useActiveChild();

  // Always allow the log modal / child-agnostic routes to resolve; only gate
  // the shell when we know the list is truly empty.
  if (loading) return <FullScreenLoader />;
  if (!list.length) {
    return <Navigate to="/onboarding" replace state={{ from: location }} />;
  }
  if (!activeChild) return <FullScreenLoader />;
  return <>{children}</>;
}
