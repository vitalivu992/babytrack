import { useEffect, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { acceptInvitation } from "../api/sharing";
import { errorMessage, getToken } from "../api/client";
import { useToast } from "../components/Toast";
import { Button } from "../components/Button";

/** Handles an invitation link (?token=...). Accepts it and redirects to the app. */
export default function AcceptInvite() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();

  const accept = useMutation({
    mutationFn: () => acceptInvitation(token),
    onSuccess: (child) => {
      qc.invalidateQueries({ queryKey: ["children"] });
      toast.success("Invitation accepted!", `You can now track ${child.name}.`);
      navigate("/app", { replace: true });
    },
    onError: (err) => toast.error("Couldn't accept", errorMessage(err)),
  });

  // Auto-accept when the user is signed in.
  useEffect(() => {
    if (token && getToken()) accept.mutate();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!token) {
    return (
      <Centered>
        <p className="text-slate-500">This invitation link is invalid.</p>
        <Link to="/app" className="mt-4 inline-block font-semibold text-brand-600">
          Go home
        </Link>
      </Centered>
    );
  }

  if (!getToken()) {
    return (
      <Centered>
        <div className="text-center">
          <div className="mx-auto mb-4 text-4xl">💌</div>
          <h1 className="text-xl font-bold text-slate-800">You've been invited!</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in or create an account to accept the invitation.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/login">
              <Button variant="secondary">Sign in</Button>
            </Link>
            <Link to="/register">
              <Button>Create account</Button>
            </Link>
          </div>
        </div>
      </Centered>
    );
  }

  return (
    <Centered>
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500" />
        <p className="text-sm text-slate-500">Accepting your invitation…</p>
        <Button
          variant="ghost"
          className="mt-4"
          loading={accept.isPending}
          onClick={() => accept.mutate()}
        >
          Retry
        </Button>
      </div>
    </Centered>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card max-w-sm text-center">{children}</div>
    </div>
  );
}
