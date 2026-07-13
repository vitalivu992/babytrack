import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { differenceInCalendarDays } from "date-fns";
import { useTranslation } from "react-i18next";
import {
  ensureSchedule,
  listVaccinations,
  markAdministered,
} from "../api/vaccinations";
import { errorMessage } from "../api/client";
import type { Vaccination } from "../api/types";
import { useActiveChild } from "../hooks/useActiveChild";
import { useToast } from "./Toast";
import { Card } from "./Card";
import { Button } from "./Button";
import { Input } from "./Input";
import { Modal } from "./Modal";
import { CheckIcon, SyringeIcon } from "./icons";
import { fmt } from "../lib/utils";

export function VaccinationSchedule({ canEdit }: { canEdit: boolean }) {
  const { t } = useTranslation();
  const { activeChild } = useActiveChild();
  const childId = activeChild?.id ?? "";
  const toast = useToast();
  const qc = useQueryClient();
  const [recording, setRecording] = useState<Vaccination | null>(null);
  const [adminDate, setAdminDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [lot, setLot] = useState("");

  const { data: vaccines = [], isLoading } = useQuery({
    queryKey: ["vaccinations", childId],
    queryFn: async () => {
      try {
        return await ensureSchedule(childId);
      } catch (err) {
        // ensure may 403 for viewers without birthdate; fall back to list.
        toast.error(t("vaccination.couldNotGenerate"), errorMessage(err));
        return listVaccinations(childId);
      }
    },
    enabled: !!childId,
  });

  const sorted = useMemo(
    () => [...vaccines].sort((a, b) => (a.scheduled_date < b.scheduled_date ? -1 : 1)),
    [vaccines],
  );

  const mark = useMutation({
    mutationFn: ({ id, date, lot }: { id: string; date: string; lot: string }) =>
      markAdministered(childId, id, { administered_date: date, lot_number: lot || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vaccinations", childId] });
      toast.success(t("vaccination.recordedToast"));
      closeRecord();
    },
    onError: (err) => toast.error(t("vaccination.couldNotRecord"), errorMessage(err)),
  });

  function closeRecord() {
    setRecording(null);
    setLot("");
    setAdminDate(new Date().toISOString().slice(0, 10));
  }

  if (isLoading)
    return (
      <Card className="text-sm text-slate-400 dark:text-slate-500">
        {t("vaccination.loading")}
      </Card>
    );

  if (vaccines.length === 0) {
    return (
      <Card className="text-center text-slate-400 dark:text-slate-500">
        <SyringeIcon className="mx-auto mb-2 h-8 w-8 text-brand-300" />
        <p className="text-sm">
          {t("vaccination.empty")}
          <br />
          {activeChild?.birth_date
            ? t("vaccination.tapBelow")
            : t("vaccination.addDob")}
        </p>
      </Card>
    );
  }

  const given = sorted.filter((v) => v.administered_date).length;

  return (
    <div className="space-y-3">
      <Card className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t("vaccination.progress")}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {t("vaccination.doses", { given, total: sorted.length })}
          </p>
        </div>
        <div className="h-2 w-28 overflow-hidden rounded-full bg-brand-100 dark:bg-slate-700">
          <div
            className="h-full bg-brand-500 transition-all"
            style={{ width: `${sorted.length ? (given / sorted.length) * 100 : 0}%` }}
          />
        </div>
      </Card>

      <ul className="space-y-2">
        {sorted.map((v) => (
          <VaccineRow key={v.id} vaccine={v} canEdit={canEdit} onMark={() => setRecording(v)} />
        ))}
      </ul>

      <Modal
        open={!!recording}
        onOpenChange={(o) => !o && closeRecord()}
        title={t("vaccination.record")}
        description={recording?.vaccine_name}
        footer={
          <>
            <Button variant="ghost" onClick={closeRecord}>
              {t("common.cancel")}
            </Button>
            <Button
              loading={mark.isPending}
              onClick={() =>
                recording && mark.mutate({ id: recording.id, date: adminDate, lot })
              }
            >
              {t("common.save")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t("vaccination.scheduledFor", {
              date: recording ? fmt(recording.scheduled_date, "MMM d, yyyy") : "",
            })}
          </p>
          <Input
            label={t("vaccination.dateGiven")}
            type="date"
            value={adminDate}
            onChange={(e) => setAdminDate(e.target.value)}
          />
          <Input
            label={t("vaccination.lot")}
            value={lot}
            onChange={(e) => setLot(e.target.value)}
            placeholder={t("vaccination.lotPlaceholder")}
          />
        </div>
      </Modal>
    </div>
  );
}

function VaccineRow({
  vaccine,
  canEdit,
  onMark,
}: {
  vaccine: Vaccination;
  canEdit: boolean;
  onMark: () => void;
}) {
  const { t } = useTranslation();
  const given = !!vaccine.administered_date;
  const today = new Date();
  const daysUntil = differenceInCalendarDays(new Date(vaccine.scheduled_date), today);
  const overdue = !given && daysUntil < 0;
  const dueSoon = !given && daysUntil >= 0 && daysUntil <= 14;

  const statusSuffix = overdue
    ? ` · ${t("vaccination.overdue")}`
    : dueSoon
    ? ` · ${t("vaccination.dueSoon")}`
    : "";

  return (
    <li>
      <Card className="flex items-center gap-3 p-3.5">
        <div
          className={
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full " +
            (given
              ? "bg-mint-soft/60 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300"
              : overdue
              ? "bg-rose-50 text-rose-500 dark:bg-rose-500/20 dark:text-rose-300"
              : "bg-brand-50 text-brand-400 dark:bg-brand-900/40 dark:text-brand-300")
          }
        >
          {given ? <CheckIcon className="h-5 w-5" /> : <SyringeIcon className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={
              "text-sm font-semibold " +
              (given
                ? "text-slate-400 line-through dark:text-slate-500"
                : "text-slate-700 dark:text-slate-200")
            }
          >
            {vaccine.vaccine_name}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {given && vaccine.administered_date
              ? t("vaccination.given", {
                  date: fmt(vaccine.administered_date, "MMM d, yyyy"),
                })
              : t("vaccination.due", {
                  date: fmt(vaccine.scheduled_date, "MMM d, yyyy"),
                }) + statusSuffix}
          </p>
        </div>
        {!given && canEdit && (
          <Button size="sm" variant="secondary" onClick={onMark}>
            {t("vaccination.markGiven")}
          </Button>
        )}
      </Card>
    </li>
  );
}
