"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PenLine, LogOut, TrendingUp, Flame, Brain, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import MoodTimeline from "@/components/dashboard/MoodTimeline";
import EmotionBreakdown from "@/components/dashboard/EmotionBreakdown";
import EmotionRadarChart from "@/components/dashboard/EmotionRadar";
import type { JournalEntry, EmotionScores, EmotionKey } from "@/lib/types";
import { EMOTION_COLORS, EMOTION_LABELS, scoreLabel, scoreColor } from "@/lib/utils";
import { format, parseISO, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday, addMonths, subMonths } from "date-fns";

const dark = { bg: "#0f0f11", card: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.08)" };

// ── Consistency Calendar ───────────────────────────────────────
function ConsistencyCalendar({ entries }: { entries: Pick<JournalEntry, "id" | "created_at" | "composite_score">[] }) {
  const [viewDate, setViewDate] = useState(new Date());

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Map date string → entries that day
  const entryMap = new Map<string, typeof entries[0][]>();
  entries.forEach(e => {
    const key = format(parseISO(e.created_at), "yyyy-MM-dd");
    if (!entryMap.has(key)) entryMap.set(key, []);
    entryMap.get(key)!.push(e);
  });

  // Days of week header
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Padding before first day
  const startPad = monthStart.getDay();

  // Compute longest streak in current month
  let maxStreak = 0, cur = 0;
  days.forEach(d => {
    const key = format(d, "yyyy-MM-dd");
    if (entryMap.has(key)) { cur++; maxStreak = Math.max(maxStreak, cur); } else cur = 0;
  });

  const daysWithEntry = days.filter(d => entryMap.has(format(d, "yyyy-MM-dd"))).length;

  return (
    <div className="rounded-2xl border p-6 space-y-5" style={{ background: dark.card, borderColor: dark.border }}>
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-white">{format(viewDate, "MMMM yyyy")}</h2>
          <p className="text-xs text-white/30 mt-0.5">{daysWithEntry} of {days.length} days journalled</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setViewDate(v => subMonths(v, 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.05] transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setViewDate(new Date())}
            className="px-3 h-8 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/[0.05] transition-colors">
            Today
          </button>
          <button onClick={() => setViewDate(v => addMonths(v, 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.05] transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1">
        {weekdays.map(d => (
          <div key={d} className="text-center text-xs text-white/20 font-medium py-1">{d}</div>
        ))}

        {/* Padding cells */}
        {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}

        {/* Day cells */}
        {days.map(day => {
          const key = format(day, "yyyy-MM-dd");
          const dayEntries = entryMap.get(key) ?? [];
          const hasEntry = dayEntries.length > 0;
          const avgScore = hasEntry
            ? dayEntries.reduce((s, e) => s + e.composite_score, 0) / dayEntries.length
            : null;
          const color = avgScore ? scoreColor(avgScore) : null;
          const today = isToday(day);

          return (
            <Link
              key={key}
              href={hasEntry && dayEntries[0] ? `/entries/${dayEntries[0].id}` : "#"}
              className={`relative flex flex-col items-center justify-center rounded-xl aspect-square transition-all ${hasEntry ? "cursor-pointer hover:scale-105" : "cursor-default"}`}
              style={{
                background: hasEntry ? `${color}18` : "transparent",
                border: today ? `1px solid rgba(139,92,246,0.6)` : hasEntry ? `1px solid ${color}30` : "1px solid transparent",
              }}
            >
              <span className={`text-sm font-medium ${today ? "text-purple-400" : hasEntry ? "text-white" : "text-white/20"}`}>
                {format(day, "d")}
              </span>
              {hasEntry && (
                <div className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ background: color! }} />
              )}
              {hasEntry && avgScore && (
                <span className="text-[9px] font-mono" style={{ color: color! }}>{avgScore.toFixed(1)}</span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Month stats row */}
      <div className="grid grid-cols-3 gap-3 pt-1">
        {[
          { label: "Days journalled", value: `${daysWithEntry}`, sub: `of ${days.length} days` },
          { label: "Completion rate", value: `${Math.round((daysWithEntry / days.length) * 100)}%`, sub: "this month" },
          { label: "Best streak", value: `${maxStreak}d`, sub: "this month" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-3 text-center border" style={{ background: "rgba(255,255,255,0.02)", borderColor: dark.border }}>
            <p className="text-xl font-display font-semibold text-white">{s.value}</p>
            <p className="text-xs text-white/30 mt-0.5">{s.label}</p>
            <p className="text-[10px] text-white/20">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-white/30 pt-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(139,92,246,0.6)" }} />
          <span>Today</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }} />
          <span>Entry logged · colour = mood score</span>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-2xl p-5 space-y-3 border" style={{ background: dark.card, borderColor: dark.border }}>
      <div className="flex items-center gap-2 text-white/30">
        <Icon size={15} /><span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <p className="font-display text-3xl font-semibold text-white" style={color ? { color } : undefined}>{value}</p>
      {sub && <p className="text-xs text-white/30">{sub}</p>}
    </div>
  );
}

function computeStreak(entries: Pick<JournalEntry, "created_at">[]): number {
  if (!entries.length) return 0;
  const unique = Array.from(new Set(entries.map(e => format(parseISO(e.created_at), "yyyy-MM-dd")))).sort().reverse();
  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    if (differenceInDays(parseISO(unique[i - 1]), parseISO(unique[i])) === 1) streak++;
    else break;
  }
  return streak;
}

function computeLongestStreak(entries: Pick<JournalEntry, "created_at">[]): number {
  if (!entries.length) return 0;
  const unique = Array.from(new Set(entries.map(e => format(parseISO(e.created_at), "yyyy-MM-dd")))).sort();
  let best = 1, cur = 1;
  for (let i = 1; i < unique.length; i++) {
    if (differenceInDays(parseISO(unique[i]), parseISO(unique[i - 1])) === 1) { cur++; best = Math.max(best, cur); }
    else cur = 1;
  }
  return best;
}

function dominantEmotion(entries: Pick<JournalEntry, "emotion_scores">[]): EmotionKey | null {
  if (!entries.length) return null;
  const totals: Record<EmotionKey, number> = { joy: 0, calm: 0, sadness: 0, anxiety: 0, anger: 0 };
  for (const e of entries) for (const k of Object.keys(totals) as EmotionKey[]) totals[k] += e.emotion_scores[k];
  return Object.entries(totals).sort((a, b) => b[1] - a[1])[0][0] as EmotionKey;
}

function avgScores(entries: Pick<JournalEntry, "emotion_scores">[]): EmotionScores {
  if (!entries.length) return { joy: 5, calm: 5, sadness: 5, anxiety: 5, anger: 5 };
  const totals: EmotionScores = { joy: 0, calm: 0, sadness: 0, anxiety: 0, anger: 0 };
  for (const e of entries) for (const k of Object.keys(totals) as EmotionKey[]) totals[k] += e.emotion_scores[k];
  const n = entries.length;
  return Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, Math.round((v / n) * 10) / 10])) as unknown as EmotionScores;
}

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

// ── Page ───────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/entries?limit=365")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setEntries(d.entries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const avgComposite = entries.length
    ? Math.round((entries.reduce((s, e) => s + e.composite_score, 0) / entries.length) * 10) / 10
    : null;
  const streak = computeStreak(entries);
  const longestStreak = computeLongestStreak(entries);
  const dominant = dominantEmotion(entries);
  const averages = avgScores(entries);

  return (
    <div className="min-h-screen" style={{ background: dark.bg }}>
      <div className="pointer-events-none fixed inset-0"
        style={{ background: "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(99,66,199,0.1) 0%, transparent 60%)" }} />

      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-6 py-4 border-b backdrop-blur-md"
        style={{ background: "rgba(15,15,17,0.9)", borderColor: dark.border }}>
        <Link href="/" className="font-display text-lg font-semibold text-white">
          Mind<span style={{ color: "#8b5cf6" }}>Map</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/journal"
            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg text-white transition-opacity hover:opacity-90"
            style={{ background: "#8b5cf6" }}>
            <PenLine size={14} /> New entry
          </Link>
          <button onClick={handleLogout} className="text-sm text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8 relative z-10">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-white">Your emotional landscape</h1>
          <p className="text-white/30 text-sm mt-1">{entries.length} {entries.length === 1 ? "entry" : "entries"} recorded</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-white/30 text-sm">Loading your journal…</div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
            <Brain size={40} className="text-white/20" />
            <p className="text-white/30">No entries yet.</p>
            <Link href="/journal" className="text-sm px-5 py-2.5 rounded-xl text-white hover:opacity-90 transition-opacity" style={{ background: "#8b5cf6" }}>
              Write your first entry
            </Link>
          </div>
        ) : (
          <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">

            {/* ── Calendar — first thing you see ── */}
            <motion.div variants={fadeUp}>
              <ConsistencyCalendar entries={entries} />
            </motion.div>

            {/* ── Consistency stat strip ── */}
            <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={Flame} label="Current streak" value={`${streak}d`} sub="consecutive days" color={streak >= 7 ? "#10B981" : streak >= 3 ? "#F59E0B" : undefined} />
              <StatCard icon={Star} label="Longest streak" value={`${longestStreak}d`} sub="all time" />
              <StatCard icon={TrendingUp} label="Avg score" value={avgComposite ? `${avgComposite}` : "—"}
                sub={avgComposite ? scoreLabel(avgComposite) : undefined} color={avgComposite ? scoreColor(avgComposite) : undefined} />
              <StatCard icon={Brain} label="Dominant emotion" value={dominant ? EMOTION_LABELS[dominant] : "—"}
                color={dominant ? EMOTION_COLORS[dominant] : undefined} />
            </motion.div>

            {/* ── Mood timeline ── */}
            <motion.div variants={fadeUp} className="rounded-2xl p-6 space-y-3 border" style={{ background: dark.card, borderColor: dark.border }}>
              <h2 className="font-display text-lg font-semibold text-white">Mood over time</h2>
              <MoodTimeline entries={entries} />
            </motion.div>

            {/* ── Emotion breakdown + radar ── */}
            <motion.div variants={fadeUp} className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2 rounded-2xl p-6 space-y-3 border" style={{ background: dark.card, borderColor: dark.border }}>
                <h2 className="font-display text-lg font-semibold text-white">Emotion breakdown</h2>
                <EmotionBreakdown entries={entries} />
              </div>
              <div className="rounded-2xl p-6 flex flex-col items-center justify-center space-y-4 border" style={{ background: dark.card, borderColor: dark.border }}>
                <h2 className="font-display text-lg font-semibold text-white self-start">Avg emotions</h2>
                <EmotionRadarChart scores={averages} size={160} />
                <div className="w-full space-y-1.5">
                  {(Object.keys(averages) as EmotionKey[]).map(k => (
                    <div key={k} className="flex items-center justify-between text-xs">
                      <span className="text-white/40">{EMOTION_LABELS[k]}</span>
                      <span className="font-mono font-medium" style={{ color: EMOTION_COLORS[k] }}>{averages[k]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* ── Recent entries ── */}
            <motion.div variants={fadeUp} className="rounded-2xl p-6 space-y-3 border" style={{ background: dark.card, borderColor: dark.border }}>
              <h2 className="font-display text-lg font-semibold text-white">Recent entries</h2>
              <div className="space-y-1">
                {entries.slice(0, 10).map(e => {
                  const color = scoreColor(e.composite_score);
                  return (
                    <Link key={e.id} href={`/entries/${e.id}`}
                      className="flex items-center justify-between py-2.5 border-b last:border-0 hover:bg-white/[0.02] rounded-lg px-2 -mx-2 transition-colors"
                      style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                      <span className="text-sm text-white/40">{format(parseISO(e.created_at), "EEEE, MMM d")}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-medium" style={{ color }}>{e.composite_score.toFixed(1)}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${color}18`, color }}>{scoreLabel(e.composite_score)}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </motion.div>

          </motion.div>
        )}
      </main>
    </div>
  );
}
