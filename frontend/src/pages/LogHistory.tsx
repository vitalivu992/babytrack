import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isSameDay } from "date-fns";
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
import { formatDuration } from "../lib/utils";
import { TrashIcon } from "../components/icons";

const TYPE_FILTERS = [
  { value: "", label: "All activities" },
  { value: "feeding", label: "Feeding" },
  { value: "diaper", label: "Diaper" },
  { value: "sleep", label: "Sleep" },
  { value: "measurement", label: "Measurement" },
  { value: "medicine", label: "Medicine" },
  { value: "other", label: "Other" },
];

export default function LogHistory() {
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
      toast.success("Log deleted");
      setToDelete(null);
    },
    onError: (err) => toast.error("Couldn't delete", errorMessage(err)),
  });

  // Group logs by day for the timeline.
  const grouped = useMemo(() => groupByDay(logs), [logs]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Activity history</h1>
        <p className="text-sm text-slate-500">All logs for {activeChild?.name ?? "your child"}.</p>
      </header>

      <Card className="grid grid-cols-2 gap-3">
        <Select
          label="Filter by type"
          value={type}
          onValueChange={setType}
          options={TYPE_FILTERS}
        />
        <Select
          label="Time range"
          value={days}
          onValueChange={setDays}
          options={[
            { value: "1", label: "Today" },
            { value: "7", label: "Last 7 days" },
            { value: "30", label: "Last 30 days" },
            { value: "90", label: "Last 90 days" },
          ]}
        />
      </Card>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
      ) : logs.length === 0 ? (
        <Card className="py-10 text-center text-slate-400">
          <p className="text-sm">No logs match these filters.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ label, items }) => (
            <section key={label}>
              <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
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
        title="Delete log?"
        description={toDelete ? describeLog(toDelete) : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={remove.isPending}
              onClick={() => toDelete && remove.mutate(toDelete.id)}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">This can't be undone.</p>
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
          <p className="truncate text-sm font-semibold text-slate-700">{describeLog(log)}</p>
          <p className="text-xs text-slate-400">
            {format(new Date(log.timestamp), "p")}
            {sleep > 0 ? ` · ${formatDuration(sleep)}` : ""}
            {log.logged_by_name ? ` · ${log.logged_by_name}` : ""}
          </p>
          {log.note && <p className="mt-1 truncate text-xs italic text-slate-500">“{log.note}”</p>}
        </div>
        {canEdit && (
          <button
            onClick={onDelete}
            aria-label="Delete log"
            className="rounded-lg p-2 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
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
    const key = format(d, "yyyy-MM-dd");
    const arr = buckets.get(key) ?? [];
    arr.push(log);
    buckets.set(key, arr);
  }
  return [...buckets.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, items]) => {
      const d = new Date(key);
      const label = isSameDay(d, today)
        ? "Today"
        : isSameDay(d, yesterday)
        ? "Yesterday"
        : format(d, "EEE, MMM d");
      return {
        label,
        items: items.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)),
      };
    });
}
