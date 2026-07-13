import type { ComponentType, SVGProps } from "react";
import type { ActivityLog, LogType } from "../api/types";
import i18n from "../i18n";
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
  { labelKey: string; icon: Icon; color: string; bg: string }
> = {
  feeding: { labelKey: "logs.types.feeding", icon: BottleIcon, color: "text-brand-600", bg: "bg-brand-50" },
  diaper: { labelKey: "logs.types.diaper", icon: DiaperIcon, color: "text-pink-700", bg: "bg-pink-soft/40" },
  sleep: { labelKey: "logs.types.sleep", icon: MoonIcon, color: "text-indigo-600", bg: "bg-indigo-50" },
  measurement: { labelKey: "logs.types.measurement", icon: RulerIcon, color: "text-sky-700", bg: "bg-sky-soft/40" },
  medicine: { labelKey: "logs.types.medicine", icon: PillIcon, color: "text-rose-600", bg: "bg-rose-50" },
  other: { labelKey: "logs.types.other", icon: SparkleIcon, color: "text-emerald-700", bg: "bg-mint-soft/40" },
};

export function logTypeMeta(type: LogType) {
  return LOG_TYPE_META[type] ?? LOG_TYPE_META.other;
}

/** Translated label for a log type. */
export function logTypeLabel(type: LogType): string {
  return i18n.t(logTypeMeta(type).labelKey);
}

function subtypeLabel(subtype?: string): string | undefined {
  if (!subtype) return undefined;
  return i18n.t(`logs.subtypes.${subtype}`, { defaultValue: capitalize(subtype) });
}

function measureTypeLabel(mtype?: string): string | undefined {
  if (!mtype) return undefined;
  return i18n.t(`logs.measureTypes.${mtype}`, { defaultValue: capitalize(mtype) });
}

/** Human-readable summary of a log's free-form data payload. */
export function describeLog(log: ActivityLog): string {
  const d = log.data ?? {};
  switch (log.type) {
    case "feeding": {
      const parts: string[] = [];
      const sub = subtypeLabel(d.subtype as string | undefined);
      if (sub) parts.push(sub);
      if (typeof d.amount_ml === "number" && d.amount_ml > 0)
        parts.push(`${d.amount_ml} ${i18n.t("units.ml")}`);
      if (typeof d.duration_min === "number" && d.duration_min > 0)
        parts.push(`${d.duration_min} ${i18n.t("units.min")}`);
      const side = d.side as string | undefined;
      if (side) parts.push(sideLabel(side));
      return parts.join(" · ") || i18n.t("logs.describe.feeding");
    }
    case "diaper": {
      const contents = d.contents as string | undefined;
      const parts: string[] = [];
      if (contents) parts.push(contentLabel(contents));
      if (typeof d.consistency === "number")
        parts.push(i18n.t("logs.add.diaper.bristol", { n: d.consistency }));
      const color = d.color as string | undefined;
      if (color) parts.push(color);
      return parts.join(" · ") || i18n.t("logs.describe.diaperChange");
    }
    case "sleep": {
      const sub = subtypeLabel(d.subtype as string | undefined);
      const mins = sleepMinutes(log);
      const parts: string[] = [];
      if (sub) parts.push(sub);
      parts.push(mins > 0 ? formatMin(mins) : i18n.t("logs.describe.started"));
      return parts.join(" · ");
    }
    case "measurement": {
      const mtype = measureTypeLabel(d.measurement_type as string | undefined);
      const value = d.value as number | undefined;
      const unit = d.unit as string | undefined;
      if (mtype && typeof value === "number")
        return `${mtype}: ${value}${unit ? " " + unit : ""}`;
      return i18n.t("logs.describe.measurement");
    }
    case "medicine": {
      const name = d.name as string | undefined;
      const dose = d.dose as string | undefined;
      return [name, dose].filter(Boolean).join(" · ") || i18n.t("logs.describe.medicine");
    }
    case "other": {
      const category = categoryLabel(d.category as string | undefined);
      return category || log.note || i18n.t("logs.describe.activity");
    }
    default:
      return log.note || i18n.t("logs.describe.activity");
  }
}

function sideLabel(side: string): string {
  if (side === "left") return i18n.t("logs.add.feeding.left");
  if (side === "right") return i18n.t("logs.add.feeding.right");
  if (side === "both") return i18n.t("logs.add.feeding.both");
  return side;
}

function contentLabel(contents: string): string {
  return i18n.t(`logs.contents.${contents}`, { defaultValue: capitalize(contents) });
}

function categoryLabel(category?: string): string | undefined {
  if (!category) return undefined;
  const key = `logs.add.other.${categoryKey(category)}`;
  const translated = i18n.t(key);
  return translated === key ? capitalize(category) : translated;
}

/** Map a category value to its translation key segment. */
function categoryKey(category: string): string {
  const map: Record<string, string> = {
    tummy_time: "tummyTime",
    bath: "bath",
    milestone: "milestone",
    doctor_visit: "doctorVisit",
    play: "play",
    mood: "mood",
  };
  return map[category] ?? category;
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
  if (h === 0) return i18n.t("time.durationMin", { m });
  if (m === 0) return i18n.t("time.durationHour", { h });
  return i18n.t("time.durationHourMin", { h, m });
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
