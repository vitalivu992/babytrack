import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { differenceInCalendarDays, format } from "date-fns";
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
import { useState } from "react";

export function VaccinationSchedule({ canEdit }: { canEdit: boolean }) {
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
        toast.error("Couldn't generate schedule", errorMessage(err));
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
      toast.success("Vaccine recorded!");
      closeRecord();
    },
    onError: (err) => toast.error("Couldn't record", errorMessage(err)),
  });

  function closeRecord() {
    setRecording(null);
    setLot("");
    setAdminDate(new Date().toISOString().slice(0, 10));
  }

  if (isLoading) return <Card className="text-sm text-slate-400">Loading schedule…</Card>;

  if (vaccines.length === 0) {
    return (
      <Card className="text-center text-slate-400">
        <SyringeIcon className="mx-auto mb-2 h-8 w-8 text-brand-300" />
        <p className="text-sm">
          No vaccination schedule yet.
          <br />
          {activeChild?.birth_date
            ? "Tap below to generate the WHO schedule."
            : "Add a date of birth to generate the schedule."}
        </p>
      </Card>
    );
  }

  const given = sorted.filter((v) => v.administered_date).length;

  return (
    <div className="space-y-3">
      <Card className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-700">Immunization progress</p>
          <p className="text-xs text-slate-400">
            {given} of {sorted.length} doses recorded
          </p>
        </div>
        <div className="h-2 w-28 overflow-hidden rounded-full bg-brand-100">
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
        title="Record vaccine"
        description={recording?.vaccine_name}
        footer={
          <>
            <Button variant="ghost" onClick={closeRecord}>
              Cancel
            </Button>
            <Button
              loading={mark.isPending}
              onClick={() =>
                recording && mark.mutate({ id: recording.id, date: adminDate, lot })
              }
            >
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Scheduled for{" "}
            {recording && format(new Date(recording.scheduled_date), "MMM d, yyyy")}.
          </p>
          <Input
            label="Date given"
            type="date"
            value={adminDate}
            onChange={(e) => setAdminDate(e.target.value)}
          />
          <Input
            label="Lot number (optional)"
            value={lot}
            onChange={(e) => setLot(e.target.value)}
            placeholder="e.g. AB1234"
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
  const given = !!vaccine.administered_date;
  const today = new Date();
  const daysUntil = differenceInCalendarDays(new Date(vaccine.scheduled_date), today);
  const overdue = !given && daysUntil < 0;
  const dueSoon = !given && daysUntil >= 0 && daysUntil <= 14;

  return (
    <li>
      <Card className="flex items-center gap-3 p-3.5">
        <div
          className={
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full " +
            (given
              ? "bg-mint-soft/60 text-emerald-600"
              : overdue
              ? "bg-rose-50 text-rose-500"
              : "bg-brand-50 text-brand-400")
          }
        >
          {given ? <CheckIcon className="h-5 w-5" /> : <SyringeIcon className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className={"text-sm font-semibold " + (given ? "text-slate-400 line-through" : "text-slate-700")}>
            {vaccine.vaccine_name}
          </p>
          <p className="text-xs text-slate-400">
            {given && vaccine.administered_date
              ? `Given ${format(new Date(vaccine.administered_date), "MMM d, yyyy")}`
              : `Due ${format(new Date(vaccine.scheduled_date), "MMM d, yyyy")}${
                  overdue ? " · overdue" : dueSoon ? " · due soon" : ""
                }`}
          </p>
        </div>
        {!given && canEdit && (
          <Button size="sm" variant="secondary" onClick={onMark}>
            Mark given
          </Button>
        )}
      </Card>
    </li>
  );
}
