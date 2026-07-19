import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { createLog } from "../api/activities";
import { createMeasurement } from "../api/measurements";
import type { CreateLogInput, LogData, LogType, MeasurementInput } from "../api/types";
import { errorMessage } from "../api/client";
import { useToast } from "../components/Toast";
import { Tabs, TabContent } from "../components/Tabs";
import { Button } from "../components/Button";
import { Input, Textarea } from "../components/Input";
import { Select } from "../components/Select";
import { Modal } from "../components/Modal";
import {
  BottleIcon,
  DiaperIcon,
  MoonIcon,
  PillIcon,
  RulerIcon,
  SparkleIcon,
} from "../components/icons";
import { useActiveChild } from "../hooks/useActiveChild";

export type TabKey = "feeding" | "diaper" | "sleep" | "measurement" | "medicine" | "other";

function useTabsConfig() {
  const { t } = useTranslation();
  return [
    { value: "feeding" as TabKey, label: t("logs.add.tabs.feed"), icon: <BottleIcon className="h-4 w-4" /> },
    { value: "diaper" as TabKey, label: t("logs.add.tabs.diaper"), icon: <DiaperIcon className="h-4 w-4" /> },
    { value: "sleep" as TabKey, label: t("logs.add.tabs.sleep"), icon: <MoonIcon className="h-4 w-4" /> },
    { value: "measurement" as TabKey, label: t("logs.add.tabs.measure"), icon: <RulerIcon className="h-4 w-4" /> },
    { value: "medicine" as TabKey, label: t("logs.add.tabs.medicine"), icon: <PillIcon className="h-4 w-4" /> },
    { value: "other" as TabKey, label: t("logs.add.tabs.other"), icon: <SparkleIcon className="h-4 w-4" /> },
  ];
}

export const nowLocalInput = (d = new Date()) => {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
};

