import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { feedingStats, sleepStats, weeklySummary } from "../api/insights";
import { useActiveChild } from "../hooks/useActiveChild";
import { Card, StatCard } from "../components/Card";
import { Tabs, TabContent } from "../components/Tabs";
import { Select } from "../components/Select";
import { fmt, formatDuration } from "../lib/utils";
import { BottleIcon, MoonIcon } from "../components/icons";

export default function Insights() {
  const { t } = useTranslation();
  const { activeChild } = useActiveChild();
  const childId = activeChild?.id ?? "";
  const [range, setRange] = useState("7");

  const from = useMemo(() => {
    const end = new Date();
    return new Date(end.getTime() - Number(range) * 86400000);
  }, [range]);
  const to = new Date();

  const { data: weekly } = useQuery({
    queryKey: ["weekly", childId],
    queryFn: () => weeklySummary(childId),
    enabled: !!childId,
  });

  const { data: feeding } = useQuery({
    queryKey: ["feeding-stats", childId, range],
    queryFn: () => feedingStats(childId, from, to),
    enabled: !!childId,
  });

  const { data: sleep } = useQuery({
    queryKey: ["sleep-stats", childId, range],
    queryFn: () => sleepStats(childId, from, to),
    enabled: !!childId,
  });

  const chartData = useMemo(
    () =>
      (weekly?.days ?? []).map((d) => ({
        label: fmt(d.date, "EEE"),
        feedings: d.feeding_count,
        diapers: d.diaper_count,
        sleepHours: Math.round((d.sleep_minutes / 60) * 10) / 10,
      })),
    [weekly],
  );

  const tooltipStyle = {
    borderRadius: 12,
    border: "1px solid #ede9fe",
    fontSize: 12,
    background: "rgb(30 41 59)",
    color: "#e2e8f0",
  } as const;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          {t("insights.title")}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("insights.subtitle", { name: activeChild?.name ?? "" })}
        </p>
      </header>

      <Card className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
            {t("insights.thisWeek")}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-700 dark:text-slate-200">
            <span>
              <strong>{weekly?.feeding_count ?? 0}</strong> {t("insights.feedings")}
            </span>
            <span>
              <strong>{weekly?.diaper_count ?? 0}</strong> {t("insights.diapers")}
            </span>
            <span>
              <strong>{formatDuration(weekly?.sleep_minutes ?? 0)}</strong> {t("insights.sleep")}
            </span>
          </div>
        </div>
        <Select
          value={range}
          onValueChange={setRange}
          options={[
            { value: "7", label: t("insights.ranges.7") },
            { value: "14", label: t("insights.ranges.14") },
            { value: "30", label: t("insights.ranges.30") },
          ]}
        />
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label={t("insights.avgFeedings")}
          value={feeding ? feeding.avg_per_day.toFixed(1) : "—"}
          sub={feeding ? t("insights.mlTotal", { n: Math.round(feeding.total_ml) }) : undefined}
          icon={<BottleIcon className="h-6 w-6" />}
          accent="brand"
        />
        <StatCard
          label={t("insights.avgSleep")}
          value={sleep ? formatDuration(Math.round(sleep.avg_minutes_per_day)) : "—"}
          sub={sleep ? t("insights.sessions", { count: sleep.total_count }) : undefined}
          icon={<MoonIcon className="h-6 w-6" />}
          accent="sky"
        />
      </div>

      <Tabs
        defaultValue="weekly"
        items={[
          { value: "weekly", label: t("insights.tabs.weekly") },
          { value: "feeding", label: t("insights.tabs.feeding") },
          { value: "sleep", label: t("insights.tabs.sleep") },
        ]}
      >
        <TabContent value="weekly">
          <div className="space-y-4">
            <Card title={t("insights.feedingsDiapers")}>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 4, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2ff" className="dark:opacity-20" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} stroke="#cbd5e1" />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} stroke="#cbd5e1" width={32} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="feedings" fill="#8b5cf6" radius={[6, 6, 0, 0]} name={t("insights.series.feedings")} />
                    <Bar dataKey="diapers" fill="#f9a8d4" radius={[6, 6, 0, 0]} name={t("insights.series.diapers")} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title={t("insights.sleepHours")}>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 4, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2ff" className="dark:opacity-20" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} stroke="#cbd5e1" />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} stroke="#cbd5e1" width={32} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line
                      type="monotone"
                      dataKey="sleepHours"
                      stroke="#38bdf8"
                      strokeWidth={3}
                      dot={{ r: 3, fill: "#38bdf8" }}
                      name={t("insights.series.hours")}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </TabContent>
        <TabContent value="feeding">
          <Card title={t("insights.feedingBreakdown")}>
            {feeding && Object.keys(feeding.by_subtype).length > 0 ? (
              <ul className="space-y-2">
                {Object.entries(feeding.by_subtype).map(([sub, count]) => (
                  <li key={sub} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-slate-600 dark:text-slate-300">{sub}</span>
                    <span className="font-semibold text-brand-600 dark:text-brand-300">{count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                {t("insights.noFeedingData")}
              </p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm dark:border-slate-700">
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500">{t("insights.total")}</p>
                <p className="font-bold text-slate-800 dark:text-slate-100">
                  {feeding?.total_count ?? 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {t("insights.totalVolume")}
                </p>
                <p className="font-bold text-slate-800 dark:text-slate-100">
                  {Math.round(feeding?.total_ml ?? 0)} ml
                </p>
              </div>
            </div>
          </Card>
        </TabContent>
        <TabContent value="sleep">
          <Card title={t("insights.sleepSummary")}>
            <ul className="space-y-2 text-sm">
              {(sleep &&
                Object.entries(sleep.by_subtype).map(([sub, count]) => (
                  <li key={sub} className="flex items-center justify-between">
                    <span className="capitalize text-slate-600 dark:text-slate-300">{sub}</span>
                    <span className="font-semibold text-sky-600 dark:text-sky-300">{count}</span>
                  </li>
                ))) || <span />}
            </ul>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm dark:border-slate-700">
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {t("insights.totalSleep")}
                </p>
                <p className="font-bold text-slate-800 dark:text-slate-100">
                  {formatDuration(sleep?.total_minutes ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500">{t("insights.avgPerDay")}</p>
                <p className="font-bold text-slate-800 dark:text-slate-100">
                  {formatDuration(Math.round(sleep?.avg_minutes_per_day ?? 0))}
                </p>
              </div>
            </div>
          </Card>
        </TabContent>
      </Tabs>
    </div>
  );
}
