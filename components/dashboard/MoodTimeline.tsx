"use client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";
import type { JournalEntry } from "@/lib/types";
import { scoreColor } from "@/lib/utils";

interface Props {
  entries: Pick<JournalEntry, "created_at" | "composite_score">[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const score = payload[0].value as number;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-sm text-xs font-body">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-mono font-medium mt-0.5" style={{ color: scoreColor(score) }}>
        {score.toFixed(1)} / 10
      </p>
    </div>
  );
}

export default function MoodTimeline({ entries }: Props) {
  const data = [...entries]
    .reverse()
    .map((e) => ({
      date: format(parseISO(e.created_at), "MMM d"),
      score: e.composite_score,
    }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeWidth={0.5} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontFamily: "DM Sans" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[1, 10]}
          ticks={[1, 3, 5, 7, 10]}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontFamily: "JetBrains Mono" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={5} stroke="hsl(var(--border))" strokeDasharray="4 4" strokeWidth={0.8} />
        <Line
          type="monotone"
          dataKey="score"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ r: 3, fill: "hsl(var(--primary))", strokeWidth: 0 }}
          activeDot={{ r: 5, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
