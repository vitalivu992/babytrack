import { type ReactNode } from "react";
import { cn } from "../lib/utils";

export interface CardProps {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  action?: ReactNode;
  onClick?: () => void;
}

export function Card({ children, className, title, action, onClick }: CardProps) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "card text-left",
        onClick && "w-full transition hover:shadow-soft active:scale-[0.99]",
        className,
      )}
    >
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && (
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {title}
            </h3>
          )}
          {action}
        </div>
      )}
      {children}
    </Comp>
  );
}

/** A labelled stat tile for summary grids. */
export function StatCard({
  label,
  value,
  sub,
  icon,
  accent = "brand",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  accent?: "brand" | "pink" | "sky" | "mint" | "peach";
}) {
  const accents: Record<string, string> = {
    brand: "bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300",
    pink: "bg-pink-soft/40 text-pink-700 dark:bg-pink-soft/20 dark:text-pink-300",
    sky: "bg-sky-soft/40 text-sky-700 dark:bg-sky-soft/20 dark:text-sky-300",
    mint: "bg-mint-soft/40 text-emerald-700 dark:bg-mint-soft/20 dark:text-emerald-300",
    peach: "bg-peach-soft/40 text-orange-700 dark:bg-peach-soft/20 dark:text-orange-300",
  };
  return (
    <Card className="flex items-center gap-4 p-4">
      {icon && (
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", accents[accent])}>
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {label}
        </p>
        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
        {sub && <p className="truncate text-xs text-slate-400 dark:text-slate-500">{sub}</p>}
      </div>
    </Card>
  );
}
