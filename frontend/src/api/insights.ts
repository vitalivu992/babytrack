import { api } from "./client";
import type {
  DailySummary,
  FeedingStats,
  GrowthSeries,
  SleepStats,
  WeeklySummary,
} from "./types";

const DAY = "YYYY-MM-DD";

function dayStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** GET /api/children/:id/insights/daily?date=YYYY-MM-DD */
export async function dailySummary(childId: string, date: Date = new Date()): Promise<DailySummary> {
  const res = await api.get<DailySummary>(`/children/${childId}/insights/daily`, {
    params: { date: dayStr(date) },
  });
  return res.data;
}

/** GET /api/children/:id/insights/weekly?date=YYYY-MM-DD */
export async function weeklySummary(
  childId: string,
  endDay: Date = new Date(),
): Promise<WeeklySummary> {
  const res = await api.get<WeeklySummary>(`/children/${childId}/insights/weekly`, {
    params: { date: dayStr(endDay) },
  });
  return res.data;
}

/** GET /api/children/:id/insights/feeding?from=&to= */
export async function feedingStats(
  childId: string,
  from: Date,
  to: Date,
): Promise<FeedingStats> {
  const res = await api.get<FeedingStats>(`/children/${childId}/insights/feeding`, {
    params: { from: dayStr(from), to: dayStr(to) },
  });
  return res.data;
}

/** GET /api/children/:id/insights/sleep?from=&to= */
export async function sleepStats(childId: string, from: Date, to: Date): Promise<SleepStats> {
  const res = await api.get<SleepStats>(`/children/${childId}/insights/sleep`, {
    params: { from: dayStr(from), to: dayStr(to) },
  });
  return res.data;
}

/** GET /api/children/:id/insights/growth */
export async function growthSeries(childId: string): Promise<GrowthSeries[]> {
  const res = await api.get<GrowthSeries[]>(`/children/${childId}/insights/growth`);
  return res.data ?? [];
}

// Re-export so callers can construct date strings without importing date-fns.
export { dayStr, DAY };
