import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invite, listMembers, revokeMember } from "../api/sharing";
import { errorMessage } from "../api/client";
import type { ChildMember, ShareRole } from "../api/types";
import { useActiveChild } from "../hooks/useActiveChild";
import { useToast } from "../components/Toast";
import { Card } from "../components/Card";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { Modal } from "../components/Modal";
import { format } from "date-fns";

export default function Share() {
  const { activeChild, isOwner } = useActiveChild();
  const childId = activeChild?.id ?? "";
  const toast = useToast();
  const qc = useQueryClient();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<ShareRole, "owner">>("viewer");
  const [lastInvite, setLastInvite] = useState<string | null>(null);
  const [toRevoke, setToRevoke] = useState<ChildMember | null>(null);

  const { data: members = [] } = useQuery({
    queryKey: ["members", childId],
    queryFn: () => listMembers(childId),
    enabled: !!childId,
  });

  const inviteMut = useMutation({
    mutationFn: () => invite(childId, { email: email.trim(), role }),
    onSuccess: (inv) => {
      qc.invalidateQueries({ queryKey: ["members", childId] });
      setLastInvite(inv.token ?? null);
      toast.success("Invitation sent!", `Sent to ${email}`);
      setEmail("");
    },
    onError: (err) => toast.error("Couldn't invite", errorMessage(err)),
  });

  const revokeMut = useMutation({
    mutationFn: (userId: string) => revokeMember(childId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members", childId] });
      toast.success("Access removed");
      setToRevoke(null);
    },
    onError: (err) => toast.error("Couldn't remove", errorMessage(err)),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    inviteMut.mutate();
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Share {activeChild?.name}</h1>
        <p className="text-sm text-slate-500">
          Invite family and caregivers. Owners can edit everything; editors can log
          activities; viewers can only see.
        </p>
      </header>

      {isOwner ? (
        <Card title="Invite someone">
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              label="Email address"
              type="email"
              required
              placeholder="caregiver@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Select
              label="Role"
              value={role}
              onValueChange={(v) => setRole(v as typeof role)}
              options={[
                { value: "editor", label: "Editor — can log activities" },
                { value: "viewer", label: "Viewer — read only" },
              ]}
            />
            <Button type="submit" loading={inviteMut.isPending} className="w-full">
              Send invitation
            </Button>
          </form>
          {lastInvite && (
            <div className="mt-4 rounded-xl bg-brand-50 p-3 text-sm text-brand-700">
              <p className="font-semibold">Share link</p>
              <p className="mb-2 text-xs">
                Send this link to the invited person. They'll be prompted to sign in or create
                an account with {email || "that email"}.
              </p>
              <code className="block break-all rounded-lg bg-white p-2 text-xs text-slate-600">
                {`${window.location.origin}/invite?token=${lastInvite}`}
              </code>
            </div>
          )}
        </Card>
      ) : (
        <Card className="text-sm text-slate-500">
          Only the owner can send new invitations. You're a{" "}
          <strong>{activeChild?.role}</strong> on this child.
        </Card>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Members ({members.length})
        </h2>
        <ul className="space-y-2">
          {members.map((m) => (
            <li key={m.user_id}>
              <Card className="flex items-center gap-3 p-3.5">
                <Avatar name={m.name || m.email || "?"} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-700">
                    {m.name || m.email}
                  </p>
                  <p className="text-xs text-slate-400">
                    {m.name ? `${m.email} · ` : ""}
                    joined {format(new Date(m.invited_at), "MMM d, yyyy")}
                  </p>
                </div>
                <span
                  className={
                    "chip " +
                    (m.role === "owner"
                      ? "bg-brand-100 text-brand-700"
                      : m.role === "editor"
                      ? "bg-mint-soft/50 text-emerald-700"
                      : "bg-slate-100 text-slate-500")
                  }
                >
                  {m.role}
                </span>
                {isOwner && m.role !== "owner" && (
                  <button
                    onClick={() => setToRevoke(m)}
                    className="rounded-lg p-2 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
                    aria-label="Remove member"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
              </Card>
            </li>
          ))}
          {members.length === 0 && (
            <Card className="py-8 text-center text-sm text-slate-400">No members yet.</Card>
          )}
        </ul>
      </section>

      <Modal
        open={!!toRevoke}
        onOpenChange={(o) => !o && setToRevoke(null)}
        title="Remove access?"
        description={toRevoke?.name || toRevoke?.email}
        footer={
          <>
            <Button variant="ghost" onClick={() => setToRevoke(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={revokeMut.isPending}
              onClick={() => toRevoke && revokeMut.mutate(toRevoke.user_id)}
            >
              Remove
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          This person will lose access to {activeChild?.name}'s data immediately.
        </p>
      </Modal>
    </div>
  );
}
