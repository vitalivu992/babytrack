import { api } from "./client";
import type { Reminder, ReminderInput } from "./types";

export async function listReminders(childId: string): Promise<Reminder[]> {
  const res = await api.get<Reminder[]>(`/children/${childId}/reminders`);
  return res.data ?? [];
}

export async function createReminder(childId: string, input: ReminderInput): Promise<Reminder> {
  const res = await api.post<Reminder>(`/children/${childId}/reminders`, input);
  return res.data;
}

export async function updateReminder(
  childId: string,
  id: string,
  input: ReminderInput,
): Promise<Reminder> {
  const res = await api.patch<Reminder>(`/children/${childId}/reminders/${id}`, input);
  return res.data;
}

export async function deleteReminder(childId: string, id: string): Promise<void> {
  await api.delete(`/children/${childId}/reminders/${id}`);
}
