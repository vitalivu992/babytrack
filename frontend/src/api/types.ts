// TypeScript interfaces mirroring the Go backend models (see backend/internal/models).

export type UUID = string;
export type ISODate = string; // RFC3339 / YYYY-MM-DD

export interface User {
  id: UUID;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export type Gender = "male" | "female" | "other" | "";

export interface Child {
  id: UUID;
  name: string;
  birth_date?: ISODate;
  gender: Gender;
  photo_url?: string;
  blood_type?: string;
  allergies?: string;
  notes?: string;
  owner_id: UUID;
  created_at: string;
  updated_at: string;
  /** The requesting user's role on this child. */
  role?: ShareRole;
}

export type ShareRole = "owner" | "editor" | "viewer";

export type LogType =
  | "feeding"
  | "diaper"
  | "sleep"
  | "measurement"
  | "medicine"
  | "other";

/** Free-form per-type payload stored in the JSONB `data` column. */
export interface LogData {
  [key: string]: unknown;
}

export interface ActivityLog {
  id: UUID;
  child_id: UUID;
  user_id: UUID;
  type: LogType;
  data?: LogData;
  timestamp: string;
  note?: string;
  created_at: string;
  logged_by_name?: string;
}

export interface CreateLogInput {
  type: LogType;
  data: LogData;
  timestamp?: string;
  note?: string;
}

export type MeasurementType = "weight" | "height" | "head_circumference";

export interface Measurement {
  id: UUID;
  child_id: UUID;
  type: MeasurementType;
  value: number;
  unit: string;
  measured_at: string;
  note?: string;
  created_at: string;
}

export interface MeasurementInput {
  type: MeasurementType;
  value: number;
  unit: string;
  measured_at: string; // YYYY-MM-DD
  note?: string;
}

export interface Vaccination {
  id: UUID;
  child_id: UUID;
  vaccine_name: string;
  scheduled_date: string;
  administered_date?: string;
  lot_number?: string;
  note?: string;
  created_at: string;
}

export interface AdministerVaccineInput {
  administered_date: string; // YYYY-MM-DD
  lot_number?: string;
  note?: string;
}

export interface Reminder {
  id: UUID;
  child_id: UUID;
  user_id: UUID;
  title: string;
  cron?: string;
  enabled: boolean;
  created_at: string;
}

export interface ReminderInput {
  title: string;
  cron?: string;
  enabled?: boolean;
}

export interface Invitation {
  id: UUID;
  child_id: UUID;
  email: string;
  role: ShareRole;
  token?: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
}

export interface ChildMember {
  child_id: UUID;
  user_id: UUID;
  role: ShareRole;
  invited_at: string;
  email?: string;
  name?: string;
}

// --- Insights ---

export interface DailySummary {
  date: string;
  feeding_count: number;
  diaper_count: number;
  sleep_count: number;
  sleep_minutes: number;
  feeding_ml: number;
  logs?: ActivityLog[];
}

export interface WeeklySummary {
  from: string;
  to: string;
  feeding_count: number;
  diaper_count: number;
  sleep_count: number;
  sleep_minutes: number;
  feeding_ml: number;
  days: DailySummary[];
}

export interface FeedingStats {
  from: string;
  to: string;
  total_count: number;
  total_ml: number;
  avg_per_day: number;
  by_subtype: Record<string, number>;
}

export interface SleepStats {
  from: string;
  to: string;
  total_count: number;
  total_minutes: number;
  avg_minutes_per_day: number;
  by_subtype: Record<string, number>;
}

export interface GrowthPoint {
  date: string;
  value: number;
}

export interface GrowthSeries {
  type: MeasurementType;
  unit: string;
  points: GrowthPoint[];
}

export interface LogQuery {
  type?: LogType;
  from?: string; // RFC3339
  to?: string; // RFC3339
  limit?: number;
}
