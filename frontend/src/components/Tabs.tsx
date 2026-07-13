import { useState, type ReactNode } from "react";
import * as RadixTabs from "@radix-ui/react-tabs";
import { cn } from "../lib/utils";

export interface TabItem {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
}

export interface TabsProps {
  /** Controlled value. If omitted, the tabs run in uncontrolled mode via defaultValue. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  items: TabItem[];
  children: ReactNode;
  className?: string;
}

/**
 * Radix tabs with a pill-style trigger row. Supports both controlled
 * (value/onValueChange) and uncontrolled (defaultValue) usage.
 */
export function Tabs({
  value,
  defaultValue,
  onValueChange,
  items,
  children,
  className,
}: TabsProps) {
  return (
    <RadixTabs.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      className={cn("w-full", className)}
    >
      <RadixTabs.List
        className="mb-4 flex w-full gap-1 overflow-x-auto rounded-2xl bg-brand-50 p-1.5 dark:bg-slate-700/50"
        aria-label="Sections"
      >
        {items.map((item) => (
          <RadixTabs.Trigger
            key={item.value}
            value={item.value}
            className={cn(
              "flex flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 transition dark:text-slate-400",
              "data-[state=active]:bg-white data-[state=active]:text-brand-700 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-brand-300",
              "hover:text-brand-600 dark:hover:text-brand-400",
            )}
          >
            {item.icon}
            {item.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {children}
    </RadixTabs.Root>
  );
}

export function TabContent({ value, children }: { value: string; children: ReactNode }) {
  return (
    <RadixTabs.Content value={value} className="outline-none">
      {children}
    </RadixTabs.Content>
  );
}

// Re-export for components that need local tab state with a stable identity.
export function useTabsState(initial: string) {
  return useState(initial);
}
