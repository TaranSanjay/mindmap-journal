"use client";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import type { EmotionScores } from "@/lib/types";
import { EMOTION_COLORS } from "@/lib/utils";

interface Props {
  scores: EmotionScores;
  size?: number;
}

export default function EmotionRadarChart({ scores, size = 200 }: Props) {
  const data = [
    { subject: "Joy", value: scores.joy, fill: EMOTION_COLORS.joy },
    { subject: "Calm", value: scores.calm, fill: EMOTION_COLORS.calm },
    { subject: "Sadness", value: scores.sadness, fill: EMOTION_COLORS.sadness },
    { subject: "Anxiety", value: scores.anxiety, fill: EMOTION_COLORS.anxiety },
    { subject: "Anger", value: scores.anger, fill: EMOTION_COLORS.anger },
  ];

  return (
    <div style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <PolarGrid stroke="hsl(var(--border))" strokeWidth={0.5} />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))", fontFamily: "var(--font-mono)" }}
          />
          <Radar
            name="Emotions"
            dataKey="value"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.15}
            strokeWidth={1.5}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
