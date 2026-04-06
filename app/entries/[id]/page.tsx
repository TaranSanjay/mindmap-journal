"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, BookOpen, Sparkles } from "lucide-react";
import { format, parseISO } from "date-fns";
import { EMOTION_COLORS, EMOTION_LABELS, scoreLabel, scoreColor } from "@/lib/utils";
import type { JournalEntry, EmotionKey } from "@/lib/types";

const dark = {
  bg: "#0f0f11",
  card: "rgba(255,255,255,0.03)",
  border: "rgba(255,255,255,0.08)",
};

function Bubble({ role, content }: { role: string; content: string }) {
  const isUser = role === "user";
  if (!content.trim()) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser ? "rounded-tr-sm text-white" : "rounded-tl-sm border"
        }`}
        style={
          isUser
            ? { background: "#8b5cf6" }
            : { background: dark.card, borderColor: dark.border, color: "rgba(255,255,255,0.85)" }
        }
      >
        {content}
      </div>
    </motion.div>
  );
}

export default function EntryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<string | null>(null);
  const [summarising, setSummarising] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/entries?id=${id}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setEntry(d.entry))
      .catch(() => router.push("/dashboard"))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleSummarise() {
    if (summary) { setSummaryOpen(v => !v); return; }
    setSummarising(true);
    const transcript = (entry?.content ?? "");
    const res = await fetch("/api/summarise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    });
    const data = await res.json();
    setSummary(data.summary ?? "Could not generate summary.");
    setSummaryOpen(true);
    setSummarising(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: dark.bg }}>
        <Loader2 size={24} className="animate-spin text-white/30" />
      </div>
    );
  }

  if (!entry) return null;

  const messages: { role: string; content: string }[] = (() => {
    const raw: { role: string; content: string }[] =
      Array.isArray(entry.messages) && entry.messages.length > 0
        ? entry.messages
        : entry.content
            .split("\n\n")
            .filter(Boolean)
            .map(line => ({
              role: line.startsWith("You:") ? "user" : "assistant",
              content: line.replace(/^(You|Journal):\s*/, "").trim(),
            }));

    return raw
      .map(m => ({
        ...m,
        content: m.content
          .replace(/<analysis>[\s\S]*?<\/analysis>/g, "")
          .replace(/<analysis>[\s\S]*/g, "")
          .trim(),
      }))
      .filter(m => m.content.length > 0);
  })();

  const composite = entry.composite_score;
  const color = scoreColor(composite);

  return (
    <div className="min-h-screen" style={{ background: dark.bg }}>
      {/* Glow */}
      <div className="pointer-events-none fixed inset-0"
        style={{ background: "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(99,66,199,0.08) 0%, transparent 60%)" }} />

      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-6 py-4 border-b backdrop-blur-md"
        style={{ background: "rgba(15,15,17,0.9)", borderColor: dark.border }}>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-white/40 hover:text-white/80 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="text-white font-display text-base font-semibold leading-tight">
              {format(parseISO(entry.entry_date || entry.created_at), "EEEE, MMMM d")}
            </p>
            <p className="text-white/30 text-xs">
              {format(parseISO(entry.created_at), "yyyy · h:mm a")}
            </p>
          </div>
        </div>

        <button
          onClick={handleSummarise}
          disabled={summarising}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border hover:border-purple-500/40 text-white/70 hover:text-white active:scale-[0.98]"
          style={{ background: dark.card, borderColor: dark.border }}
        >
          {summarising ? (
            <><Loader2 size={14} className="animate-spin" /> Summarising…</>
          ) : (
            <><Sparkles size={14} style={{ color: "#a78bfa" }} /> {summary && summaryOpen ? "Hide summary" : "Summarise"}</>
          )}
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6 relative z-10">

        {/* Score strip */}
        <div className="rounded-2xl p-5 border space-y-4" style={{ background: dark.card, borderColor: dark.border }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/30 uppercase tracking-wider mb-1">Mood score</p>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl font-semibold" style={{ color }}>{composite.toFixed(1)}</span>
                <span className="text-sm text-white/30">/ 10</span>
                <span className="text-sm font-medium ml-1" style={{ color }}>{scoreLabel(composite)}</span>
              </div>
            </div>
            <div className="flex gap-3 flex-wrap justify-end">
              {(Object.keys(entry.emotion_scores) as EmotionKey[]).map(k => (
                <div key={k} className="flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full" style={{ background: EMOTION_COLORS[k] }} />
                  <span className="text-white/40">{EMOTION_LABELS[k]}</span>
                  <span className="font-mono font-medium" style={{ color: EMOTION_COLORS[k] }}>{entry.emotion_scores[k]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Emotion bars */}
          <div className="space-y-1.5">
            {(Object.keys(entry.emotion_scores) as EmotionKey[]).map(k => (
              <div key={k} className="flex items-center gap-3">
                <span className="text-xs text-white/30 w-14">{EMOTION_LABELS[k]}</span>
                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full" style={{ width: `${entry.emotion_scores[k] * 10}%`, background: EMOTION_COLORS[k] }} />
                </div>
                <span className="text-xs font-mono w-5 text-right" style={{ color: EMOTION_COLORS[k] }}>{entry.emotion_scores[k]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Summary panel */}
        <AnimatePresence>
          {summaryOpen && summary && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.35 }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl p-5 border space-y-3"
                style={{ background: "rgba(139,92,246,0.06)", borderColor: "rgba(139,92,246,0.2)" }}>
                <div className="flex items-center gap-2 text-xs text-white/40 uppercase tracking-wider">
                  <BookOpen size={12} style={{ color: "#a78bfa" }} />
                  <span>AI summary</span>
                </div>
                <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap font-body">{summary}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat history */}
        <div className="space-y-2">
          <p className="text-xs text-white/30 uppercase tracking-wider px-1">Conversation</p>
          <div className="space-y-3">
            {messages.map((m, i) => (
              <Bubble key={i} role={m.role} content={m.content} />
            ))}
          </div>
        </div>

        <div className="pt-4 text-center">
          <Link href="/dashboard" className="text-sm text-white/30 hover:text-white/60 transition-colors">
            ← Back to dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
