"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, BarChart2, LogOut, BookOpen } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import type { ChatMessage, EmotionScores } from "@/lib/types";
import { EMOTION_COLORS, EMOTION_LABELS, compositeScore, scoreLabel, scoreColor } from "@/lib/utils";
import EmotionRadarChart from "@/components/dashboard/EmotionRadar";

const WELCOME =
  "Hello — this is your space. Take a moment and tell me about your day, or something on your mind. There's no right or wrong way to start.";

function TypingIndicator() {
  return (
    <div className="flex gap-1.5 items-center px-4 py-3 bg-card border border-border rounded-2xl rounded-tl-sm w-fit">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </div>
  );
}

function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  // Strip <analysis> block from display
  const display = msg.content.replace(/<analysis>[\s\S]*?<\/analysis>/g, "").trim();
  if (!display) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed font-body ${
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-card border border-border text-foreground rounded-tl-sm"
        }`}
      >
        {display}
      </div>
    </motion.div>
  );
}

function ScoreReveal({
  scores,
  onSave,
  saving,
}: {
  scores: EmotionScores;
  onSave: () => void;
  saving: boolean;
}) {
  const composite = compositeScore(scores);
  const label = scoreLabel(composite);
  const color = scoreColor(composite);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="mx-4 mb-4 bg-card border border-border rounded-2xl p-5 space-y-4"
    >
      {/* Composite */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-body mb-1">
            Today&apos;s mood score
          </p>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-4xl font-semibold" style={{ color }}>
              {composite.toFixed(1)}
            </span>
            <span className="text-sm text-muted-foreground">/ 10</span>
            <span className="text-sm font-medium ml-1" style={{ color }}>
              {label}
            </span>
          </div>
        </div>
        <EmotionRadarChart scores={scores} size={100} />
      </div>

      {/* Emotion bars */}
      <div className="space-y-2">
        {(Object.keys(scores) as (keyof EmotionScores)[]).map((key) => (
          <div key={key} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-14 font-body">
              {EMOTION_LABELS[key]}
            </span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${scores[key] * 10}%` }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: EMOTION_COLORS[key] }}
              />
            </div>
            <span className="text-xs font-mono w-6 text-right" style={{ color: EMOTION_COLORS[key] }}>
              {scores[key]}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={onSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-all disabled:opacity-60 active:scale-[0.98]"
      >
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-resize textarea
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

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) throw new Error("API error");
      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (data.analysis) {
        setEmotionScores(data.analysis.emotions);
        setAnalysis({ summary: data.analysis.summary, insight: data.analysis.insight });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: "err",
          role: "assistant",
          content: "Something went wrong. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function saveEntry() {
    if (!emotionScores) return;
    setSaving(true);

    const transcript = messages
      .map((m) => `${m.role === "user" ? "You" : "Journal"}: ${m.content}`)
      .join("\n\n");

    const res = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: transcript,
        emotion_scores: emotionScores,
        turn_count: messages.filter((m) => m.role === "user").length,
      }),
    });

    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => router.push("/dashboard"), 1200);
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/80 backdrop-blur-sm">
        <Link href="/" className="font-display text-lg font-semibold">
          Mind<span className="text-primary">Map</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <BarChart2 size={15} /> Dashboard
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </header>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3 max-w-2xl w-full mx-auto">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <Bubble key={msg.id} msg={msg} />
          ))}
        </AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <TypingIndicator />
          </motion.div>
        )}
        {/* Analysis insight card */}
        {analysis && !emotionScores && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm text-muted-foreground italic font-body"
          >
            <BookOpen size={13} className="inline mr-1.5 -mt-0.5" />
            {analysis.insight}
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Score reveal */}
      {emotionScores && !saved && (
        <ScoreReveal scores={emotionScores} onSave={saveEntry} saving={saving} />
      )}

      {saved && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mx-4 mb-4 text-center py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm rounded-xl"
        >
          Entry saved — taking you to your dashboard…
        </motion.div>
      )}

      {/* Input area */}
      {!emotionScores && (
        <div className="px-4 pb-6 max-w-2xl w-full mx-auto">
          <div className="flex items-end gap-3 bg-card border border-border rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-ring transition">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Write about your day… (Enter to send, Shift+Enter for new line)"
              rows={1}
              className="flex-1 bg-transparent resize-none outline-none text-sm font-body leading-relaxed placeholder:text-muted-foreground/60"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 transition-all hover:opacity-90 active:scale-95"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2 font-body">
            Your entries are private and encrypted.
          </p>
        </div>
      )}
    </div>
  );
}
