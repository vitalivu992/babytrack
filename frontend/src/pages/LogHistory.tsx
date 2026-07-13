import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isSameDay } from "date-fns";
import { useTranslation } from "react-i18next";
import { deleteLog, listLogs } from "../api/activities";
import { errorMessage } from "../api/client";
import type { ActivityLog, LogType } from "../api/types";
import { useActiveChild } from "../hooks/useActiveChild";
import { useToast } from "../components/Toast";
import { Card } from "../components/Card";
import { Select } from "../components/Select";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { describeLog, logTypeMeta, sleepMinutes } from "../lib/logs";
import { fmt, formatDuration } from "../lib/utils";
import { TrashIcon } from "../components/icons";
import i18n from "../i18n";

export default function LogHistory() {
  const { t } = useTranslation();
  const { activeChild, canEdit } = useActiveChild();
  const toast = useToast();
  const qc = useQueryClient();
  const childId = activeChild?.id ?? "";

  const [type, setType] = useState("");
  const [days, setDays] = useState("7");
  const [toDelete, setToDelete] = useState<ActivityLog | null>(null);

  const { from, to } = useMemo(() => {
    const end = new Date();
    const start = new Date(end.getTime() - Number(days) * 86400000);
    return { from: start.toISOString(), to: end.toISOString() };
  }, [days]);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["logs", childId, { type, from, to, limit: 200 }],
    queryFn: () =>
      listLogs(childId, {
        type: (type || undefined) as LogType | undefined,
        from,
        to,
        limit: 200,
      }),
    enabled: !!childId,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteLog(childId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["logs", childId] });
      qc.invalidateQueries({ queryKey: ["daily", childId] });
      toast.success(t("logs.history.deletedToast"));
      setToDelete(null);
    },
    onError: (err) => toast.error(t("logs.history.couldNotDelete"), errorMessage(err)),
  });

  // Group logs by day for the timeline.
  const grouped = useMemo(() => groupByDay(logs), [logs]);

  const typeFilters = [
    { value: "", label: t("logs.history.allActivities") },
    { value: "feeding", label: t("logs.types.feeding") },
    { value: "diaper", label: t("logs.types.diaper") },
    { value: "sleep", label: t("logs.types.sleep") },
    { value: "measurement", label: t("logs.types.measurement") },
    { value: "medicine", label: t("logs.types.medicine") },
    { value: "other", label: t("logs.types.other") },
  ];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          {t("logs.history.title")}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("logs.history.subtitle", { name: activeChild?.name ?? "" })}
        </p>
      </header>

      <Card className="grid grid-cols-2 gap-3">
        <Select
          label={t("logs.history.filterByType")}
          value={type}
          onValueChange={setType}
          options={typeFilters}
        />
        <Select
          label={t("logs.history.timeRange")}
          value={days}
          onValueChange={setDays}
          options={[
            { value: "1", label: t("common.today") },
            { value: "7", label: t("logs.history.last7") },
            { value: "30", label: t("logs.history.last30") },
            { value: "90", label: t("logs.history.last90") },
          ]}
        />
      </Card>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
          {t("common.loading")}
        </p>
      ) : logs.length === 0 ? (
        <Card className="py-10 text-center text-slate-400 dark:text-slate-500">
          <p className="text-sm">{t("logs.history.noMatch")}</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ label, items }) => (
            <section key={label}>
              <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {label}
              </h2>
              <ul className="space-y-2">
                {items.map((log) => (
                  <LogRow
                    key={log.id}
                    log={log}
                    canEdit={canEdit}
                    onDelete={() => setToDelete(log)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Modal
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={t("logs.history.deleteTitle")}
        description={toDelete ? describeLog(toDelete) : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setToDelete(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              loading={remove.isPending}
              onClick={() => toDelete && remove.mutate(toDelete.id)}
            >
              {t("common.delete")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">{t("logs.history.cannotUndo")}</p>
      </Modal>
    </div>
  );
}

function LogRow({
  log,
  canEdit,
  onDelete,
}: {
  log: ActivityLog;
  canEdit: boolean;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const meta = logTypeMeta(log.type);
  const Icon = meta.icon;
  const sleep = log.type === "sleep" ? sleepMinutes(log) : 0;
  return (
    <li>
      <Card className="flex items-center gap-3 p-3.5">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.bg} ${meta.color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
            {describeLog(log)}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {fmt(log.timestamp, "p")}
            {sleep > 0 ? ` · ${formatDuration(sleep)}` : ""}
            {log.logged_by_name ? ` · ${log.logged_by_name}` : ""}
          </p>
          {log.note && (
            <p className="mt-1 truncate text-xs italic text-slate-500 dark:text-slate-400">
              “{log.note}”
            </p>
          )}
        </div>
        {canEdit && (
          <button
            onClick={onDelete}
            aria-label={t("common.delete")}
            className="rounded-lg p-2 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500 dark:text-slate-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        )}
      </Card>
    </li>
  );
}

function groupByDay(logs: ActivityLog[]): { label: string; items: ActivityLog[] }[] {
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);
  const buckets = new Map<string, ActivityLog[]>();
  for (const log of logs) {
    const d = new Date(log.timestamp);
    const key = fmt(d, "yyyy-MM-dd");
    const arr = buckets.get(key) ?? [];
    arr.push(log);
    buckets.set(key, arr);
  }
  return [...buckets.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, items]) => {
      const d = new Date(key);
      const label = isSameDay(d, today)
        ? i18n.t("common.today")
        : isSameDay(d, yesterday)
        ? i18n.t("common.yesterday")
        : fmt(d, "EEE, MMM d");
      return {
        label,
        items: items.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)),
      };
    });
}
