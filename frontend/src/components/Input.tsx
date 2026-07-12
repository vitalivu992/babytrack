import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className, id, ...rest },
  ref,
) {
  const inputId = id || rest.name;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn("input", error && "border-rose-400 focus:ring-rose-200", className)}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...rest}
      />
      {error ? (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
});

/** Multi-line textarea variant. */
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  InputHTMLAttributes<HTMLTextAreaElement> & { label?: string }
>(function Textarea({ label, className, id, ...rest }, ref) {
  const inputId = id || rest.name;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        className={cn("input min-h-[88px] resize-y", className)}
        {...rest}
      />
    </div>
  );
});
