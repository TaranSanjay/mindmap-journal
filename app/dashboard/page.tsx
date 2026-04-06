"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PenLine, LogOut, TrendingUp, Flame, Brain, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import MoodTimeline from "@/components/dashboard/MoodTimeline";
import EmotionAnalytics from "@/components/dashboard/EmotionAnalytics";
import type { JournalEntry, EmotionScores, EmotionKey } from "@/lib/types";
import { EMOTION_COLORS, EMOTION_LABELS, scoreLabel, scoreColor } from "@/lib/utils";import { format, parseISO, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday, addMonths, subMonths } from "date-fns";

const dark = { bg: "#0f0f11", card: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.08)" };

// ── Consistency Calendar ───────────────────────────────────────
function ConsistencyCalendar({ entries }: { entries: Pick<JournalEntry, "id" | "created_at" | "entry_date" | "composite_score">[] }) {
  const [viewDate, setViewDate] = useState(new Date());

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const entryMap = new Map<string, typeof entries[0][]>();
  entries.forEach(e => {
    const key = (e.entry_date ?? format(parseISO(e.created_at), "yyyy-MM-dd"));
    if (!entryMap.has(key)) entryMap.set(key, []);
    entryMap.get(key)!.push(e);
  });

  const weekdays = ["S", "M", "T", "W", "T", "F", "S"];
  const startPad = monthStart.getDay();

  let maxStreak = 0, cur = 0;
  days.forEach(d => {
    const key = format(d, "yyyy-MM-dd");
    if (entryMap.has(key)) { cur++; maxStreak = Math.max(maxStreak, cur); } else cur = 0;
  });

  const daysWithEntry = days.filter(d => entryMap.has(format(d, "yyyy-MM-dd"))).length;
  const completionRate = Math.round((daysWithEntry / days.length) * 100);

  // Avg score this month
  const monthEntries = entries.filter(e => {
    const d = parseISO(e.created_at);
    return isSameMonth(d, viewDate);
  });
  const avgMonthScore = monthEntries.length
    ? Math.round((monthEntries.reduce((s, e) => s + e.composite_score, 0) / monthEntries.length) * 10) / 10
    : null;

  return (
    <div className="rounded-2xl border p-5 space-y-4" style={{ background: dark.card, borderColor: dark.border }}>
      {/* Header: arrows LEFT, title center, today RIGHT */}
      <div className="flex items-center gap-2">
        <button onClick={() => setViewDate(v => subMonths(v, 1))}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.05] transition-colors">
          <ChevronLeft size={15} />
        </button>
        <button onClick={() => setViewDate(v => addMonths(v, 1))}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.05] transition-colors">
          <ChevronRight size={15} />
        </button>
        <div className="flex-1 text-center">
          <span className="font-display text-base font-semibold text-white">{format(viewDate, "MMMM yyyy")}</span>
          <span className="text-xs text-white/30 ml-2">{daysWithEntry}/{days.length} days</span>
        </div>
        <button onClick={() => setViewDate(new Date())}
          className="px-2.5 h-7 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/[0.05] transition-colors border"
          style={{ borderColor: dark.border }}>
          Today
        </button>
      </div>

      {/* Compact grid */}
      <div className="grid grid-cols-7 gap-1">
        {weekdays.map((d, i) => (
          <div key={`${d}-${i}`} className="text-center text-[10px] text-white/20 font-medium py-0.5">{d}</div>
        ))}
        {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
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
              className={`relative flex flex-col items-center justify-center rounded-lg py-1.5 transition-all ${hasEntry ? "cursor-pointer hover:scale-105" : "cursor-default"}`}
              style={{
                background: hasEntry ? `${color}15` : "transparent",
                border: today ? `1px solid rgba(139,92,246,0.5)` : hasEntry ? `1px solid ${color}25` : "1px solid transparent",
                minHeight: "44px",
              }}
            >
              <span className={`text-xs font-medium leading-none ${today ? "text-purple-400" : hasEntry ? "text-white" : "text-white/20"}`}>
                {format(day, "d")}
              </span>
              {hasEntry && (
                <div className="w-1 h-1 rounded-full mt-1" style={{ background: color! }} />
              )}
            </Link>
          );
        })}
      </div>

      {/* 4 stat boxes */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Days logged", value: `${daysWithEntry}`, sub: `of ${days.length}` },
          { label: "Completion", value: `${completionRate}%`, sub: "this month" },
          { label: "Best streak", value: `${maxStreak}d`, sub: "this month" },
          {
            label: "Avg score",
            value: avgMonthScore ? `${avgMonthScore}` : "—",
            sub: avgMonthScore ? scoreLabel(avgMonthScore) : "no entries",
            color: avgMonthScore ? scoreColor(avgMonthScore) : undefined,
          },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-3 text-center border" style={{ background: "rgba(255,255,255,0.02)", borderColor: dark.border }}>
            <p className="text-lg font-display font-semibold" style={{ color: s.color ?? "white" }}>{s.value}</p>
            <p className="text-[10px] text-white/30 mt-0.5 leading-tight">{s.label}</p>
            <p className="text-[9px] text-white/20">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-white/20">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ border: "1px solid rgba(139,92,246,0.5)" }} />
          <span>Today</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.25)" }} />
          <span>Entry logged · colour = mood</span>
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

function computeStreak(entries: Pick<JournalEntry, "created_at" | "entry_date">[]): number {
  if (!entries.length) return 0;
  const unique = Array.from(new Set(entries.map(e => e.entry_date ?? format(parseISO(e.created_at), "yyyy-MM-dd")))).sort().reverse();
  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    if (differenceInDays(parseISO(unique[i - 1]), parseISO(unique[i])) === 1) streak++;
    else break;
  }
  return streak;
}

function computeLongestStreak(entries: Pick<JournalEntry, "created_at" | "entry_date">[]): number {
  if (!entries.length) return 0;
  const unique = Array.from(new Set(entries.map(e => e.entry_date ?? format(parseISO(e.created_at), "yyyy-MM-dd")))).sort();
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

            {/* ── Emotion analytics (unified) ── */}
            <motion.div variants={fadeUp}>
              <EmotionAnalytics entries={entries} />
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
                      <span className="text-sm text-white/40">{format(parseISO(e.entry_date ?? e.created_at), "EEEE, MMM d")}</span>
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
