import { api } from "./client";
import type { AdministerVaccineInput, Vaccination } from "./types";

export async function listVaccinations(childId: string): Promise<Vaccination[]> {
  const res = await api.get<Vaccination[]>(`/children/${childId}/vaccinations`);
  return res.data ?? [];
}

export async function upcomingVaccinations(childId: string, limit = 10): Promise<Vaccination[]> {
  const res = await api.get<Vaccination[]>(`/children/${childId}/vaccinations/upcoming`, {
    params: { limit },
  });
  return res.data ?? [];
}

/** Generates the WHO schedule if none exists yet (viewer+ endpoint). */
export async function ensureSchedule(childId: string): Promise<Vaccination[]> {
  const res = await api.get<Vaccination[]>(`/children/${childId}/vaccinations/ensure`);
  return res.data ?? [];
}

/** Regenerates the full schedule from the child's birth date (editor+). */
export async function generateSchedule(childId: string): Promise<Vaccination[]> {
  const res = await api.post<Vaccination[]>(`/children/${childId}/vaccinations/schedule`);
  return res.data ?? [];
}

export async function markAdministered(
  childId: string,
  id: string,
  input: AdministerVaccineInput,
): Promise<Vaccination> {
  const res = await api.patch<Vaccination>(`/children/${childId}/vaccinations/${id}`, input);
  return res.data;
}

export async function deleteVaccination(childId: string, id: string): Promise<void> {
  await api.delete(`/children/${childId}/vaccinations/${id}`);
}
