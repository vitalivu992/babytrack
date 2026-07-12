import { api } from "./client";
import type { Child, Gender } from "./types";

export interface ChildInput {
  name: string;
  birth_date?: string;
  gender?: Gender;
  photo_url?: string;
  blood_type?: string;
  allergies?: string;
  notes?: string;
}

export type ChildUpdate = Partial<ChildInput>;

export async function listChildren(): Promise<Child[]> {
  const res = await api.get<Child[]>("/children");
  return res.data ?? [];
}

export async function getChild(id: string): Promise<Child> {
  const res = await api.get<Child>(`/children/${id}`);
  return res.data;
}

export async function createChild(input: ChildInput): Promise<Child> {
  const res = await api.post<Child>("/children", input);
  return res.data;
}

export async function updateChild(id: string, input: ChildUpdate): Promise<Child> {
  const res = await api.patch<Child>(`/children/${id}`, input);
  return res.data;
}

export async function deleteChild(id: string): Promise<void> {
  await api.delete(`/children/${id}`);
}
