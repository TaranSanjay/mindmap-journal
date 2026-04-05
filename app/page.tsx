"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Brain, TrendingUp, Shield } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Conversational analysis",
    body: "The journal asks follow-up questions to truly understand the nuance behind your day — not just keywords.",
  },
  {
    icon: TrendingUp,
    title: "Emotional arc over time",
    body: "See joy, calm, sadness, anxiety, and anger charted across days and weeks. Spot patterns you didn't know were there.",
  },
  {
    icon: Shield,
    title: "Private by design",
    body: "End-to-end encrypted. Row-level database security. No ads. No data sharing. Your thoughts stay yours.",
  },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Decorative blob */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.06]"
        style={{ background: "hsl(var(--primary))", filter: "blur(120px)" }}
      />

      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-40 flex items-center justify-between px-8 py-5 backdrop-blur-sm border-b border-border/40">
        <span className="font-display text-xl font-semibold tracking-tight">
          Mind<span className="text-primary">Map</span>
        </span>
        <div className="flex items-center gap-4">
          <Link
            href="/auth/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            Get started <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-24 px-8 max-w-4xl mx-auto text-center">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          <motion.p
            variants={fadeUp}
            className="inline-block text-xs font-mono uppercase tracking-widest text-primary border border-primary/30 px-3 py-1.5 rounded-full"
          >
            AI-powered mood intelligence
          </motion.p>

          <motion.h1
            variants={fadeUp}
            className="text-5xl md:text-7xl font-display font-semibold leading-[1.1] tracking-tight"
          >
            Your journal
            <br />
            <em className="not-italic text-primary">understands you.</em>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed font-body font-light"
          >
            Write about your day. Our agent asks the right questions. Then watch
            your emotional landscape take shape — day by day, week by week.
          </motion.p>

          <motion.div variants={fadeUp} className="flex justify-center gap-4 pt-2">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Start your journal <ArrowRight size={16} />
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 border border-border text-foreground px-6 py-3 rounded-xl font-medium hover:bg-accent transition-colors"
            >
              Sign in
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Sample score strip */}
      <section className="py-10 border-y border-border/60 bg-muted/30">
        <div className="max-w-3xl mx-auto px-8 flex flex-wrap justify-center gap-3">
          {[
            { label: "Joy", value: 7.4, color: "#F59E0B" },
            { label: "Calm", value: 6.8, color: "#10B981" },
            { label: "Sadness", value: 3.2, color: "#6366F1" },
            { label: "Anxiety", value: 4.1, color: "#F97316" },
            { label: "Anger", value: 1.8, color: "#EF4444" },
          ].map((e) => (
            <div
              key={e.label}
              className="flex items-center gap-2 bg-card border border-border px-4 py-2.5 rounded-full text-sm"
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: e.color }}
              />
              <span className="text-muted-foreground font-body">{e.label}</span>
              <span className="font-mono font-medium" style={{ color: e.color }}>
                {e.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-8 max-w-5xl mx-auto">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-3 gap-8"
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              className="group p-6 rounded-2xl border border-border bg-card hover:border-primary/40 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <f.icon size={18} className="text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-body font-light">
                {f.body}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-8 text-center text-xs text-muted-foreground font-body">
        <p>
          MindMap Journal — built for understanding, not surveillance.
          &nbsp;·&nbsp;
          <Link href="/auth/signup" className="hover:text-foreground transition-colors">
            Get started free
          </Link>
        </p>
      </footer>
    </main>
  );
}
