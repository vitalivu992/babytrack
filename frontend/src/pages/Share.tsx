import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { invite, listMembers, revokeMember } from "../api/sharing";
import { errorMessage } from "../api/client";
import type { ChildMember } from "../api/types";
import { useActiveChild } from "../hooks/useActiveChild";
import { useToast } from "../components/Toast";
import { Card } from "../components/Card";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { Modal } from "../components/Modal";
import { fmt } from "../lib/utils";

export default function Share() {
  const { t } = useTranslation();
  const { activeChild, isOwner } = useActiveChild();
  const childId = activeChild?.id ?? "";
  const toast = useToast();
  const qc = useQueryClient();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("viewer");
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
      toast.success(t("share.toast.sent"), t("share.toast.sentTo", { email }));
      setEmail("");
    },
    onError: (err) => toast.error(t("share.toast.couldNotInvite"), errorMessage(err)),
  });

  const revokeMut = useMutation({
    mutationFn: (userId: string) => revokeMember(childId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members", childId] });
      toast.success(t("share.toast.removed"));
      setToRevoke(null);
    },
    onError: (err) => toast.error(t("share.toast.couldNotRemove"), errorMessage(err)),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    inviteMut.mutate();
  }

  const roleLabel = (r: string) => t(`share.roles.${r}`, { defaultValue: r });

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          {t("share.title", { name: activeChild?.name ?? "" })}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("share.subtitle")}</p>
      </header>

      {isOwner ? (
        <Card title={t("share.inviteSomeone")}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              label={t("share.email")}
              type="email"
              required
              placeholder={t("share.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Select
              label={t("share.role")}
              value={role}
              onValueChange={(v) => setRole(v as typeof role)}
              options={[
                { value: "editor", label: t("share.roleEditor") },
                { value: "viewer", label: t("share.roleViewer") },
              ]}
            />
            <Button type="submit" loading={inviteMut.isPending} className="w-full">
              {t("share.send")}
            </Button>
          </form>
          {lastInvite && (
            <div className="mt-4 rounded-xl bg-brand-50 p-3 text-sm text-brand-700 dark:bg-brand-900/30 dark:text-brand-200">
              <p className="font-semibold">{t("share.shareLink")}</p>
              <p className="mb-2 text-xs">
                {t("share.linkHelp", { email: email || t("share.emailPlaceholder") })}
              </p>
              <code className="block break-all rounded-lg bg-white p-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {`${window.location.origin}/invite?token=${lastInvite}`}
              </code>
            </div>
          )}
        </Card>
      ) : (
        <Card className="text-sm text-slate-500 dark:text-slate-400">
          {t("share.onlyOwner", { role: roleLabel(activeChild?.role ?? "") })}
        </Card>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {t("share.members", { count: members.length })}
        </h2>
        <ul className="space-y-2">
          {members.map((m) => (
            <li key={m.user_id}>
              <Card className="flex items-center gap-3 p-3.5">
                <Avatar name={m.name || m.email || "?"} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {m.name || m.email}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {m.name ? `${m.email} · ` : ""}
                    {t("share.joined", { date: fmt(m.invited_at, "MMM d, yyyy") })}
                  </p>
                </div>
                <span
                  className={
                    "chip " +
                    (m.role === "owner"
                      ? "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200"
                      : m.role === "editor"
                      ? "bg-mint-soft/50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300")
                  }
                >
                  {roleLabel(m.role)}
                </span>
                {isOwner && m.role !== "owner" && (
                  <button
                    onClick={() => setToRevoke(m)}
                    className="rounded-lg p-2 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500 dark:text-slate-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                    aria-label={t("share.removeMember")}
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
            <Card className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
              {t("share.noMembers")}
            </Card>
          )}
        </ul>
      </section>

      <Modal
        open={!!toRevoke}
        onOpenChange={(o) => !o && setToRevoke(null)}
        title={t("share.removeTitle")}
        description={toRevoke?.name || toRevoke?.email}
        footer={
          <>
            <Button variant="ghost" onClick={() => setToRevoke(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              loading={revokeMut.isPending}
              onClick={() => toRevoke && revokeMut.mutate(toRevoke.user_id)}
            >
              {t("common.remove")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {t("share.removeConfirm", { name: activeChild?.name ?? "" })}
        </p>
      </Modal>
    </div>
  );
}
