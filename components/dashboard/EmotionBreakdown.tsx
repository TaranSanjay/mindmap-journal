"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import type { JournalEntry } from "@/lib/types";
import { EMOTION_COLORS, EMOTION_LABELS } from "@/lib/utils";

interface Props {
  entries: Pick<JournalEntry, "created_at" | "emotion_scores">[];
}

export default function EmotionBreakdown({ entries }: Props) {
  const data = [...entries]
    .reverse()
    .slice(-14) // last 14 entries max
    .map((e) => ({
      date: format(parseISO(e.created_at), "MMM d"),
      joy: e.emotion_scores.joy,
      calm: e.emotion_scores.calm,
      sadness: e.emotion_scores.sadness,
      anxiety: e.emotion_scores.anxiety,
      anger: e.emotion_scores.anger,
    }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }} barSize={8}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeWidth={0.5} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontFamily: "DM Sans" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 10]}
          ticks={[0, 2, 4, 6, 8, 10]}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 12,
            fontSize: 12,
            fontFamily: "DM Sans",
          }}
          cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, fontFamily: "DM Sans", paddingTop: 12 }}
          formatter={(v) => EMOTION_LABELS[v as string] ?? v}
        />
        {(["joy", "calm", "sadness", "anxiety", "anger"] as const).map((key) => (
          <Bar key={key} dataKey={key} fill={EMOTION_COLORS[key]} radius={[2, 2, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
