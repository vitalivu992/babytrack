import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createLog } from "../api/activities";
import type { CreateLogInput, LogData, LogType } from "../api/types";
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

type TabKey = "feeding" | "diaper" | "sleep" | "measurement" | "medicine" | "other";

const TABS = [
  { value: "feeding" as TabKey, label: "Feed", icon: <BottleIcon className="h-4 w-4" /> },
  { value: "diaper" as TabKey, label: "Diaper", icon: <DiaperIcon className="h-4 w-4" /> },
  { value: "sleep" as TabKey, label: "Sleep", icon: <MoonIcon className="h-4 w-4" /> },
  { value: "measurement" as TabKey, label: "Measure", icon: <RulerIcon className="h-4 w-4" /> },
  { value: "medicine" as TabKey, label: "Medicine", icon: <PillIcon className="h-4 w-4" /> },
  { value: "other" as TabKey, label: "Other", icon: <SparkleIcon className="h-4 w-4" /> },
];

const nowLocalInput = (d = new Date()) => {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
};

export default function AddLog() {
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
      toast.success("Logged!");
      close();
    },
    onError: (err) => toast.error("Couldn't save log", errorMessage(err)),
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
      title="Log activity"
      description={activeChild ? activeChild.name : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={handleReset} disabled={mutation.isPending}>
            Reset
          </Button>
          <Button onClick={handleSubmit} loading={mutation.isPending} disabled={!ready}>
            Save log
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
          label="Time"
          type="datetime-local"
          value={stamp}
          onChange={(e) => setStamp(e.target.value)}
        />
        <Textarea
          label="Note (optional)"
          placeholder="Anything to remember..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
    </Modal>
  );
}