export default function AddLog() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const initialTab = (params.get("tab") as TabKey) || "feeding";
  const [tab, setTab] = useState<TabKey>(initialTab);
  const { activeChild } = useActiveChild();
  const toast = useToast();
  const qc = useQueryClient();

  // Close handler returns to the page that opened the modal.
  const close = () => navigate(-1);

  const buildInput = useBuildLog(tab);
  const TABS = useTabsConfig();

  const mutation = useMutation({
    mutationFn: async (input: CreateLogInput) => {
      if (!activeChild) throw { message: "No child selected" };
      return createLog(activeChild.id, input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["logs"] });
      qc.invalidateQueries({ queryKey: ["daily"] });
      qc.invalidateQueries({ queryKey: ["weekly"] });
      qc.invalidateQueries({ queryKey: ["feeding-stats"] });
      qc.invalidateQueries({ queryKey: ["sleep-stats"] });
      toast.success(t("dashboard.toast.logged"));
      close();
    },
    onError: (err) => toast.error(t("dashboard.toast.couldNotSave"), errorMessage(err)),
  });

  // Measurement tab: persist to /children/:id/measurements (the same table the growth chart reads from) instead of activity_logs.
  // Use a separate mutation so handler logic stays isolated while keeping the same UX (pending/toast/close).
  const measurementMutation = useMutation({
    mutationFn: async (input: MeasurementInput) => {
      if (!activeChild) throw { message: "No child selected" };
      return createMeasurement(activeChild.id, input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["logs"] });
      qc.invalidateQueries({ queryKey: ["daily"] });
      qc.invalidateQueries({ queryKey: ["weekly"] });
      qc.invalidateQueries({ queryKey: ["growth", activeChild?.id] });
      toast.success(t("dashboard.toast.logged"));
      close();
    },
    onError: (err) => toast.error(t("dashboard.toast.couldNotSave"), errorMessage(err)),
  });

  // Keep the URL param in sync with the active tab for shareable state.
  useEffect(() => {
    const next = new URLSearchParams(params);
    next.set("tab", tab);
    setParams(next, { replace: true });
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const { note, setNote, data, setData, payload, ready, reset } = buildInput;
  const [stamp, setStamp] = useState(nowLocalInput());

  function handleSubmit() {
    if (!ready) return;
    if (tab === "measurement") {
      const trimmedNote = note.trim();
      const input: MeasurementInput = {
        type: payload.measurement_type as MeasurementInput["type"],
        value: Number(payload.value),
        unit: (payload.unit as string) ?? "",
        measured_at: new Date(stamp).toISOString().slice(0, 10),
        ...(trimmedNote ? { note: trimmedNote } : {}),
      };
      measurementMutation.mutate(input);
      return;
    }
    mutation.mutate({
      type: tab as LogType,
      data: payload,
      note: note.trim() || undefined,
      timestamp: new Date(stamp).toISOString(),
    });
  }

  function handleReset() {
    reset();
    setStamp(nowLocalInput());
  }

  return (
    <Modal
      open
      onOpenChange={(o) => !o && close()}
      title={t("logs.add.title")}
      description={activeChild ? activeChild.name : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={handleReset} disabled={mutation.isPending || measurementMutation.isPending}>
            {t("logs.add.reset")}
          </Button>
          <Button
            onClick={handleSubmit}
            loading={mutation.isPending || measurementMutation.isPending}
            disabled={!ready}
          >
            {t("logs.add.saveLog")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} items={TABS}>
          <TabContent value="feeding">
            <FeedingForm data={data} setData={setData} />
          </TabContent>
          <TabContent value="diaper">
            <DiaperForm data={data} setData={setData} />
          </TabContent>
          <TabContent value="sleep">
            <SleepForm data={data} setData={setData} />
          </TabContent>
          <TabContent value="measurement">
            <MeasurementForm data={data} setData={setData} />
          </TabContent>
          <TabContent value="medicine">
            <MedicineForm data={data} setData={setData} />
          </TabContent>
          <TabContent value="other">
            <OtherForm data={data} setData={setData} />
          </TabContent>
        </Tabs>

        <Input
          label={t("logs.add.time")}
          type="datetime-local"
          value={stamp}
          onChange={(e) => setStamp(e.target.value)}
        />
        <Textarea
          label={t("logs.add.note")}
          placeholder={t("logs.add.notePlaceholder")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
    </Modal>
  );
}

/** Shared per-tab state container: holds the data payload, note, and validity. */
export function useBuildLog(tab: TabKey) {
  const [note, setNote] = useState("");
  const [data, setData] = useState<LogData>({});

  // Reset the payload whenever the tab changes.
  useEffect(() => setData({}), [tab]);

  const { payload, ready } = useMemo(() => buildPayload(tab, data), [tab, data]);

  const reset = () => {
    setData({});
    setNote("");
  };

  return { note, setNote, data, setData, payload, ready, reset };
}

export function buildPayload(tab: TabKey, data: LogData): { payload: LogData; ready: boolean } {
  switch (tab) {
    case "feeding": {
      const subtype = (data.subtype as string) || "";
      const amount = num(data.amount_ml);
      const ready = !!subtype;
      const payload: LogData = { subtype };
      if (subtype === "breast") {
        if (data.side) payload.side = data.side;
        if (data.duration_min) payload.duration_min = num(data.duration_min);
      }
      if (subtype === "formula" || subtype === "pumping") {
        if (amount > 0) payload.amount_ml = amount;
      }
      return { payload, ready };
    }
    case "diaper": {
      const contents = (data.contents as string) || "";
      return {
        payload: {
          contents,
          ...(data.consistency ? { consistency: num(data.consistency) } : {}),
          ...(data.color ? { color: data.color } : {}),
        },
        ready: !!contents,
      };
    }
    case "sleep": {
      const start = data.start as string | undefined;
      const end = data.end as string | undefined;
      const duration = num(data.duration_minutes);
      const payload: LogData = { subtype: data.subtype ?? "nap" };
      if (duration > 0) {
        payload.duration_minutes = duration;
      } else if (start && end) {
        payload.start = start;
        payload.end = end;
      }
      return { payload, ready: duration > 0 || (!!start && !!end) };
    }
    case "measurement": {
      const value = num(data.value);
      const mtype = (data.measurement_type as string) || "";
      return {
        payload: {
          measurement_type: mtype,
          value,
          unit: data.unit ?? defaultUnit(mtype),
        },
        ready: value > 0 && !!mtype,
      };
    }
    case "medicine": {
      const name = (data.name as string) || "";
      return {
        payload: { name, ...(data.dose ? { dose: data.dose } : {}) },
        ready: !!name,
      };
    }
    case "other": {
      const category = (data.category as string) || "";
      return { payload: { category }, ready: !!category };
    }
  }
}

export const num = (v: unknown) => (typeof v === "number" ? v : v ? Number(v) : 0);

export function defaultUnit(mtype: string): string {
  switch (mtype) {
    case "weight":
      return "kg";
    case "height":
      return "cm";
    case "head_circumference":
      return "cm";
    default:
      return "";
  }
}

// --- Per-tab forms ---

export interface FormProps {
  data: LogData;
  setData: Dispatch<SetStateAction<LogData>>;
}

export function FeedingForm({ data, setData }: FormProps) {
  const { t } = useTranslation();
  const subtype = (data.subtype as string) || "";
  return (
    <div className="space-y-4">
      <Select
        label={t("logs.add.feeding.type")}
        value={subtype}
        onValueChange={(v) => setData((d) => ({ ...d, subtype: v }))}
        placeholder={t("logs.add.feeding.typePlaceholder")}
        options={[
          { value: "breast", label: t("logs.subtypes.breast") },
          { value: "formula", label: t("logs.subtypes.formula") },
          { value: "solid", label: t("logs.subtypes.solid") },
          { value: "pumping", label: t("logs.subtypes.pumping") },
        ]}
      />
      {subtype === "breast" && (
        <div className="grid grid-cols-2 gap-3">
          <Select
            label={t("logs.add.feeding.side")}
            value={(data.side as string) || ""}
            onValueChange={(v) => setData((d) => ({ ...d, side: v }))}
            placeholder={t("logs.add.feeding.select")}
            options={[
              { value: "left", label: t("logs.add.feeding.left") },
              { value: "right", label: t("logs.add.feeding.right") },
              { value: "both", label: t("logs.add.feeding.both") },
            ]}
          />
          <Input
            label={t("logs.add.feeding.duration")}
            type="number"
            min={0}
            value={valueOrEmpty(data.duration_min)}
            onChange={(e) => setData((d) => ({ ...d, duration_min: e.target.value }))}
          />
        </div>
      )}
      {(subtype === "formula" || subtype === "pumping") && (
        <Input
          label={t("logs.add.feeding.amount")}
          type="number"
          min={0}
          value={valueOrEmpty(data.amount_ml)}
          onChange={(e) => setData((d) => ({ ...d, amount_ml: e.target.value }))}
        />
      )}
      {subtype === "solid" && (
        <Input
          label={t("logs.add.feeding.food")}
          placeholder={t("logs.add.feeding.foodPlaceholder")}
          value={(data.food as string) || ""}
          onChange={(e) => setData((d) => ({ ...d, food: e.target.value }))}
        />
      )}
    </div>
  );
}

export function DiaperForm({ data, setData }: FormProps) {
  const { t } = useTranslation();
  const contents = (data.contents as string) || "";
  const presets: { value: string; labelKey: string; emoji: string }[] = [
    { value: "pee", labelKey: "logs.contents.pee", emoji: "💧" },
    { value: "poop", labelKey: "logs.contents.poop", emoji: "💩" },
    { value: "both", labelKey: "logs.contents.both", emoji: "💩💧" },
  ];
  return (
    <div className="space-y-4">
      <div>
        <span className="label">{t("logs.add.diaper.contents")}</span>
        <div className="grid grid-cols-3 gap-2">
          {presets.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setData((d) => ({ ...d, contents: p.value }))}
              className={
                "flex flex-col items-center gap-1 rounded-xl border-2 py-3 text-sm font-semibold transition " +
                (contents === p.value
                  ? "border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-900/40 dark:text-brand-200"
                  : "border-slate-200 bg-white text-slate-600 hover:border-brand-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-brand-700")
              }
            >
              <span className="text-2xl">{p.emoji}</span>
              {t(p.labelKey)}
            </button>
          ))}
        </div>
      </div>
      {(contents === "poop" || contents === "both") && (
        <>
          <div>
            <span className="label">{t("logs.add.diaper.consistency")}</span>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setData((d) => ({ ...d, consistency: n }))}
                  className={
                    "h-11 flex-1 rounded-lg text-sm font-bold transition " +
                    (Number(data.consistency) === n
                      ? "bg-brand-500 text-white"
                      : "bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-900/30 dark:text-brand-300 dark:hover:bg-brand-900/50")
                  }
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <Input
            label={t("logs.add.diaper.color")}
            placeholder={t("logs.add.diaper.colorPlaceholder")}
            value={(data.color as string) || ""}
            onChange={(e) => setData((d) => ({ ...d, color: e.target.value }))}
          />
        </>
      )}
    </div>
  );
}

