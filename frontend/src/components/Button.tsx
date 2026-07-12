import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-500 text-white shadow-soft hover:bg-brand-600 active:bg-brand-700",
  secondary:
    "bg-brand-100 text-brand-700 hover:bg-brand-200 active:bg-brand-300",
  ghost: "bg-transparent text-slate-600 hover:bg-brand-50 hover:text-brand-700",
  danger: "bg-rose-500 text-white hover:bg-rose-600 active:bg-rose-700",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm min-w-[2.5rem]",
  md: "h-11 px-5 text-sm min-w-[3rem]",
  lg: "h-14 px-6 text-base min-w-[3.5rem]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn("btn", VARIANTS[variant], SIZES[size], className)}
      {...rest}
    >
      {loading && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      )}
      {children}
    </button>
  );
});
