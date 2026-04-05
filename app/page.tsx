"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Brain, TrendingUp, Shield } from "lucide-react";

const features = [
  { icon: Brain, title: "Conversational analysis", body: "The journal asks follow-up questions to truly understand the nuance behind your day — not just keywords." },
  { icon: TrendingUp, title: "Emotional arc over time", body: "See joy, calm, sadness, anxiety, and anger charted across days and weeks. Spot patterns you didn't know were there." },
  { icon: Shield, title: "Private by design", body: "End-to-end encrypted. Row-level database security. No ads. No data sharing. Your thoughts stay yours." },
];

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0f0f11] text-white overflow-hidden">

      {/* Subtle static radial glow — no animation, instant render */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(99,66,199,0.18) 0%, transparent 70%)" }} />

      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-40 flex items-center justify-between px-8 py-5 border-b border-white/[0.06] bg-[#0f0f11]/80 backdrop-blur-md">
        <span className="font-display text-xl font-semibold tracking-tight text-white">
          Mind<span style={{ color: "#8b5cf6" }}>Map</span>
        </span>
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="text-sm text-white/60 hover:text-white transition-colors">
            Sign in
          </Link>
          <Link href="/auth/signup"
            className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
            style={{ background: "#8b5cf6", color: "#fff" }}>
            Get started <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 pt-44 pb-24 px-8 max-w-4xl mx-auto text-center">
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-7">

          <motion.p variants={fadeUp}
            className="inline-block text-xs font-mono uppercase tracking-widest px-3 py-1.5 rounded-full border"
            style={{ color: "#a78bfa", borderColor: "rgba(139,92,246,0.3)" }}>
            AI-powered mood intelligence
          </motion.p>

          <motion.h1 variants={fadeUp}
            className="text-5xl md:text-7xl font-display font-semibold leading-[1.1] tracking-tight text-white">
            Your journal<br />
            <em className="not-italic" style={{ color: "#a78bfa" }}>understands you.</em>
          </motion.h1>

          <motion.p variants={fadeUp} className="text-lg text-white/50 max-w-xl mx-auto leading-relaxed font-body font-light">
            Write about your day. Our agent asks the right questions. Then watch
            your emotional landscape take shape — day by day, week by week.
          </motion.p>

          <motion.div variants={fadeUp} className="flex justify-center gap-3 pt-1">
            <Link href="/auth/signup"
              className="inline-flex items-center gap-2 text-white text-sm font-medium px-6 py-3 rounded-xl transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: "#8b5cf6" }}>
              Start your journal <ArrowRight size={15} />
            </Link>
            <Link href="/auth/login"
              className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm font-medium px-6 py-3 rounded-xl border border-white/10 hover:border-white/20 transition-all">
              Sign in
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Emotion score strip */}
      <section className="relative z-10 py-8 border-y border-white/[0.06]" style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="max-w-3xl mx-auto px-8 flex flex-wrap justify-center gap-3">
          {[
            { label: "Joy",     value: 7.4, color: "#F59E0B" },
            { label: "Calm",    value: 6.8, color: "#10B981" },
            { label: "Sadness", value: 3.2, color: "#818cf8" },
            { label: "Anxiety", value: 4.1, color: "#F97316" },
            { label: "Anger",   value: 1.8, color: "#EF4444" },
          ].map((e) => (
            <div key={e.label}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm border"
              style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: e.color }} />
              <span className="text-white/50">{e.label}</span>
              <span className="font-mono font-medium" style={{ color: e.color }}>{e.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 py-24 px-8 max-w-5xl mx-auto">
        <motion.div variants={stagger} initial="hidden" whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid md:grid-cols-3 gap-6">
          {features.map((f) => (
            <motion.div key={f.title} variants={fadeUp}
              className="p-6 rounded-2xl border transition-colors"
              style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "rgba(139,92,246,0.12)" }}>
                <f.icon size={18} style={{ color: "#a78bfa" }} />
              </div>
              <h3 className="font-display text-base font-semibold mb-2 text-white">{f.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed font-body font-light">{f.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t py-8 px-8 text-center text-xs text-white/30 font-body"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}>
        MindMap Journal — built for understanding, not surveillance.&nbsp;·&nbsp;
        <Link href="/auth/signup" className="hover:text-white/60 transition-colors">Get started free</Link>
      </footer>
    </main>
  );
}
