import { useState, type FormEvent } from "react";
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
        label="Child's name"
        name="name"
        required
        placeholder="Baby's name"
        value={values.name}
        onChange={(e) => set("name", e.target.value)}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Date of birth"
          name="birth_date"
          type="date"
          value={values.birth_date}
          onChange={(e) => set("birth_date", e.target.value)}
        />
        <Select
          label="Gender"
          value={values.gender}
          onValueChange={(v) => set("gender", v as Gender)}
          placeholder="Select"
          options={[
            { value: "female", label: "Female" },
            { value: "male", label: "Male" },
            { value: "other", label: "Other / Prefer not to say" },
          ]}
        />
      </div>
      <Input
        label="Photo URL (optional)"
        name="photo_url"
        placeholder="https://..."
        value={values.photo_url}
        onChange={(e) => set("photo_url", e.target.value)}
        hint="Paste a link to your baby's photo."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label="Blood type (optional)"
          value={values.blood_type}
          onValueChange={(v) => set("blood_type", v)}
          placeholder="Unknown"
          options={["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((b) => ({
            value: b,
            label: b,
          }))}
        />
        <Input
          label="Allergies (optional)"
          name="allergies"
          placeholder="e.g. peanuts"
          value={values.allergies}
          onChange={(e) => set("allergies", e.target.value)}
        />
      </div>
      <Textarea
        label="Notes (optional)"
        name="notes"
        placeholder="Anything worth remembering..."
        value={values.notes}
        onChange={(e) => set("notes", e.target.value)}
      />
      <Button type="submit" size="lg" loading={submitting} className="w-full">
        {submitLabel ?? "Save"}
      </Button>
    </form>
  );
}