export function SleepForm({ data, setData }: FormProps) {
  const { t } = useTranslation();
  const start = (data.start as string) || "";
  const end = (data.end as string) || "";
  return (
    <div className="space-y-4">
      <Select
        label={t("logs.add.sleep.type")}
        value={(data.subtype as string) || "nap"}
        onValueChange={(v) => setData((d) => ({ ...d, subtype: v }))}
        options={[
          { value: "nap", label: t("logs.subtypes.nap") },
          { value: "night", label: t("logs.subtypes.night") },
        ]}
      />
      <div className="rounded-xl bg-brand-50 p-3 text-sm text-brand-700 dark:bg-brand-900/30 dark:text-brand-200">
        {t("logs.add.sleep.hint")}
      </div>
      <Input
        label={t("logs.add.sleep.duration")}
        type="number"
        min={0}
        value={valueOrEmpty(data.duration_minutes)}
        onChange={(e) => setData((d) => ({ ...d, duration_minutes: e.target.value }))}
        placeholder={t("logs.add.sleep.durationPlaceholder")}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label={t("logs.add.sleep.start")}
          type="datetime-local"
          value={start ? start.slice(0, 16) : ""}
          onChange={(e) => setData((d) => ({ ...d, start: new Date(e.target.value).toISOString() }))}
        />
        <Input
          label={t("logs.add.sleep.end")}
          type="datetime-local"
          value={end ? end.slice(0, 16) : ""}
          onChange={(e) => setData((d) => ({ ...d, end: new Date(e.target.value).toISOString() }))}
        />
      </div>
    </div>
  );
}