/** Shared per-tab state container: holds the data payload, note, and validity. */
function useBuildLog(tab: TabKey) {
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

function buildPayload(tab: TabKey, data: LogData): { payload: LogData; ready: boolean } {
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

const num = (v: unknown) => (typeof v === "number" ? v : v ? Number(v) : 0);

function defaultUnit(mtype: string): string {
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

interface FormProps {
  data: LogData;
  setData: Dispatch<SetStateAction<LogData>>;
}

function FeedingForm({ data, setData }: FormProps) {
  const subtype = (data.subtype as string) || "";
  return (
    <div className="space-y-4">
      <Select
        label="Type"
        value={subtype}
        onValueChange={(v) => setData((d) => ({ ...d, subtype: v }))}
        placeholder="Select feeding type"
        options={[
          { value: "breast", label: "Breastfeed" },
          { value: "formula", label: "Bottle (formula)" },
          { value: "solid", label: "Solid food" },
          { value: "pumping", label: "Pumping" },
        ]}
      />
      {subtype === "breast" && (
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Side"
            value={(data.side as string) || ""}
            onValueChange={(v) => setData((d) => ({ ...d, side: v }))}
            placeholder="Select"
            options={[
              { value: "left", label: "Left" },
              { value: "right", label: "Right" },
              { value: "both", label: "Both" },
            ]}
          />
          <Input
            label="Duration (min)"
            type="number"
            min={0}
            value={valueOrEmpty(data.duration_min)}
            onChange={(e) => setData((d) => ({ ...d, duration_min: e.target.value }))}
          />
        </div>
      )}
      {(subtype === "formula" || subtype === "pumping") && (
        <Input
          label="Amount (ml)"
          type="number"
          min={0}
          value={valueOrEmpty(data.amount_ml)}
          onChange={(e) => setData((d) => ({ ...d, amount_ml: e.target.value }))}
        />
      )}
      {subtype === "solid" && (
        <Input
          label="Food description"
          placeholder="e.g. mashed banana"
          value={(data.food as string) || ""}
          onChange={(e) => setData((d) => ({ ...d, food: e.target.value }))}
        />
      )}
    </div>
  );
}

function DiaperForm({ data, setData }: FormProps) {
  const contents = (data.contents as string) || "";
  const presets: { value: string; label: string; emoji: string }[] = [
    { value: "pee", label: "Pee", emoji: "💧" },
    { value: "poop", label: "Poop", emoji: "💩" },
    { value: "both", label: "Both", emoji: "💩💧" },
  ];
  return (
    <div className="space-y-4">
      <div>
        <span className="label">Contents</span>
        <div className="grid grid-cols-3 gap-2">
          {presets.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setData((d) => ({ ...d, contents: p.value }))}
              className={
                "flex flex-col items-center gap-1 rounded-xl border-2 py-3 text-sm font-semibold transition " +
                (contents === p.value
                  ? "border-brand-400 bg-brand-50 text-brand-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-brand-200")
              }
            >
              <span className="text-2xl">{p.emoji}</span>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {(contents === "poop" || contents === "both") && (
        <>
          <div>
            <span className="label">Consistency (Bristol stool scale)</span>
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
                      : "bg-brand-50 text-brand-600 hover:bg-brand-100")
                  }
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <Input
            label="Color (optional)"
            placeholder="e.g. yellow, brown"
            value={(data.color as string) || ""}
            onChange={(e) => setData((d) => ({ ...d, color: e.target.value }))}
          />
        </>
      )}
    </div>
  );
}

function SleepForm({ data, setData }: FormProps) {
  const start = (data.start as string) || "";
  const end = (data.end as string) || "";
  return (
    <div className="space-y-4">
      <Select
        label="Type"
        value={(data.subtype as string) || "nap"}
        onValueChange={(v) => setData((d) => ({ ...d, subtype: v }))}
        options={[
          { value: "nap", label: "Nap" },
          { value: "night", label: "Night sleep" },
        ]}
      />
      <div className="rounded-xl bg-brand-50 p-3 text-sm text-brand-700">
        💡 Set a quick duration, or pick a start &amp; end time below.
      </div>
      <Input
        label="Duration (minutes)"
        type="number"
        min={0}
        value={valueOrEmpty(data.duration_minutes)}
        onChange={(e) => setData((d) => ({ ...d, duration_minutes: e.target.value }))}
        placeholder="e.g. 45"
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Start"
          type="datetime-local"
          value={start ? start.slice(0, 16) : ""}
          onChange={(e) => setData((d) => ({ ...d, start: new Date(e.target.value).toISOString() }))}
        />
        <Input
          label="End"
          type="datetime-local"
          value={end ? end.slice(0, 16) : ""}
          onChange={(e) => setData((d) => ({ ...d, end: new Date(e.target.value).toISOString() }))}
        />
      </div>
    </div>
  );
}

function MeasurementForm({ data, setData }: FormProps) {
  const mtype = (data.measurement_type as string) || "";
  return (
    <div className="space-y-4">
      <Select
        label="Measurement"
        value={mtype}
        onValueChange={(v) => setData((d) => ({ ...d, measurement_type: v }))}
        placeholder="Select"
        options={[
          { value: "weight", label: "Weight" },
          { value: "height", label: "Height / Length" },
          { value: "head_circumference", label: "Head circumference" },
        ]}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Value"
          type="number"
          step="0.01"
          min={0}
          value={valueOrEmpty(data.value)}
          onChange={(e) => setData((d) => ({ ...d, value: e.target.value }))}
        />
        <Input
          label="Unit"
          value={(data.unit as string) || defaultUnit(mtype)}
          onChange={(e) => setData((d) => ({ ...d, unit: e.target.value }))}
        />
      </div>
      <p className="text-xs text-slate-400">
        This also creates a growth data point you can chart on the Child profile.
      </p>
    </div>
  );
}

function MedicineForm({ data, setData }: FormProps) {
  return (
    <div className="space-y-4">
      <Input
        label="Medicine name"
        placeholder="e.g. Paracetamol"
        value={(data.name as string) || ""}
        onChange={(e) => setData((d) => ({ ...d, name: e.target.value }))}
      />
      <Input
        label="Dose"
        placeholder="e.g. 2.5 ml"
        value={(data.dose as string) || ""}
        onChange={(e) => setData((d) => ({ ...d, dose: e.target.value }))}
      />
    </div>
  );
}

function OtherForm({ data, setData }: FormProps) {
  return (
    <div className="space-y-4">
      <Select
        label="Activity"
        value={(data.category as string) || ""}
        onValueChange={(v) => setData((d) => ({ ...d, category: v }))}
        placeholder="Select"
        options={[
          { value: "tummy_time", label: "Tummy time" },
          { value: "bath", label: "Bath" },
          { value: "milestone", label: "Milestone" },
          { value: "doctor_visit", label: "Doctor visit" },
          { value: "play", label: "Play" },
          { value: "mood", label: "Mood" },
        ]}
      />
    </div>
  );
}

function valueOrEmpty(v: unknown): string {
  if (v === undefined || v === null || v === "") return "";
  return String(v);
}
