import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createChild } from "../api/children";
import { errorMessage } from "../api/client";
import { useToast } from "../components/Toast";
import { ChildForm, type ChildFormValues } from "../components/ChildForm";

export default function Onboarding() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

  const mutation = useMutation({
    mutationFn: (values: ChildFormValues) =>
      createChild({
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
      toast.success("Child added!", "Let's start tracking.");
      navigate("/app", { replace: true });
    },
    onError: (err) => toast.error("Couldn't add child", errorMessage(err)),
  });

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-3xl shadow-soft">
            👶
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Add your first child</h1>
          <p className="mt-1 text-slate-500">
            Just a few details to personalize BabyTrack.
          </p>
        </div>
        <div className="card">
          <ChildForm
            submitting={mutation.isPending}
            submitLabel="Add child"
            onSubmit={(v) => mutation.mutate(v)}
          />
        </div>
      </div>
    </div>
  );
}
