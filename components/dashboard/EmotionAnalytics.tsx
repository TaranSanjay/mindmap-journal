"use client";
import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  AreaChart, Area,
} from "recharts";
import { format, parseISO, subDays, isAfter } from "date-fns";
import type { JournalEntry, EmotionKey } from "@/lib/types";
import { EMOTION_COLORS, EMOTION_LABELS } from "@/lib/utils";

const dark = { card: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.08)" };

const EMOTIONS: EmotionKey[] = ["joy", "calm", "sadness", "anxiety", "anger"];
const RANGES = [
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
  { label: "All", days: 0 },
];
const CHARTS = [
  { id: "bar",   label: "Bar" },
  { id: "line",  label: "Line" },
  { id: "area",  label: "Area" },
  { id: "radar", label: "Radar" },
];

const tooltipStyle = {
  background: "#1a1a1f",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10,
  fontSize: 11,
  fontFamily: "DM Sans",
  color: "rgba(255,255,255,0.85)",
};

const axisStyle = { fontSize: 10, fill: "rgba(255,255,255,0.3)", fontFamily: "DM Sans" };

interface Props {
  entries: Pick<JournalEntry, "created_at" | "emotion_scores">[];
}

export default function EmotionAnalytics({ entries }: Props) {
  const [chart, setChart] = useState("bar");
  const [range, setRange] = useState(14);

  const filtered = useMemo(() => {
    const sorted = [...entries].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    if (range === 0) return sorted;
    const cutoff = subDays(new Date(), range);
    return sorted.filter(e => isAfter(parseISO(e.created_at), cutoff));
  }, [entries, range]);

  const timeData = filtered.map(e => ({
    date: format(parseISO(e.created_at), "MMM d"),
    joy:     e.emotion_scores.joy,
    calm:    e.emotion_scores.calm,
    sadness: e.emotion_scores.sadness,
    anxiety: e.emotion_scores.anxiety,
    anger:   e.emotion_scores.anger,
  }));

  // Averages for radar
  const avgData = EMOTIONS.map(k => ({
    subject: EMOTION_LABELS[k],
    value: filtered.length
      ? Math.round((filtered.reduce((s, e) => s + e.emotion_scores[k], 0) / filtered.length) * 10) / 10
      : 0,
    color: EMOTION_COLORS[k],
  }));

  return (
    <div className="rounded-2xl border p-6 space-y-4" style={{ background: dark.card, borderColor: dark.border }}>
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display text-lg font-semibold text-white">Emotion analytics</h2>

        <div className="flex items-center gap-2">
          {/* Date range pills */}
          <div className="flex items-center gap-1 rounded-lg p-0.5 border" style={{ background: "rgba(255,255,255,0.02)", borderColor: dark.border }}>
            {RANGES.map(r => (
              <button key={r.label} onClick={() => setRange(r.days)}
                className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                style={{
                  background: range === r.days ? "rgba(139,92,246,0.25)" : "transparent",
                  color: range === r.days ? "#a78bfa" : "rgba(255,255,255,0.35)",
                  border: range === r.days ? "1px solid rgba(139,92,246,0.4)" : "1px solid transparent",
                }}>
                {r.label}
              </button>
            ))}
          </div>

          {/* Chart type pills */}
          <div className="flex items-center gap-1 rounded-lg p-0.5 border" style={{ background: "rgba(255,255,255,0.02)", borderColor: dark.border }}>
            {CHARTS.map(c => (
              <button key={c.id} onClick={() => setChart(c.id)}
                className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                style={{
                  background: chart === c.id ? "rgba(255,255,255,0.07)" : "transparent",
                  color: chart === c.id ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)",
                  border: chart === c.id ? "1px solid rgba(255,255,255,0.12)" : "1px solid transparent",
                }}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Entry count */}
      <p className="text-xs text-white/25">
        {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
        {range > 0 ? ` in the last ${range} days` : " total"}
      </p>

      {/* Chart area */}
      {filtered.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-white/20 text-sm">
          No entries in this range
        </div>
      ) : (
        <div style={{ height: 240 }}>

          {/* ── Bar chart ── */}
          {chart === "bar" && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeData} margin={{ top: 4, right: 4, bottom: 0, left: -22 }} barSize={6} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} vertical={false} />
                <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={axisStyle} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                {EMOTIONS.map(k => (
                  <Bar key={k} dataKey={k} name={EMOTION_LABELS[k]} fill={EMOTION_COLORS[k]} radius={[2, 2, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* ── Line chart ── */}
          {chart === "line" && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeData} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} vertical={false} />
                <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={axisStyle} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                {EMOTIONS.map(k => (
                  <Line key={k} type="monotone" dataKey={k} name={EMOTION_LABELS[k]}
                    stroke={EMOTION_COLORS[k]} strokeWidth={2} dot={{ r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 4, strokeWidth: 0 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}

          {/* ── Area chart ── */}
          {chart === "area" && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeData} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} vertical={false} />
                <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={axisStyle} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                {EMOTIONS.map(k => (
                  <Area key={k} type="monotone" dataKey={k} name={EMOTION_LABELS[k]}
                    stroke={EMOTION_COLORS[k]} fill={EMOTION_COLORS[k]}
                    fillOpacity={0.08} strokeWidth={1.5} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}

          {/* ── Radar chart ── */}
          {chart === "radar" && (
            <div className="flex gap-6 h-full items-center">
              <ResponsiveContainer width="60%" height="100%">
                <RadarChart data={avgData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="subject"
                    tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)", fontFamily: "DM Sans" }} />
                  <Radar name="Avg" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} strokeWidth={1.5} />
                  <Tooltip contentStyle={tooltipStyle} />
                </RadarChart>
              </ResponsiveContainer>

              {/* Avg scores list */}
              <div className="flex-1 space-y-2.5">
                <p className="text-xs text-white/30 uppercase tracking-wider mb-3">Averages</p>
                {avgData.map(d => (
                  <div key={d.subject} className="flex items-center gap-2">
                    <span className="text-xs text-white/40 w-14">{d.subject}</span>
                    <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full" style={{ width: `${d.value * 10}%`, background: d.color }} />
                    </div>
                    <span className="text-xs font-mono w-6 text-right" style={{ color: d.color }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Emotion legend (for non-radar charts) */}
      {chart !== "radar" && (
        <div className="flex flex-wrap gap-3 pt-1">
          {EMOTIONS.map(k => (
            <div key={k} className="flex items-center gap-1.5 text-xs text-white/40">
              <span className="w-2 h-2 rounded-full" style={{ background: EMOTION_COLORS[k] }} />
              {EMOTION_LABELS[k]}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
