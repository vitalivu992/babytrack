import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GrowthSeries } from "../api/types";
import { ageInMonths, percentileTable, type MeasurementKind, type PercentileRow } from "../lib/who";

const KIND_LABEL: Record<MeasurementKind, string> = {
  weight: "Weight (kg)",
  height: "Length (cm)",
  head_circumference: "Head circ. (cm)",
};

const KIND_COLOR: Record<MeasurementKind, string> = {
  weight: "#8b5cf6",
  height: "#38bdf8",
  head_circumference: "#f472b6",
};

/** A growth chart: WHO percentile bands as a shaded area + the child's measured
 * points as a line. */
export function GrowthChart({
  kind,
  series,
  birthDate,
  gender,
}: {
  kind: MeasurementKind;
  series: GrowthSeries | undefined;
  birthDate?: string;
  gender: string;
}) {
  const table = useMemo(() => percentileTable(kind, gender), [kind, gender]);

  const data = useMemo(() => buildChartData(table, series, birthDate), [table, series, birthDate]);

  const color = KIND_COLOR[kind];
  const measured = (series?.points ?? []).filter((p) => birthDate && p.value > 0);

  return (
    <div className="card">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">{KIND_LABEL[kind]}</h3>
        {measured.length > 0 && (
          <span className="chip bg-brand-50 text-brand-600">
            Latest: {measured[measured.length - 1].value}
          </span>
        )}
      </div>
      {measured.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">
          No {KIND_LABEL[kind].toLowerCase()} measurements yet. Log one from the Measure tab.
        </p>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2ff" />
              <XAxis
                dataKey="month"
                type="number"
                domain={[0, "dataMax"]}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickFormatter={(m) => `${m}m`}
                stroke="#cbd5e1"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                stroke="#cbd5e1"
                width={48}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #ede9fe",
                  fontSize: 12,
                }}
                formatter={(value: number, name: string) => [`${value} ${unitFor(kind)}`, prettyName(name)]}
                labelFormatter={(m) => `Age: ${Math.round(Number(m))} months`}
              />
              {/* WHO bands: shade between p3–p97 with p50 line. */}
              <Area
                type="monotone"
                dataKey="p97"
                stroke="none"
                fill="#ede9fe"
                fillOpacity={0.4}
                name="97th"
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="p3"
                stroke="none"
                fill="#ffffff"
                fillOpacity={1}
                name="3rd"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="p50"
                stroke="#c4b5fd"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                name="50th"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="child"
                stroke={color}
                strokeWidth={3}
                dot={{ r: 4, fill: color }}
                name="Your child"
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="mt-2 flex items-center justify-center gap-3 text-[11px] text-slate-400">
        <LegendDot color={color} label="Your child" />
        <LegendDot color="#c4b5fd" label="WHO 50th" dashed />
        <LegendDot color="#ede9fe" label="3rd–97th band" />
      </div>
    </div>
  );
}

function buildChartData(
  table: PercentileRow[],
  series: GrowthSeries | undefined,
  birthDate?: string,
) {
  if (!birthDate) return table.map((r) => ({ ...r, child: null }));
  const measured = (series?.points ?? [])
    .map((p) => ({
      month: round1(ageInMonths(birthDate, p.date)),
      child: p.value,
    }))
    .filter((p) => p.month >= 0);

  // Merge WHO rows with the child's measurement months.
  const byMonth = new Map<number, { month: number; p3: number; p50: number; p97: number; child: number | null }>();
  for (const row of table) {
    byMonth.set(row.month, { month: row.month, p3: row.p3, p50: row.p50, p97: row.p97, child: null });
  }
  for (const m of measured) {
    const existing = byMonth.get(m.month);
    if (existing) existing.child = m.child;
    else byMonth.set(m.month, { month: m.month, p3: NaN, p50: NaN, p97: NaN, child: m.child });
  }
  return [...byMonth.values()].sort((a, b) => a.month - b.month);
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const unitFor = (k: MeasurementKind) => (k === "weight" ? "kg" : "cm");
const prettyName = (name: string) =>
  name === "child" ? "Your child" : name === "p50" ? "WHO 50th" : `WHO ${name}`;

function LegendDot({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-block h-2 w-4 rounded-full"
        style={dashed ? { background: `repeating-linear-gradient(90deg, ${color} 0 4px, transparent 4px 8px)` } : { background: color }}
      />
      {label}
    </span>
  );
}
