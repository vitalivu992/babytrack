import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { createLog } from "../api/activities";
import { dailySummary } from "../api/insights";
import { listLogs } from "../api/activities";
import { errorMessage } from "../api/client";
import i18n from "../i18n";
import type { CreateLogInput, LogType } from "../api/types";
import { useActiveChild } from "../hooks/useActiveChild";
import { useToast } from "../components/Toast";
import { Card, StatCard } from "../components/Card";
import { Button } from "../components/Button";
import { describeLog, logTypeMeta, sleepMinutes } from "../lib/logs";
import { fmt, formatDuration, timeAgo } from "../lib/utils";
import {
  BottleIcon,
  DiaperIcon,
  MoonIcon,
  PlusIcon,
} from "../components/icons";

interface Preset {
  key: string;
  labelKey: string;
  emoji: string;
  build: () => CreateLogInput;
}

const PRESETS: Preset[] = [
  {
    key: "fed120",
    labelKey: "dashboard.presets.fed120",
    emoji: "🍼",
    build: () => ({
      type: "feeding" as LogType,
      data: { subtype: "formula", amount_ml: 120 },
    }),
  },
  {
    key: "pooppee",
    labelKey: "dashboard.presets.pooppee",
    emoji: "💩",
    build: () => ({ type: "diaper" as LogType, data: { contents: "both" } }),
  },
  {
    key: "nap1h",
    labelKey: "dashboard.presets.nap1h",
    emoji: "😴",
    build: () => {
      const end = new Date();
      const start = new Date(end.getTime() - 60 * 60000);
      return {
        type: "sleep" as LogType,
        data: {
          subtype: "nap",
          start: start.toISOString(),
          end: end.toISOString(),
          duration_minutes: 60,
        },
      };
    },
  },
];

export default function Dashboard() {
  const { t } = useTranslation();
  const { activeChild } = useActiveChild();
  const toast = useToast();
  const qc = useQueryClient();

  const childId = activeChild?.id ?? "";
  const today = new Date().toISOString().slice(0, 10);

  const { data: summary } = useQuery({
    queryKey: ["daily", childId, today],
    queryFn: () => dailySummary(childId),
    enabled: !!childId,
  });

  const { data: recent } = useQuery({
    queryKey: ["logs", childId, { limit: 6 }],
    queryFn: () => listLogs(childId, { limit: 6 }),
    enabled: !!childId,
  });

  const quickLog = useMutation({
    mutationFn: (input: CreateLogInput) => createLog(childId, input),
    onSuccess: (_d, input) => {
      qc.invalidateQueries({ queryKey: ["logs", childId] });
      qc.invalidateQueries({ queryKey: ["daily", childId] });
      qc.invalidateQueries({ queryKey: ["weekly", childId] });
      toast.success(t("dashboard.toast.logged"), prettyPreset(input));
    },
    onError: (err) => toast.error(t("dashboard.toast.couldNotSave"), errorMessage(err)),
  });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-brand-500 dark:text-brand-400">
            {fmt(new Date(), "EEEE, MMM d")}
          </p>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {greeting()}, {activeChild ? activeChild.name.split(" ")[0] : t("dashboard.greeting.there")} 👋
          </h1>
        </div>
        <Link to="/app/log/new" className="hidden lg:block">
          <Button>
            <PlusIcon className="h-5 w-5" /> {t("dashboard.log")}
          </Button>
        </Link>
      </header>

      {/* Today summary */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {t("dashboard.today")}
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label={t("dashboard.summary.feedings")}
            value={summary?.feeding_count ?? 0}
            sub={summary ? `${Math.round(summary.feeding_ml)} ${i18n.t("units.ml")}` : "—"}
            icon={<BottleIcon className="h-6 w-6" />}
            accent="brand"
          />
          <StatCard
            label={t("dashboard.summary.diapers")}
            value={summary?.diaper_count ?? 0}
            sub={t("dashboard.summary.changes")}
            icon={<DiaperIcon className="h-6 w-6" />}
            accent="pink"
          />
          <StatCard
            label={t("dashboard.summary.sleep")}
            value={summary ? formatDuration(summary.sleep_minutes) : i18n.t("time.duration0")}
            sub={summary ? t("dashboard.summary.sessions", { count: summary.sleep_count }) : "—"}
            icon={<MoonIcon className="h-6 w-6" />}
            accent="sky"
          />
          <Link to="/app/log/new" className="contents">
            <Card className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-brand-200 bg-brand-50/50 text-brand-600 hover:bg-brand-50 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-300 dark:hover:bg-brand-900/40">
              <PlusIcon className="h-6 w-6" />
              <span className="text-sm font-semibold">{t("dashboard.logActivity")}</span>
            </Card>
          </Link>
        </div>
      </section>

      {/* Quick presets */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {t("dashboard.quickLog")}
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              disabled={quickLog.isPending || !childId}
              onClick={() => quickLog.mutate(p.build())}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-white p-4 shadow-card transition hover:shadow-soft active:scale-95 disabled:opacity-50 dark:bg-slate-800 dark:shadow-black/20"
            >
              <span className="text-3xl">{p.emoji}</span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {t(p.labelKey)}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Recent activity */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {t("dashboard.recent")}
          </h2>
          <Link to="/app/logs" className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400">
            {t("common.seeAll")}
          </Link>
        </div>
        {!recent || recent.length === 0 ? (
          <Card className="text-center text-slate-400 dark:text-slate-500">
            <p className="text-sm">{t("dashboard.empty")}</p>
          </Card>
        ) : (
          <ul className="space-y-2">
            {recent.map((log) => {
              const meta = logTypeMeta(log.type);
              const Icon = meta.icon;
              return (
                <li key={log.id}>
                  <Card className="flex items-center gap-3 p-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.bg} ${meta.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {describeLog(log)}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {log.logged_by_name ? `${log.logged_by_name} · ` : ""}
                        {timeAgo(log.timestamp)}
                        {log.type === "sleep" && sleepMinutes(log) > 0
                          ? ` · ${formatDuration(sleepMinutes(log))}`
                          : ""}
                      </p>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return i18n.t("dashboard.greeting.morning");
  if (h < 18) return i18n.t("dashboard.greeting.afternoon");
  return i18n.t("dashboard.greeting.evening");
}

function prettyPreset(input: CreateLogInput): string {
  switch (input.type) {
    case "feeding":
      return i18n.t("dashboard.toast.feedingLogged", {
        subtype: i18n.t(`logs.subtypes.${input.data.subtype ?? "feeding"}`, {
          defaultValue: input.data.subtype ?? "",
        }),
      });
    case "diaper":
      return i18n.t("dashboard.toast.diaperLogged");
    case "sleep":
      return i18n.t("dashboard.toast.sleepLogged");
    default:
      return i18n.t("dashboard.toast.logged");
  }
}
