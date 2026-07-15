import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { listLogs, updateLog } from "../api/activities";
import { errorMessage } from "../api/client";
import { useToast } from "../components/Toast";
import { Tabs, TabContent } from "../components/Tabs";
import { Button } from "../components/Button";
import { Input, Textarea } from "../components/Input";
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
import {
  type TabKey,
  useBuildLog,
  nowLocalInput,
  FeedingForm,
  DiaperForm,
  SleepForm,
  MeasurementForm,
  MedicineForm,
  OtherForm,
} from "./AddLog";

export default function EditLog() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logId } = useParams<{ logId: string }>();
  const { activeChild } = useActiveChild();
  const childId = activeChild?.id ?? "";
  const toast = useToast();
  const qc = useQueryClient();

  const close = () => navigate(-1);

  // Fetch logs and find the one we want to edit.
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["logs", childId, {}],
    queryFn: () => listLogs(childId, { limit: 500 }),
    enabled: !!childId && !!logId,
  });

  const log = useMemo(() => logs.find((l) => l.id === logId), [logs, logId]);

  const initialTab = (log?.type as TabKey) || "feeding";
  const [tab, setTab] = useState<TabKey>(initialTab);

  // Set tab once the log is loaded.
  useEffect(() => {
    if (log && log.type) setTab(log.type as TabKey);
  }, [log]); // eslint-disable-line react-hooks/exhaustive-deps

  const TABS = [
    { value: "feeding" as TabKey, label: t("logs.add.tabs.feed"), icon: <BottleIcon className="h-4 w-4" /> },
    { value: "diaper" as TabKey, label: t("logs.add.tabs.diaper"), icon: <DiaperIcon className="h-4 w-4" /> },
    { value: "sleep" as TabKey, label: t("logs.add.tabs.sleep"), icon: <MoonIcon className="h-4 w-4" /> },
    { value: "measurement" as TabKey, label: t("logs.add.tabs.measure"), icon: <RulerIcon className="h-4 w-4" /> },
    { value: "medicine" as TabKey, label: t("logs.add.tabs.medicine"), icon: <PillIcon className="h-4 w-4" /> },
    { value: "other" as TabKey, label: t("logs.add.tabs.other"), icon: <SparkleIcon className="h-4 w-4" /> },
  ];

  const buildInput = useBuildLog(tab);

  // Pre-fill the form once the log is available.
  const [prefilled, setPrefilled] = useState(false);
  const [stamp, setStamp] = useState(nowLocalInput());

  useEffect(() => {
    if (log && !prefilled) {
      if (log.data) {
        buildInput.setData(log.data);
      }
      if (log.note) {
        buildInput.setNote(log.note);
      }
      setStamp(nowLocalInput(new Date(log.timestamp)));
      setPrefilled(true);
    }
  }, [log, prefilled]); // eslint-disable-line react-hooks/exhaustive-deps

  const { note, setNote, data, setData, payload, ready } = buildInput;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!activeChild || !logId) throw { message: "No child or log selected" };
      return updateLog(activeChild.id, logId, {
        data: payload,
        timestamp: new Date(stamp).toISOString(),
        note: note.trim(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["logs"] });
      qc.invalidateQueries({ queryKey: ["daily"] });
      qc.invalidateQueries({ queryKey: ["weekly"] });
      qc.invalidateQueries({ queryKey: ["feeding-stats"] });
      qc.invalidateQueries({ queryKey: ["sleep-stats"] });
      toast.success(t("logs.history.updatedToast"));
      close();
    },
    onError: (err) => toast.error(t("logs.history.couldNotUpdate"), errorMessage(err)),
  });

  function handleSubmit() {
    if (!ready) return;
    mutation.mutate();
  }

  if (isLoading) {
    return (
      <Modal open onOpenChange={(o) => !o && close()} title={t("logs.add.editTitle")}>
        <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
          {t("common.loading")}
        </p>
      </Modal>
    );
  }

  if (!log) {
    return (
      <Modal open onOpenChange={(o) => !o && close()} title={t("logs.add.editTitle")}>
        <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
          Log not found.
        </p>
      </Modal>
    );
  }

  return (
    <Modal
      open
      onOpenChange={(o) => !o && close()}
      title={t("logs.add.editTitle")}
      description={activeChild ? activeChild.name : undefined}
      footer={
        <>
          <Button onClick={handleSubmit} loading={mutation.isPending} disabled={!ready}>
            {t("logs.add.updateLog")}
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
