import { api } from "./client";
import type { Child, ChildMember, Invitation, ShareRole } from "./types";

export interface InviteInput {
  email: string;
  role: Exclude<ShareRole, "owner">;
}

export async function invite(childId: string, input: InviteInput): Promise<Invitation> {
  const res = await api.post<Invitation>(`/children/${childId}/invitations`, input);
  return res.data;
}

export async function listMembers(childId: string): Promise<ChildMember[]> {
  const res = await api.get<ChildMember[]>(`/children/${childId}/members`);
  return res.data ?? [];
}

export async function revokeMember(childId: string, userId: string): Promise<void> {
  await api.delete(`/children/${childId}/members/${userId}`);
}

/** Accept a share invitation by token (must match the user's email). */
export async function acceptInvitation(token: string): Promise<Child> {
  const res = await api.post<Child>("/invitations/accept", { token });
  return res.data;
}
