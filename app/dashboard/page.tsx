"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PenLine, LogOut, TrendingUp, Calendar, Flame, Brain } from "lucide-react";
import { createClient } from "@/lib/supabase";
import MoodTimeline from "@/components/dashboard/MoodTimeline";
import EmotionBreakdown from "@/components/dashboard/EmotionBreakdown";
import EmotionRadarChart from "@/components/dashboard/EmotionRadar";
import type { JournalEntry, EmotionScores, EmotionKey } from "@/lib/types";
import { EMOTION_COLORS, EMOTION_LABELS, scoreLabel, scoreColor } from "@/lib/utils";
import { format, parseISO, differenceInDays } from "date-fns";

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon size={15} />
        <span className="text-xs uppercase tracking-wider font-body">{label}</span>
      </div>
      <p className="font-display text-3xl font-semibold" style={color ? { color } : undefined}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground font-body">{sub}</p>}
    </div>
  );
}

function computeStreak(entries: Pick<JournalEntry, "created_at">[]): number {
  if (!entries.length) return 0;
  const days = entries.map((e) =>
    format(parseISO(e.created_at), "yyyy-MM-dd")
  );
  const unique = [...new Set(days)].sort().reverse();
  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    const diff = differenceInDays(parseISO(unique[i - 1]), parseISO(unique[i]));
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

function dominantEmotion(entries: Pick<JournalEntry, "emotion_scores">[]): EmotionKey | null {
  if (!entries.length) return null;
  const totals: Record<EmotionKey, number> = { joy: 0, calm: 0, sadness: 0, anxiety: 0, anger: 0 };
  for (const e of entries) {
    for (const k of Object.keys(totals) as EmotionKey[]) {
      totals[k] += e.emotion_scores[k];
    }
  }
  return (Object.entries(totals).sort((a, b) => b[1] - a[1])[0][0]) as EmotionKey;
}

function avgScores(entries: Pick<JournalEntry, "emotion_scores">[]): EmotionScores {
  if (!entries.length) return { joy: 5, calm: 5, sadness: 5, anxiety: 5, anger: 5 };
  const totals: EmotionScores = { joy: 0, calm: 0, sadness: 0, anxiety: 0, anger: 0 };
  for (const e of entries) {
    for (const k of Object.keys(totals) as EmotionKey[]) totals[k] += e.emotion_scores[k];
  }
  const n = entries.length;
  return Object.fromEntries(
    Object.entries(totals).map(([k, v]) => [k, Math.round((v / n) * 10) / 10])
  ) as EmotionScores;
}

export default function DashboardPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/entries?limit=90")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setEntries(d.entries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  const avgComposite =
    entries.length
      ? Math.round((entries.reduce((s, e) => s + e.composite_score, 0) / entries.length) * 10) / 10
      : null;
  const streak = computeStreak(entries);
  const dominant = dominantEmotion(entries);
  const averages = avgScores(entries);

  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-6 py-4 border-b border-border bg-card/80 backdrop-blur-sm">
        <Link href="/" className="font-display text-lg font-semibold">
          Mind<span className="text-primary">Map</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/journal"
            className="flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            <PenLine size={14} /> New entry
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Greeting */}
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Your emotional landscape
          </h1>
          <p className="text-muted-foreground text-sm mt-1 font-body">
            {entries.length} {entries.length === 1 ? "entry" : "entries"} recorded
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
            Loading your journal…
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
            <Brain size={40} className="text-muted-foreground/40" />
            <p className="text-muted-foreground font-body">No entries yet.</p>
            <Link
              href="/journal"
              className="bg-primary text-primary-foreground text-sm px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
            >
              Write your first entry
            </Link>
          </div>
        ) : (
          <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
            {/* Stat cards */}
            <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={TrendingUp}
                label="Avg score"
                value={avgComposite ? `${avgComposite}` : "—"}
                sub={avgComposite ? scoreLabel(avgComposite) : undefined}
                color={avgComposite ? scoreColor(avgComposite) : undefined}
              />
              <StatCard
                icon={Flame}
                label="Streak"
                value={`${streak}d`}
                sub="consecutive days"
              />
              <StatCard
                icon={Calendar}
                label="Total entries"
                value={`${entries.length}`}
                sub="last 90 days"
              />
              <StatCard
                icon={Brain}
                label="Dominant emotion"
                value={dominant ? EMOTION_LABELS[dominant] : "—"}
                color={dominant ? EMOTION_COLORS[dominant] : undefined}
              />
            </motion.div>

            {/* Mood timeline */}
            <motion.div
              variants={fadeUp}
              className="bg-card border border-border rounded-2xl p-6 space-y-3"
            >
              <h2 className="font-display text-lg font-semibold">Mood over time</h2>
              <MoodTimeline entries={entries} />
            </motion.div>

            {/* Bottom row: emotion breakdown + radar */}
            <motion.div variants={fadeUp} className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2 bg-card border border-border rounded-2xl p-6 space-y-3">
                <h2 className="font-display text-lg font-semibold">Emotion breakdown</h2>
                <EmotionBreakdown entries={entries} />
              </div>

              <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center justify-center space-y-4">
                <h2 className="font-display text-lg font-semibold self-start">Avg emotions</h2>
                <EmotionRadarChart scores={averages} size={160} />
                <div className="w-full space-y-1.5">
                  {(Object.keys(averages) as EmotionKey[]).map((k) => (
                    <div key={k} className="flex items-center justify-between text-xs font-body">
                      <span className="text-muted-foreground">{EMOTION_LABELS[k]}</span>
                      <span className="font-mono font-medium" style={{ color: EMOTION_COLORS[k] }}>
                        {averages[k]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Recent entries list */}
            <motion.div
              variants={fadeUp}
              className="bg-card border border-border rounded-2xl p-6 space-y-3"
            >
              <h2 className="font-display text-lg font-semibold">Recent entries</h2>
              <div className="space-y-2">
                {entries.slice(0, 10).map((e) => {
                  const color = scoreColor(e.composite_score);
                  return (
                    <div
                      key={e.id}
                      className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0"
                    >
                      <span className="text-sm text-muted-foreground font-body">
                        {format(parseISO(e.created_at), "EEEE, MMM d")}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-medium" style={{ color }}>
                          {e.composite_score.toFixed(1)}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-body"
                          style={{ background: `${color}18`, color }}
                        >
                          {scoreLabel(e.composite_score)}
                        </span>
                      </div>
                    </div>
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
