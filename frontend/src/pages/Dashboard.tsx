import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { createLog } from "../api/activities";
import { dailySummary } from "../api/insights";
import { listLogs } from "../api/activities";
import { errorMessage } from "../api/client";
import type { CreateLogInput, LogType } from "../api/types";
import { useActiveChild } from "../hooks/useActiveChild";
import { useToast } from "../components/Toast";
import { Card, StatCard } from "../components/Card";
import { Button } from "../components/Button";
import { describeLog, logTypeMeta, sleepMinutes } from "../lib/logs";
import { formatDuration, timeAgo } from "../lib/utils";
import {
  BottleIcon,
  DiaperIcon,
  MoonIcon,
  PlusIcon,
} from "../components/icons";

interface Preset {
  key: string;
  label: string;
  emoji: string;
  build: () => CreateLogInput;
}

const PRESETS: Preset[] = [
  {
    key: "fed120",
    label: "Fed 120ml",
    emoji: "🍼",
    build: () => ({
      type: "feeding" as LogType,
      data: { subtype: "formula", amount_ml: 120 },
    }),
  },
  {
    key: "pooppee",
    label: "Poop + Pee",
    emoji: "💩",
    build: () => ({ type: "diaper" as LogType, data: { contents: "both" } }),
  },
  {
    key: "nap1h",
    label: "Quick nap (1h)",
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
      toast.success("Logged!", prettyPreset(input));
    },
    onError: (err) => toast.error("Couldn't save", errorMessage(err)),
  });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-brand-500">{format(new Date(), "EEEE, MMM d")}</p>
          <h1 className="text-2xl font-bold text-slate-800">
            {greeting()}, {activeChild ? activeChild.name.split(" ")[0] : "there"} 👋
          </h1>
        </div>
        <Link to="/app/log/new" className="hidden lg:block">
          <Button>
            <PlusIcon className="h-5 w-5" /> Log
          </Button>
        </Link>
      </header>

      {/* Today summary */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Today</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Feedings"
            value={summary?.feeding_count ?? 0}
            sub={summary ? `${Math.round(summary.feeding_ml)} ml` : "—"}
            icon={<BottleIcon className="h-6 w-6" />}
            accent="brand"
          />
          <StatCard
            label="Diapers"
            value={summary?.diaper_count ?? 0}
            sub="changes"
            icon={<DiaperIcon className="h-6 w-6" />}
            accent="pink"
          />
          <StatCard
            label="Sleep"
            value={summary ? formatDuration(summary.sleep_minutes) : "0m"}
            sub={summary ? `${summary.sleep_count} session(s)` : "—"}
            icon={<MoonIcon className="h-6 w-6" />}
            accent="sky"
          />
          <Link to="/app/log/new" className="contents">
            <Card className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-brand-200 bg-brand-50/50 text-brand-600 hover:bg-brand-50">
              <PlusIcon className="h-6 w-6" />
              <span className="text-sm font-semibold">Log activity</span>
            </Card>
          </Link>
        </div>
      </section>

      {/* Quick presets */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Quick log
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              disabled={quickLog.isPending || !childId}
              onClick={() => quickLog.mutate(p.build())}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-white p-4 shadow-card transition hover:shadow-soft active:scale-95 disabled:opacity-50"
            >
              <span className="text-3xl">{p.emoji}</span>
              <span className="text-xs font-semibold text-slate-600">{p.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Recent activity */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Recent</h2>
          <Link to="/app/logs" className="text-sm font-semibold text-brand-600 hover:underline">
            See all
          </Link>
        </div>
        {!recent || recent.length === 0 ? (
          <Card className="text-center text-slate-400">
            <p className="text-sm">No activity yet. Tap a quick log above to get started! 🌟</p>
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
                      <p className="truncate text-sm font-semibold text-slate-700">
                        {describeLog(log)}
                      </p>
                      <p className="text-xs text-slate-400">
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
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function prettyPreset(input: CreateLogInput): string {
  switch (input.type) {
    case "feeding":
      return `${input.data.subtype} logged`;
    case "diaper":
      return "Diaper change logged";
    case "sleep":
      return "Sleep logged";
    default:
      return "Logged";
  }
}
