import { api } from "./client";
import type { ActivityLog, CreateLogInput, LogQuery, UpdateLogInput } from "./types";

export async function listLogs(childId: string, query: LogQuery = {}): Promise<ActivityLog[]> {
  const res = await api.get<ActivityLog[]>(`/children/${childId}/logs`, { params: query });
  return res.data ?? [];
}

export async function createLog(childId: string, input: CreateLogInput): Promise<ActivityLog> {
  const res = await api.post<ActivityLog>(`/children/${childId}/logs`, input);
  return res.data;
}

export async function deleteLog(childId: string, logId: string): Promise<void> {
  await api.delete(`/children/${childId}/logs/${logId}`);
}

export async function updateLog(childId: string, logId: string, input: UpdateLogInput): Promise<ActivityLog> {
  const res = await api.patch<ActivityLog>(`/children/${childId}/logs/${logId}`, input);
  return res.data;
}
