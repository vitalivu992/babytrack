import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { register } from "../api/auth";
import { errorMessage } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/Toast";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { AuthShell } from "./Login";

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const toast = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError(t("auth.register.passwordTooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("auth.register.passwordsDoNotMatch"));
      return;
    }
    setLoading(true);
    try {
      const user = await register({ name: name.trim(), email: email.trim(), password });
      setUser(user);
      toast.success(t("auth.register.accountCreated"), t("auth.register.letsAddChild"));
      navigate("/onboarding", { replace: true });
    } catch (err) {
      const msg = errorMessage(err);
      setError(msg);
      toast.error(t("auth.register.couldNotCreate"), msg);
    } finally {
      setLoading(false);
    }
  }

  const matchError = !!error && error === t("auth.register.passwordsDoNotMatch");

  return (
    <AuthShell title={t("auth.register.title")} subtitle={t("auth.register.subtitle")}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label={t("auth.register.name")}
          name="name"
          autoComplete="name"
          required
          placeholder={t("auth.register.namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label={t("auth.register.email")}
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder={t("auth.register.emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label={t("auth.register.password")}
          name="password"
          type="password"
          autoComplete="new-password"
          required
          placeholder={t("auth.register.passwordPlaceholder")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          label={t("auth.register.confirm")}
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          placeholder={t("auth.register.confirmPlaceholder")}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={matchError ? error ?? undefined : undefined}
        />
        {error && !matchError && (
          <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
        )}
        <Button type="submit" size="lg" loading={loading} className="w-full">
          {t("auth.register.submit")}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        {t("auth.register.alreadyHaveAccount")}{" "}
        <Link to="/login" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
          {t("auth.register.signIn")}
        </Link>
      </p>
    </AuthShell>
  );
}
