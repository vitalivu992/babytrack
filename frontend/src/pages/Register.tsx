import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../api/auth";
import { errorMessage } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/Toast";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { AuthShell } from "./Login";

export default function Register() {
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
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const user = await register({ name: name.trim(), email: email.trim(), password });
      setUser(user);
      toast.success("Account created!", "Let's add your first child.");
      navigate("/onboarding", { replace: true });
    } catch (err) {
      const msg = errorMessage(err);
      setError(msg);
      toast.error("Couldn't create account", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Start tracking your baby's day in moments.">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Your name"
          name="name"
          autoComplete="name"
          required
          placeholder="Jamie Lee"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          label="Confirm password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          placeholder="Re-enter password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={!!error && error.includes("match") ? error : undefined}
        />
        {error && !error.includes("match") && <p className="text-sm text-rose-600">{error}</p>}
        <Button type="submit" size="lg" loading={loading} className="w-full">
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
