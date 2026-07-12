import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { listChildren } from "../api/children";
import type { Child } from "../api/types";

const ACTIVE_KEY = "babytrack.activeChildId";

interface ActiveChildState {
  children: Child[];
  loading: boolean;
  activeChild: Child | null;
  activeChildId: string | null;
  setActiveChildId: (id: string) => void;
  canEdit: boolean;
  isOwner: boolean;
}

const ActiveChildContext = createContext<ActiveChildState | null>(null);

export function ActiveChildProvider({ children }: { children: ReactNode }) {
  const [activeChildId, setActiveChildIdState] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_KEY),
  );

  const query = useQuery({
    queryKey: ["children"],
    queryFn: listChildren,
  });

  const childrenList = query.data ?? [];

  // Resolve the active child, falling back to the first child.
  const activeChild = useMemo(() => {
    if (!childrenList.length) return null;
    const match = activeChildId
      ? childrenList.find((c) => c.id === activeChildId)
      : undefined;
    return match ?? childrenList[0];
  }, [childrenList, activeChildId]);

  // Persist + normalize when the resolved active id changes.
  useEffect(() => {
    if (activeChild) {
      localStorage.setItem(ACTIVE_KEY, activeChild.id);
    }
  }, [activeChild]);

  const setActiveChildId = useCallback((id: string) => {
    setActiveChildIdState(id);
    localStorage.setItem(ACTIVE_KEY, id);
  }, []);

  const role = activeChild?.role ?? "viewer";
  const value: ActiveChildState = {
    children: childrenList,
    loading: query.isLoading,
    activeChild,
    activeChildId: activeChild?.id ?? null,
    setActiveChildId,
    canEdit: role === "owner" || role === "editor",
    isOwner: role === "owner",
  };

  return (
    <ActiveChildContext.Provider value={value}>{children}</ActiveChildContext.Provider>
  );
}

export function useActiveChild(): ActiveChildState {
  const ctx = useContext(ActiveChildContext);
  if (!ctx) throw new Error("useActiveChild must be used within <ActiveChildProvider>");
  return ctx;
}
