import * as React from "react";
import * as RadixSelect from "@radix-ui/react-select";
import { cn } from "../lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

/** Radix-based select with a pastel trigger styled to match the Input. */
export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  label,
  id,
  disabled,
  className,
}: SelectProps) {
  const selectId = id || `select-${React.useId()}`;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="label">
          {label}
        </label>
      )}
      <RadixSelect.Root value={value} onValueChange={onValueChange} disabled={disabled}>
        <RadixSelect.Trigger
          id={selectId}
          className={cn(
            "input flex w-full items-center justify-between gap-2 data-[placeholder]:text-slate-400",
            className,
          )}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon className="text-slate-400">
            <ChevronDown />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={6}
            className="z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-soft"
          >
            <RadixSelect.Viewport className="w-full">
              {options.map((opt) => (
                <RadixSelect.Item
                  key={opt.value}
                  value={opt.value}
                  className="relative flex cursor-pointer select-none items-center rounded-lg py-2.5 pl-8 pr-3 text-sm text-slate-700 outline-none data-[highlighted]:bg-brand-50 data-[highlighted]:text-brand-700"
                >
                  <RadixSelect.ItemIndicator className="absolute left-2.5 text-brand-500">
                    <Check />
                  </RadixSelect.ItemIndicator>
                  <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </div>
  );
}

function ChevronDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
