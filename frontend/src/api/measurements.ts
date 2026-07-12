import { api } from "./client";
import type { Measurement, MeasurementInput, MeasurementType } from "./types";

export async function listMeasurements(
  childId: string,
  type?: MeasurementType,
): Promise<Measurement[]> {
  const res = await api.get<Measurement[]>(`/children/${childId}/measurements`, {
    params: type ? { type } : {},
  });
  return res.data ?? [];
}

export async function createMeasurement(
  childId: string,
  input: MeasurementInput,
): Promise<Measurement> {
  const res = await api.post<Measurement>(`/children/${childId}/measurements`, input);
  return res.data;
}

export async function updateMeasurement(
  childId: string,
  id: string,
  input: MeasurementInput,
): Promise<Measurement> {
  const res = await api.patch<Measurement>(`/children/${childId}/measurements/${id}`, input);
  return res.data;
}

export async function deleteMeasurement(childId: string, id: string): Promise<void> {
  await api.delete(`/children/${childId}/measurements/${id}`);
}
