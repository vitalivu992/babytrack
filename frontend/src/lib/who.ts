// Approximate WHO growth reference data (weight-for-age, length-for-age, head
// circumference-for-age), 3rd/15th/50th/85th/97th percentiles by age in
// months. Values are rounded interpolations of the published WHO tables —
// suitable for approximate percentile bands on a chart, not clinical use.

export interface PercentileRow {
  month: number;
  p3: number;
  p15: number;
  p50: number;
  p85: number;
  p97: number;
}

// Weight (kg), boys 0–24 months (interpolated, approximate).
const WEIGHT_BOYS: PercentileRow[] = [
  { month: 0, p3: 2.5, p15: 2.9, p50: 3.3, p85: 3.8, p97: 4.4 },
  { month: 1, p3: 3.4, p15: 3.9, p50: 4.5, p85: 5.1, p97: 5.8 },
  { month: 2, p3: 4.4, p15: 4.9, p50: 5.6, p85: 6.3, p97: 7.1 },
  { month: 3, p3: 5.1, p15: 5.6, p50: 6.4, p85: 7.2, p97: 8.0 },
  { month: 4, p3: 5.6, p15: 6.2, p50: 7.0, p85: 7.8, p97: 8.7 },
  { month: 5, p3: 6.0, p15: 6.7, p50: 7.5, p85: 8.4, p97: 9.3 },
  { month: 6, p3: 6.4, p15: 7.1, p50: 7.9, p85: 8.8, p97: 9.8 },
  { month: 9, p3: 7.1, p15: 7.9, p50: 8.9, p85: 9.9, p97: 11.0 },
  { month: 12, p3: 7.7, p15: 8.6, p50: 9.6, p85: 10.8, p97: 12.0 },
  { month: 15, p3: 8.3, p15: 9.2, p50: 10.3, p85: 11.5, p97: 12.8 },
  { month: 18, p3: 8.8, p15: 9.8, p50: 10.9, p85: 12.2, p97: 13.5 },
  { month: 24, p3: 9.7, p15: 10.8, p50: 12.2, p85: 13.6, p97: 15.0 },
];

// Weight (kg), girls 0–24 months.
const WEIGHT_GIRLS: PercentileRow[] = [
  { month: 0, p3: 2.4, p15: 2.8, p50: 3.2, p85: 3.7, p97: 4.2 },
  { month: 1, p3: 3.2, p15: 3.6, p50: 4.2, p85: 4.8, p97: 5.5 },
  { month: 2, p3: 4.0, p15: 4.5, p50: 5.1, p85: 5.8, p97: 6.6 },
  { month: 3, p3: 4.6, p15: 5.2, p50: 5.8, p85: 6.6, p97: 7.5 },
  { month: 4, p3: 5.1, p15: 5.7, p50: 6.4, p85: 7.3, p97: 8.2 },
  { month: 5, p3: 5.5, p15: 6.1, p50: 6.9, p85: 7.8, p97: 8.8 },
  { month: 6, p3: 5.8, p15: 6.5, p50: 7.3, p85: 8.2, p97: 9.3 },
  { month: 9, p3: 6.3, p15: 7.1, p50: 8.0, p85: 9.0, p97: 10.1 },
  { month: 12, p3: 7.1, p15: 7.9, p50: 8.9, p85: 10.0, p97: 11.2 },
  { month: 15, p3: 7.6, p15: 8.5, p50: 9.6, p85: 10.9, p97: 12.4 },
  { month: 18, p3: 8.1, p15: 9.1, p50: 10.2, p85: 11.6, p97: 13.0 },
  { month: 24, p3: 9.0, p15: 10.0, p50: 11.5, p85: 13.0, p97: 14.8 },
];

// Length/height (cm), boys 0–24 months.
const HEIGHT_BOYS: PercentileRow[] = [
  { month: 0, p3: 46.1, p15: 47.6, p50: 49.9, p85: 52.1, p97: 54.2 },
  { month: 1, p3: 50.8, p15: 52.4, p50: 54.7, p85: 57.1, p97: 59.5 },
  { month: 2, p3: 54.4, p15: 56.0, p50: 58.4, p85: 60.8, p97: 63.2 },
  { month: 3, p3: 57.3, p15: 58.9, p50: 61.4, p85: 63.9, p97: 66.3 },
  { month: 4, p3: 59.7, p15: 61.3, p50: 63.9, p85: 66.4, p97: 68.9 },
  { month: 6, p3: 63.3, p15: 65.0, p50: 67.6, p85: 70.2, p97: 72.8 },
  { month: 9, p3: 67.5, p15: 69.3, p50: 72.0, p85: 74.7, p97: 77.4 },
  { month: 12, p3: 71.0, p15: 72.9, p50: 75.7, p85: 78.6, p97: 81.5 },
  { month: 18, p3: 76.9, p15: 79.0, p50: 82.3, p85: 85.6, p97: 88.9 },
  { month: 24, p3: 81.7, p15: 84.0, p50: 87.1, p85: 90.3, p97: 93.5 },
];

