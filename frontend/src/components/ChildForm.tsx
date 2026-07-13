import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { type Child, type Gender } from "../api/types";
import { Button } from "./Button";
import { Input, Textarea } from "./Input";
import { Select } from "./Select";

export interface ChildFormValues {
  name: string;
  birth_date: string;
  gender: Gender;
  photo_url: string;
  blood_type: string;
  allergies: string;
  notes: string;
}

const EMPTY: ChildFormValues = {
  name: "",
  birth_date: "",
  gender: "",
  photo_url: "",
  blood_type: "",
  allergies: "",
  notes: "",
};

export function valuesFromChild(c: Child): ChildFormValues {
  return {
    name: c.name,
    birth_date: c.birth_date?.slice(0, 10) ?? "",
    gender: (c.gender as Gender) || "",
    photo_url: c.photo_url ?? "",
    blood_type: c.blood_type ?? "",
    allergies: c.allergies ?? "",
    notes: c.notes ?? "",
  };
}

export function ChildForm({
  initial,
  onSubmit,
  submitting,
  submitLabel,
}: {
  initial?: ChildFormValues;
  onSubmit: (values: ChildFormValues) => void;
  submitting?: boolean;
  submitLabel?: string;
}) {
  const { t } = useTranslation();
  const [values, setValues] = useState<ChildFormValues>(initial ?? EMPTY);

  const set = <K extends keyof ChildFormValues>(key: K, val: ChildFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: val }));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Input
        label={t("child.form.name")}
        name="name"
        required
        placeholder={t("child.form.namePlaceholder")}
        value={values.name}
        onChange={(e) => set("name", e.target.value)}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label={t("child.form.birthDate")}
          name="birth_date"
          type="date"
          value={values.birth_date}
          onChange={(e) => set("birth_date", e.target.value)}
        />
        <Select
          label={t("child.form.gender")}
          value={values.gender}
          onValueChange={(v) => set("gender", v as Gender)}
          placeholder={t("child.form.select")}
          options={[
            { value: "female", label: t("child.form.female") },
            { value: "male", label: t("child.form.male") },
            { value: "other", label: t("child.form.otherGender") },
          ]}
        />
      </div>
      <Input
        label={t("child.form.photoUrl")}
        name="photo_url"
        placeholder={t("child.form.photoPlaceholder")}
        value={values.photo_url}
        onChange={(e) => set("photo_url", e.target.value)}
        hint={t("child.form.photoHint")}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label={t("child.form.bloodType")}
          value={values.blood_type}
          onValueChange={(v) => set("blood_type", v)}
          placeholder={t("child.form.unknown")}
          options={["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((b) => ({
            value: b,
            label: b,
          }))}
        />
        <Input
          label={t("child.form.allergies")}
          name="allergies"
          placeholder={t("child.form.allergiesPlaceholder")}
          value={values.allergies}
          onChange={(e) => set("allergies", e.target.value)}
        />
      </div>
      <Textarea
        label={t("child.form.notes")}
        name="notes"
        placeholder={t("child.form.notesPlaceholder")}
        value={values.notes}
        onChange={(e) => set("notes", e.target.value)}
      />
      <Button type="submit" size="lg" loading={submitting} className="w-full">
        {submitLabel ?? t("common.save")}
      </Button>
    </form>
  );
}
