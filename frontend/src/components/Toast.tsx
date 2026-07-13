import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import * as Toast from "@radix-ui/react-toast";
import { useTranslation } from "react-i18next";
import { cn } from "../lib/utils";

type ToastVariant = "info" | "success" | "error";

interface ToastRecord {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastApi {
  show: (t: { title: string; description?: string; variant?: ToastVariant }) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const { t: tt } = useTranslation();

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback<ToastApi["show"]>((t) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, title: t.title, description: t.description, variant: t.variant ?? "info" }]);
  }, []);

  const api: ToastApi = {
    show,
    success: (title, description) => show({ title, description, variant: "success" }),
    error: (title, description) => show({ title, description, variant: "error" }),
  };

  return (
    <ToastContext.Provider value={api}>
      <Toast.Provider swipeDirection="right" duration={4000}>
        {children}
        {toasts.map((t) => (
          <Toast.Root
            key={t.id}
            onOpenChange={(open) => !open && remove(t.id)}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-2xl border-l-4 bg-white p-4 shadow-soft dark:bg-slate-800",
              "data-[state=open]:animate-in data-[state=open]:slide-in-from-right",
              t.variant === "success" && "border-emerald-400",
              t.variant === "error" && "border-rose-400",
              t.variant === "info" && "border-brand-400",
            )}
          >
            <div className="min-w-0 flex-1">
              <Toast.Title className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t.title}</Toast.Title>
              {t.description && (
                <Toast.Description className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  {t.description}
                </Toast.Description>
              )}
            </div>
            <Toast.Close
              aria-label={tt("common.dismiss")}
              className="rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </Toast.Close>
          </Toast.Root>
        ))}
        <Toast.Viewport className="fixed bottom-24 right-4 z-[60] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 sm:bottom-4" />
      </Toast.Provider>
    </ToastContext.Provider>
  );
}
