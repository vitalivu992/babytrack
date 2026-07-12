import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { getChild, updateChild } from "../api/children";
import { growthSeries } from "../api/insights";
import { errorMessage } from "../api/client";
import type { MeasurementKind } from "../lib/who";
import { useActiveChild } from "../hooks/useActiveChild";
import { useToast } from "../components/Toast";
import { Card } from "../components/Card";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { Tabs, TabContent } from "../components/Tabs";
import { Modal } from "../components/Modal";
import { ChildForm, valuesFromChild, type ChildFormValues } from "../components/ChildForm";
import { GrowthChart } from "../components/GrowthChart";
import { VaccinationSchedule } from "../components/VaccinationSchedule";
import { ageLabel } from "../lib/utils";
import { ShareIcon } from "../components/icons";

export default function ChildProfile() {
  const { activeChild, canEdit } = useActiveChild();
  const childId = activeChild?.id ?? "";
  const [editing, setEditing] = useState(false);

  const { data: child } = useQuery({
    queryKey: ["child", childId],
    queryFn: () => getChild(childId),
    enabled: !!childId,
  });

  const { data: growth = [] } = useQuery({
    queryKey: ["growth", childId],
    queryFn: () => growthSeries(childId),
    enabled: !!childId,
  });

  const info = child ?? activeChild;

  const byKind = (k: MeasurementKind) => growth.find((s) => s.type === k);

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-4">
        <Avatar name={info?.name ?? "?"} src={info?.photo_url} size="xl" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold text-slate-800">{info?.name}</h1>
          <p className="text-sm text-slate-500">
            {info?.birth_date
              ? `${format(new Date(info.birth_date), "MMM d, yyyy")} · ${ageLabel(info.birth_date)}`
              : "No birth date set"}
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            {info?.gender && <span className="chip bg-brand-50 text-brand-600">{capitalize(info.gender)}</span>}
            {info?.blood_type && <span className="chip bg-rose-50 text-rose-600">{info.blood_type}</span>}
            {info?.role && <span className="chip bg-slate-100 text-slate-500">{capitalize(info.role)}</span>}
          </div>
        </div>
        {canEdit && (
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </header>

      {(info?.allergies || info?.notes) && (
        <Card className="space-y-2">
          {info?.allergies && (
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Allergies</p>
              <p className="text-sm text-slate-700">{info.allergies}</p>
            </div>
          )}
          {info?.notes && (
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Notes</p>
              <p className="whitespace-pre-line text-sm text-slate-700">{info.notes}</p>
            </div>
          )}
        </Card>
      )}

      <Tabs
        defaultValue="growth"
        items={[
          { value: "growth", label: "Growth" },
          { value: "vaccines", label: "Vaccines" },
          { value: "share", label: "Share" },
        ]}
      >
        <TabContent value="growth">
          <div className="space-y-4">
            <GrowthChart
              kind="weight"
              series={byKind("weight")}
              birthDate={info?.birth_date}
              gender={info?.gender ?? ""}
            />
            <GrowthChart
              kind="height"
              series={byKind("height")}
              birthDate={info?.birth_date}
              gender={info?.gender ?? ""}
            />
            <GrowthChart
              kind="head_circumference"
              series={byKind("head_circumference")}
              birthDate={info?.birth_date}
              gender={info?.gender ?? ""}
            />
          </div>
        </TabContent>
        <TabContent value="vaccines">
          <VaccinationSchedule canEdit={canEdit} />
        </TabContent>
        <TabContent value="share">
          <Card className="text-center">
            <ShareIcon className="mx-auto mb-2 h-8 w-8 text-brand-300" />
            <p className="mb-3 text-sm text-slate-500">
              Invite family or caregivers to help track {info?.name}.
            </p>
            <Link to="/app/share">
              <Button>Manage sharing</Button>
            </Link>
          </Card>
        </TabContent>
      </Tabs>

      {info && (
        <EditChildModal
          open={editing}
          onOpenChange={setEditing}
          child={info}
        />
      )}
    </div>
  );
}

function EditChildModal({
  open,
  onOpenChange,
  child,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  child: NonNullable<ReturnType<typeof useActiveChild>["activeChild"]>;
}) {
  const qc = useQueryClient();
  const toast = useToast();

  const mutation = useMutation({
    mutationFn: (values: ChildFormValues) =>
      updateChild(child.id, {
        name: values.name.trim(),
        birth_date: values.birth_date || undefined,
        gender: values.gender || undefined,
        photo_url: values.photo_url || undefined,
        blood_type: values.blood_type || undefined,
        allergies: values.allergies || undefined,
        notes: values.notes || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["children"] });
      qc.invalidateQueries({ queryKey: ["child", child.id] });
      toast.success("Profile updated");
      onOpenChange(false);
    },
    onError: (err) => toast.error("Couldn't update", errorMessage(err)),
  });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Edit ${child.name}`}
      className="max-w-xl"
    >
      <ChildForm
        initial={valuesFromChild(child)}
        submitting={mutation.isPending}
        submitLabel="Save changes"
        onSubmit={(v) => mutation.mutate(v)}
      />
    </Modal>
  );
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
