import type { ComponentType, SVGProps } from "react";
import type { ActivityLog, LogType } from "../api/types";
import {
  BottleIcon,
  DiaperIcon,
  MoonIcon,
  PillIcon,
  RulerIcon,
  SparkleIcon,
} from "../components/icons";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

export const LOG_TYPE_META: Record<
  LogType,
  { label: string; icon: Icon; color: string; bg: string }
> = {
  feeding: { label: "Feeding", icon: BottleIcon, color: "text-brand-600", bg: "bg-brand-50" },
  diaper: { label: "Diaper", icon: DiaperIcon, color: "text-pink-700", bg: "bg-pink-soft/40" },
  sleep: { label: "Sleep", icon: MoonIcon, color: "text-indigo-600", bg: "bg-indigo-50" },
  measurement: { label: "Measurement", icon: RulerIcon, color: "text-sky-700", bg: "bg-sky-soft/40" },
  medicine: { label: "Medicine", icon: PillIcon, color: "text-rose-600", bg: "bg-rose-50" },
  other: { label: "Other", icon: SparkleIcon, color: "text-emerald-700", bg: "bg-mint-soft/40" },
};

export function logTypeMeta(type: LogType) {
  return LOG_TYPE_META[type] ?? LOG_TYPE_META.other;
}

/** Human-readable summary of a log's free-form data payload. */
export function describeLog(log: ActivityLog): string {
  const d = log.data ?? {};
  switch (log.type) {
    case "feeding": {
      const parts: string[] = [];
      const sub = d.subtype as string | undefined;
      if (sub) parts.push(capitalize(sub));
      if (typeof d.amount_ml === "number" && d.amount_ml > 0) parts.push(`${d.amount_ml} ml`);
      if (typeof d.duration_min === "number" && d.duration_min > 0) parts.push(`${d.duration_min} min`);
      const side = d.side as string | undefined;
      if (side) parts.push(side);
      return parts.join(" · ") || "Feeding";
    }
    case "diaper": {
      const contents = d.contents as string | undefined;
      const map: Record<string, string> = { pee: "Pee", poop: "Poop", both: "Pee + Poop" };
      const parts: string[] = [];
      if (contents) parts.push(map[contents] ?? capitalize(contents));
      if (typeof d.consistency === "number") parts.push(`Bristol ${d.consistency}`);
      const color = d.color as string | undefined;
      if (color) parts.push(color);
      return parts.join(" · ") || "Diaper change";
    }
    case "sleep": {
      const sub = d.subtype as string | undefined;
      const mins = sleepMinutes(log);
      const parts: string[] = [];
      if (sub) parts.push(capitalize(sub));
      parts.push(mins > 0 ? `${formatMin(mins)}` : "Started");
      return parts.join(" · ");
    }
    case "measurement": {
      const mtype = d.measurement_type as string | undefined;
      const value = d.value as number | undefined;
      const unit = d.unit as string | undefined;
      if (mtype && typeof value === "number") return `${capitalize(mtype)}: ${value}${unit ? " " + unit : ""}`;
      return "Measurement";
    }
    case "medicine": {
      const name = d.name as string | undefined;
      const dose = d.dose as string | undefined;
      return [name, dose].filter(Boolean).join(" · ") || "Medicine";
    }
    case "other": {
      const category = d.category as string | undefined;
      return capitalize(category ?? log.note ?? "Activity");
    }
    default:
      return log.note || "Activity";
  }
}

export function sleepMinutes(log: ActivityLog): number {
  const d = log.data ?? {};
  if (typeof d.duration_minutes === "number") return d.duration_minutes;
  const start = d.start as string | undefined;
  const end = d.end as string | undefined;
  if (start && end) {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (ms > 0) return Math.round(ms / 60000);
  }
  return 0;
}

function formatMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
