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
          {title && <h3 className="text-sm font-semibold text-slate-700">{title}</h3>}
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
    brand: "bg-brand-50 text-brand-600",
    pink: "bg-pink-soft/40 text-pink-700",
    sky: "bg-sky-soft/40 text-sky-700",
    mint: "bg-mint-soft/40 text-emerald-700",
    peach: "bg-peach-soft/40 text-orange-700",
  };
  return (
    <Card className="flex items-center gap-4 p-4">
      {icon && (
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", accents[accent])}>
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        {sub && <p className="truncate text-xs text-slate-400">{sub}</p>}
      </div>
    </Card>
  );
}