// Length/height (cm), girls 0–24 months.
const HEIGHT_GIRLS: PercentileRow[] = [
  { month: 0, p3: 45.4, p15: 47.0, p50: 49.1, p85: 51.3, p97: 53.5 },
  { month: 1, p3: 49.8, p15: 51.4, p50: 53.7, p85: 56.0, p97: 58.4 },
  { month: 2, p3: 53.0, p15: 54.7, p50: 57.1, p85: 59.5, p97: 62.0 },
  { month: 3, p3: 55.6, p15: 57.3, p50: 59.8, p85: 62.3, p97: 64.8 },
  { month: 4, p3: 57.8, p15: 59.5, p50: 62.1, p85: 64.7, p97: 67.3 },
  { month: 6, p3: 61.2, p15: 63.0, p50: 65.7, p85: 68.4, p97: 71.1 },
  { month: 9, p3: 65.3, p15: 67.1, p50: 70.1, p85: 73.0, p97: 75.9 },
  { month: 12, p3: 68.9, p15: 70.8, p50: 74.0, p85: 77.1, p97: 80.2 },
  { month: 18, p3: 74.9, p15: 77.0, p50: 80.7, p85: 84.4, p97: 88.1 },
  { month: 24, p3: 80.0, p15: 82.3, p50: 86.4, p85: 90.5, p97: 94.6 }, // approximate
];

// Head circumference (cm), boys 0–24 months.
const HEAD_BOYS: PercentileRow[] = [
  { month: 0, p3: 32.4, p15: 33.4, p50: 34.5, p85: 35.6, p97: 36.6 },
  { month: 1, p3: 35.2, p15: 36.2, p50: 37.3, p85: 38.4, p97: 39.5 },
  { month: 2, p3: 37.0, p15: 38.0, p50: 39.1, p85: 40.3, p97: 41.5 },
  { month: 3, p3: 38.1, p15: 39.2, p50: 40.5, p85: 41.7, p97: 42.9 },
  { month: 6, p3: 41.0, p15: 42.1, p50: 43.3, p85: 44.6, p97: 45.8 },
  { month: 12, p3: 43.5, p15: 44.7, p50: 46.1, p85: 47.4, p97: 48.7 },
  { month: 18, p3: 45.2, p15: 46.4, p50: 47.8, p85: 49.2, p97: 50.6 },
  { month: 24, p3: 46.5, p15: 47.7, p50: 49.2, p85: 50.6, p97: 52.0 },
];

// Head circumference (cm), girls 0–24 months.
const HEAD_GIRLS: PercentileRow[] = [
  { month: 0, p3: 31.9, p15: 32.9, p50: 33.9, p85: 34.9, p97: 36.0 },
  { month: 1, p3: 34.6, p15: 35.6, p50: 36.6, p85: 37.6, p97: 38.7 },
  { month: 2, p3: 36.3, p15: 37.3, p50: 38.4, p85: 39.5, p97: 40.5 },
  { month: 3, p3: 37.7, p15: 38.7, p50: 39.9, p85: 41.1, p97: 42.2 },
  { month: 6, p3: 39.8, p15: 40.9, p50: 42.2, p85: 43.4, p97: 44.6 },
  { month: 12, p3: 42.2, p15: 43.4, p50: 44.7, p85: 46.0, p97: 47.3 },
  { month: 18, p3: 43.8, p15: 45.0, p50: 46.4, p85: 47.8, p97: 49.1 },
  { month: 24, p3: 45.0, p15: 46.3, p50: 47.8, p85: 49.3, p97: 50.7 },
];

export type MeasurementKind = "weight" | "height" | "head_circumference";

export function percentileTable(
  kind: MeasurementKind,
  gender: string,
): PercentileRow[] {
  const isGirl = gender === "female";
  switch (kind) {
    case "weight":
      return isGirl ? WEIGHT_GIRLS : WEIGHT_BOYS;
    case "height":
      return isGirl ? HEIGHT_GIRLS : HEIGHT_BOYS;
    case "head_circumference":
      return isGirl ? HEAD_GIRLS : HEAD_BOYS;
  }
}

/** Months between a birth date and a given date. */
export function ageInMonths(birth: string | Date, at: string | Date = new Date()): number {
  const b = new Date(birth);
  const a = new Date(at);
  return (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth());
}
