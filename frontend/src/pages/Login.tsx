import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { login } from "../api/auth";
import { errorMessage } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/Toast";
import { Button } from "../components/Button";
import { Input } from "../components/Input";

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname || "/app";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login({ email: email.trim(), password });
      setUser(res.user);
      toast.success(t("auth.login.welcomeBack", { name: res.user.name || t("auth.login.friend") }));
      navigate(from, { replace: true });
    } catch (err) {
      const msg = errorMessage(err);
      setError(msg);
      toast.error(t("auth.login.couldNotSignIn"), msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title={t("auth.login.title")} subtitle={t("auth.login.subtitle")}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label={t("auth.login.email")}
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder={t("auth.login.emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label={t("auth.login.password")}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder={t("auth.login.passwordPlaceholder")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
        <Button type="submit" size="lg" loading={loading} className="w-full">
          {t("auth.login.submit")}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        {t("auth.login.newHere")}{" "}
        <Link to="/register" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
          {t("auth.login.createAccount")}
        </Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-3xl shadow-soft dark:bg-brand-900/60">
            🍼
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{title}</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <div className="card">{children}</div>
      </div>
    </div>
  );
}
