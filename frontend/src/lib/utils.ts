import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { enUS, vi as viLocale } from "date-fns/locale";
import i18n from "../i18n";

/** Merge Tailwind classes with conditional logic, resolving conflicts. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Resolve the active date-fns locale from the current i18n language. */
function dateLocale() {
  return i18n.language?.startsWith("vi") ? viLocale : enUS;
}

/** Format a date with the current language's locale. */
export function fmt(
  date: Date | string | number,
  pattern: string,
): string {
  return format(new Date(date), pattern, { locale: dateLocale() });
}

/** Format minutes as "Xh Ym" / "Ym". */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes < 0) return i18n.t("time.duration0");
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return i18n.t("time.durationMin", { m });
  if (m === 0) return i18n.t("time.durationHour", { h });
  return i18n.t("time.durationHourMin", { h, m });
}

/** Relative "time ago" label. */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return i18n.t("time.justNow");
  if (mins < 60) return i18n.t("time.minAgo", { m: mins });
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return i18n.t("time.hourAgo", { h: hrs });
  const days = Math.round(hrs / 24);
  if (days < 7) return i18n.t("time.dayAgo", { d: days });
  return fmt(iso, "PP");
}

/** Compute a child's age as a short human label. */
export function ageLabel(birthDate?: string): string {
  if (!birthDate) return "—";
  const birth = new Date(birthDate);
  const now = new Date();
  const months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth());
  if (months < 0) return "—";
  if (months < 1)
    return i18n.t("time.ageDays", {
      n: Math.max(0, Math.round((now.getTime() - birth.getTime()) / 86400000)),
    });
  if (months < 12) return i18n.t("time.ageMonths", { n: months });
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem
    ? i18n.t("time.ageYearsMonths", { y: years, m: rem })
    : i18n.t("time.ageYears", { y: years });
}

/** Initials from a name. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
