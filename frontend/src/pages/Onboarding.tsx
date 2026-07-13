import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { createChild } from "../api/children";
import { errorMessage } from "../api/client";
import { useToast } from "../components/Toast";
import { ChildForm, type ChildFormValues } from "../components/ChildForm";

export default function Onboarding() {
  const { t } = useTranslation();
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
      toast.success(t("onboarding.childAdded"), t("onboarding.letsStartTracking"));
      navigate("/app", { replace: true });
    },
    onError: (err) => toast.error(t("onboarding.couldNotAdd"), errorMessage(err)),
  });

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-3xl shadow-soft dark:bg-brand-900/60">
            👶
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {t("onboarding.title")}
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            {t("onboarding.subtitle")}
          </p>
        </div>
        <div className="card">
          <ChildForm
            submitting={mutation.isPending}
            submitLabel={t("onboarding.submit")}
            onSubmit={(v) => mutation.mutate(v)}
          />
        </div>
      </div>
    </div>
  );
}