export function MeasurementForm({ data, setData }: FormProps) {
  const { t } = useTranslation();
  const mtype = (data.measurement_type as string) || "";
  return (
    <div className="space-y-4">
      <Select
        label={t("logs.add.measurement.measurement")}
        value={mtype}
        onValueChange={(v) => setData((d) => ({ ...d, measurement_type: v }))}
        placeholder={t("logs.add.measurement.select")}
        options={[
          { value: "weight", label: t("logs.measureTypes.weight") },
          { value: "height", label: t("logs.measureTypes.height") },
          { value: "head_circumference", label: t("logs.measureTypes.head_circumference") },
        ]}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label={t("logs.add.measurement.value")}
          type="number"
          step="0.01"
          min={0}
          value={valueOrEmpty(data.value)}
          onChange={(e) => setData((d) => ({ ...d, value: e.target.value }))}
        />
        <Input
          label={t("logs.add.measurement.unit")}
          value={(data.unit as string) || defaultUnit(mtype)}
          onChange={(e) => setData((d) => ({ ...d, unit: e.target.value }))}
        />
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500">
        {t("logs.add.measurement.hint")}
      </p>
    </div>
  );
}

export function MedicineForm({ data, setData }: FormProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <Input
        label={t("logs.add.medicine.name")}
        placeholder={t("logs.add.medicine.namePlaceholder")}
        value={(data.name as string) || ""}
        onChange={(e) => setData((d) => ({ ...d, name: e.target.value }))}
      />
      <Input
        label={t("logs.add.medicine.dose")}
        placeholder={t("logs.add.medicine.dosePlaceholder")}
        value={(data.dose as string) || ""}
        onChange={(e) => setData((d) => ({ ...d, dose: e.target.value }))}
      />
    </div>
  );
}

export function OtherForm({ data, setData }: FormProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <Select
        label={t("logs.add.other.activity")}
        value={(data.category as string) || ""}
        onValueChange={(v) => setData((d) => ({ ...d, category: v }))}
        placeholder={t("logs.add.other.select")}
        options={[
          { value: "tummy_time", label: t("logs.add.other.tummyTime") },
          { value: "bath", label: t("logs.add.other.bath") },
          { value: "milestone", label: t("logs.add.other.milestone") },
          { value: "doctor_visit", label: t("logs.add.other.doctorVisit") },
          { value: "play", label: t("logs.add.other.play") },
          { value: "mood", label: t("logs.add.other.mood") },
        ]}
      />
    </div>
  );
}

export function valueOrEmpty(v: unknown): string {
  if (v === undefined || v === null || v === "") return "";
  return String(v);
}
