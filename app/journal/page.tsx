"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, BarChart2, LogOut, BookOpen, Calendar } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase-browser";
import type { ChatMessage, EmotionScores } from "@/lib/types";
import { EMOTION_COLORS, EMOTION_LABELS, compositeScore, scoreLabel, scoreColor } from "@/lib/utils";
import EmotionRadarChart from "@/components/dashboard/EmotionRadar";

const WELCOME = "Hello — this is your space. Take a moment and tell me about your day, or something on your mind. There's no right or wrong way to start.";
const dark = { bg: "#0f0f11", card: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.08)" };

function TypingIndicator() {
  return (
    <div className="flex gap-1.5 items-center px-4 py-3 rounded-2xl rounded-tl-sm w-fit border"
      style={{ background: dark.card, borderColor: dark.border }}>
      <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
    </div>
  );
}

function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  const display = msg.content
    .replace(/<analysis>[\s\S]*?<\/analysis>/g, "")
    .replace(/<analysis>[\s\S]*/g, "")
    .trim();
  if (!display) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${isUser ? "text-white rounded-tr-sm" : "rounded-tl-sm border"}`}
        style={isUser ? { background: "#8b5cf6" } : { background: dark.card, borderColor: dark.border, color: "rgba(255,255,255,0.85)" }}>
        {display}
      </div>
    </motion.div>
  );
}

function ScoreReveal({ scores, entryDate, onDateChange, onSave, saving }: {
  scores: EmotionScores; entryDate: string; onDateChange: (d: string) => void; onSave: () => void; saving: boolean;
}) {
  const composite = compositeScore(scores);
  const today = format(new Date(), "yyyy-MM-dd");
  const isBackdate = entryDate !== today;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-4 rounded-2xl p-5 space-y-4 border"
      style={{ background: dark.card, borderColor: dark.border }}>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Mood score</p>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-4xl font-semibold" style={{ color: scoreColor(composite) }}>{composite.toFixed(1)}</span>
            <span className="text-sm text-white/30">/ 10</span>
            <span className="text-sm font-medium ml-1" style={{ color: scoreColor(composite) }}>{scoreLabel(composite)}</span>
          </div>
        </div>
        <EmotionRadarChart scores={scores} size={100} />
      </div>

      <div className="space-y-2">
        {(Object.keys(scores) as (keyof EmotionScores)[]).map((key) => (
          <div key={key} className="flex items-center gap-3">
            <span className="text-xs text-white/40 w-14">{EMOTION_LABELS[key]}</span>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${scores[key] * 10}%` }}
                transition={{ duration: 0.8, delay: 0.2 }} className="h-full rounded-full"
                style={{ background: EMOTION_COLORS[key] }} />
            </div>
            <span className="text-xs font-mono w-6 text-right" style={{ color: EMOTION_COLORS[key] }}>{scores[key]}</span>
          </div>
        ))}
      </div>

      {/* Date picker */}
      <div className="rounded-xl border px-4 py-3 space-y-1.5" style={{ background: "rgba(255,255,255,0.02)", borderColor: dark.border }}>
        <div className="flex items-center gap-2">
          <Calendar size={13} style={{ color: "#a78bfa" }} />
          <span className="text-xs text-white/50 uppercase tracking-wider">Entry date</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input type="date" value={entryDate} max={today}
            onChange={e => onDateChange(e.target.value)}
            className="bg-transparent text-sm text-white outline-none border-b border-white/10 focus:border-purple-500/50 transition-colors pb-0.5"
            style={{ colorScheme: "dark" }} />
          {isBackdate && (
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.3)" }}>
              Backdated to {format(new Date(entryDate + "T12:00:00"), "MMM d")}
            </span>
          )}
        </div>
        <p className="text-[10px] text-white/25">Writing about a different day? Change the date above.</p>
      </div>

      <button onClick={onSave} disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-60 active:scale-[0.98]"
        style={{ background: "#8b5cf6" }}>
        {saving ? <Loader2 size={15} className="animate-spin" /> : "Save to my journal"}
      </button>
    </motion.div>
  );
}

export default function JournalPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "0", role: "assistant", content: WELCOME, timestamp: new Date() },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [emotionScores, setEmotionScores] = useState<EmotionScores | null>(null);
  const [analysis, setAnalysis] = useState<{ summary: string; insight: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, [input]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading || saved) return;
    setInput("");
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: text, timestamp: new Date() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: data.reply, timestamp: new Date() }]);
      if (data.analysis) { setEmotionScores(data.analysis.emotions); setAnalysis({ summary: data.analysis.summary, insight: data.analysis.insight }); }
    } catch {
      setMessages(prev => [...prev, { id: "err", role: "assistant", content: "Something went wrong. Please try again.", timestamp: new Date() }]);
    } finally { setLoading(false); }
  }

  async function saveEntry() {
    if (!emotionScores) return;
    setSaving(true);
    const transcript = messages.map(m => `${m.role === "user" ? "You" : "Journal"}: ${m.content}`).join("\n\n");
    const res = await fetch("/api/entries", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: transcript,
        emotion_scores: emotionScores,
        turn_count: messages.filter(m => m.role === "user").length,
        messages,
        entry_date: entryDate,
      }),
    });
    setSaving(false);
    if (res.ok) { setSaved(true); setTimeout(() => router.push("/dashboard"), 1200); }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: dark.bg }}>
      <header className="flex items-center justify-between px-6 py-4 border-b backdrop-blur-sm"
        style={{ background: "rgba(15,15,17,0.9)", borderColor: dark.border }}>
        <Link href="/" className="font-display text-lg font-semibold text-white">
          Mind<span style={{ color: "#8b5cf6" }}>Map</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-sm transition-colors text-white/40 hover:text-white/80">
            <BarChart2 size={15} /> Dashboard
          </Link>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm transition-colors text-white/40 hover:text-white/80">
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3 max-w-2xl w-full mx-auto">
        <AnimatePresence initial={false}>
          {messages.map(msg => <Bubble key={msg.id} msg={msg} />)}
        </AnimatePresence>
        {loading && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}><TypingIndicator /></motion.div>}
        {analysis && !emotionScores && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl px-4 py-3 text-sm italic border"
            style={{ background: dark.card, borderColor: dark.border, color: "rgba(255,255,255,0.4)" }}>
            <BookOpen size={13} className="inline mr-1.5 -mt-0.5" />{analysis.insight}
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {emotionScores && !saved && (
        <ScoreReveal
          scores={emotionScores}
          entryDate={entryDate}
          onDateChange={setEntryDate}
          onSave={saveEntry}
          saving={saving}
        />
      )}

      {saved && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mx-4 mb-4 text-center py-3 rounded-xl text-sm border"
          style={{ background: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.2)", color: "#34d399" }}>
          Entry saved — taking you to your dashboard…
        </motion.div>
      )}

      {!emotionScores && (
        <div className="px-4 pb-6 max-w-2xl w-full mx-auto">
          <div className="flex items-end gap-3 rounded-2xl px-4 py-3 border focus-within:border-purple-500/40 transition"
            style={{ background: dark.card, borderColor: dark.border }}>
            <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Write about your day… (Enter to send)"
              rows={1} className="flex-1 bg-transparent resize-none outline-none text-sm leading-relaxed text-white placeholder-white/20" />
            <button onClick={sendMessage} disabled={!input.trim() || loading}
              className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center disabled:opacity-40 transition-all hover:opacity-90 active:scale-95 text-white"
              style={{ background: "#8b5cf6" }}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
          <p className="text-center text-xs text-white/20 mt-2">Your entries are private and encrypted.</p>
        </div>
      )}
    </div>
  );
}
