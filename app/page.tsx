"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Brain, TrendingUp, Shield } from "lucide-react";

// ── Background pattern components from 21st.dev ──────────────────────────────

function NeuralPaths() {
  const nodes = Array.from({ length: 50 }, (_, i) => ({
    x: Math.random() * 800, y: Math.random() * 600, id: `node-${i}`,
  }));
  const connections: { id: string; d: string; delay: number }[] = [];
  nodes.forEach((node, i) => {
    nodes.filter((other, j) => {
      if (i === j) return false;
      const dist = Math.sqrt((node.x - other.x) ** 2 + (node.y - other.y) ** 2);
      return dist < 120 && Math.random() > 0.6;
    }).forEach((target) => {
      connections.push({ id: `conn-${i}-${target.id}`, d: `M${node.x},${node.y} L${target.x},${target.y}`, delay: Math.random() * 10 });
    });
  });
  return (
    <svg className="absolute inset-0 w-full h-full opacity-15" viewBox="0 0 800 600">
      {connections.map((c) => (
        <motion.path key={c.id} d={c.d} stroke="currentColor" strokeWidth="0.5" fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 1, 0], opacity: [0, 0.8, 0] }}
          transition={{ duration: 6, delay: c.delay, repeat: Infinity, ease: "easeInOut" }} />
      ))}
      {nodes.map((node) => (
        <motion.circle key={node.id} cx={node.x} cy={node.y} r="2" fill="currentColor"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1, 1.2, 1], opacity: [0, 0.6, 0.8, 0.6] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
      ))}
    </svg>
  );
}

function FlowPaths() {
  const flowPaths = Array.from({ length: 12 }, (_, i) => ({
    id: `flow-${i}`,
    d: `M-100,${200 + i * 60} Q200,${200 + i * 60 - 50 - i * 10} 500,${200 + i * 60} T900,${200 + i * 60}`,
    strokeWidth: 1 + i * 0.3, opacity: 0.1 + i * 0.05, delay: i * 0.8,
  }));
  return (
    <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 800 800">
      {flowPaths.map((p) => (
        <motion.path key={p.id} d={p.d} fill="none" stroke="currentColor"
          strokeWidth={p.strokeWidth} strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: [0, 1, 0.8, 0], opacity: [0, p.opacity, p.opacity * 0.7, 0] }}
          transition={{ duration: 15, delay: p.delay, repeat: Infinity, ease: "easeInOut" }} />
      ))}
    </svg>
  );
}

function GeometricPaths() {
  const gridSize = 40;
  const paths: { id: string; d: string; delay: number }[] = [];
  for (let x = 0; x < 20; x++) {
    for (let y = 0; y < 12; y++) {
      if (Math.random() > 0.7) {
        paths.push({
          id: `grid-${x}-${y}`,
          d: `M${x*gridSize},${y*gridSize} L${(x+1)*gridSize},${y*gridSize} L${(x+1)*gridSize},${(y+1)*gridSize} L${x*gridSize},${(y+1)*gridSize} Z`,
          delay: Math.random() * 5,
        });
      }
    }
  }
  return (
    <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 800 480">
      {paths.map((p) => (
        <motion.path key={p.id} d={p.d} fill="none" stroke="currentColor" strokeWidth="1"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 1, 0], opacity: [0, 0.6, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 8, delay: p.delay, repeat: Infinity, ease: "easeInOut" }} />
      ))}
    </svg>
  );
}

function SpiralPaths() {
  const spirals = Array.from({ length: 8 }, (_, i) => {
    const cx = 400 + (i % 4 - 1.5) * 200;
    const cy = 300 + (Math.floor(i / 4) - 0.5) * 200;
    const radius = 80 + i * 15;
    const turns = 3 + i * 0.5;
    let path = `M${cx + radius},${cy}`;
    for (let angle = 0; angle <= turns * 360; angle += 5) {
      const r = (angle * Math.PI) / 180;
      const cr = radius * (1 - angle / (turns * 360));
      path += ` L${cx + cr * Math.cos(r)},${cy + cr * Math.sin(r)}`;
    }
    return { id: `spiral-${i}`, d: path, delay: i * 1.2 };
  });
  return (
    <svg className="absolute inset-0 w-full h-full opacity-25" viewBox="0 0 800 600">
      {spirals.map((s) => (
        <motion.path key={s.id} d={s.d} fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: [0, 1, 0], rotate: [0, 360] }}
          transition={{
            pathLength: { duration: 12, repeat: Infinity, ease: "easeInOut" },
            rotate: { duration: 20, repeat: Infinity, ease: "linear" },
            delay: s.delay,
          }} />
      ))}
    </svg>
  );
}

const PATTERNS = ["neural", "flow", "geometric", "spiral"] as const;

const features = [
  { icon: Brain, title: "Conversational analysis", body: "The journal asks follow-up questions to truly understand the nuance behind your day — not just keywords." },
  { icon: TrendingUp, title: "Emotional arc over time", body: "See joy, calm, sadness, anxiety, and anger charted across days and weeks. Spot patterns you didn't know were there." },
  { icon: Shield, title: "Private by design", body: "End-to-end encrypted. Row-level database security. No ads. No data sharing. Your thoughts stay yours." },
];

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } } };

export default function LandingPage() {
  const [currentPattern, setCurrentPattern] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setCurrentPattern((p) => (p + 1) % PATTERNS.length), 12000);
    return () => clearInterval(t);
  }, []);

  const renderPattern = () => {
    switch (currentPattern) {
      case 0: return <NeuralPaths />;
      case 1: return <FlowPaths />;
      case 2: return <GeometricPaths />;
      case 3: return <SpiralPaths />;
    }
  };

  const words = ["Your journal", "understands you."];

  return (
    <main className="min-h-screen bg-background text-foreground overflow-hidden">

      {/* ── Animated background ── */}
      <div className="fixed inset-0 text-primary pointer-events-none">
        <motion.div key={currentPattern} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 2 }}>
          {renderPattern()}
        </motion.div>
      </div>
      {/* subtle gradient overlay */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, hsl(var(--background)/0.7) 0%, hsl(var(--background)/0.3) 40%, hsl(var(--background)/0.7) 100%)" }} />

      {/* ── Pattern indicator dots ── */}
      <div className="fixed top-6 right-6 z-50 flex gap-2">
        {PATTERNS.map((_, i) => (
          <motion.div key={i}
            className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${i === currentPattern ? "bg-primary" : "bg-border"}`}
            animate={{ scale: i === currentPattern ? 1.3 : 1, opacity: i === currentPattern ? 1 : 0.4 }}
            transition={{ duration: 0.3 }} />
        ))}
      </div>

      {/* ── Nav ── */}
      <nav className="fixed top-0 inset-x-0 z-40 flex items-center justify-between px-8 py-5 backdrop-blur-sm border-b border-border/40">
        <span className="font-display text-xl font-semibold tracking-tight">
          Mind<span className="text-primary">Map</span>
        </span>
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign in</Link>
          <Link href="/auth/signup"
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
            Get started <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 pt-40 pb-24 px-8 max-w-4xl mx-auto text-center">
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
          <motion.p variants={fadeUp}
            className="inline-block text-xs font-mono uppercase tracking-widest text-primary border border-primary/30 px-3 py-1.5 rounded-full">
            AI-powered mood intelligence
          </motion.p>

          <div className="space-y-0">
            {["Your journal", "understands you."].map((line, wi) => (
              <motion.h1 key={wi} variants={fadeUp}
                className="text-5xl md:text-7xl font-display font-semibold leading-[1.1] tracking-tight block">
                {wi === 1
                  ? <em className="not-italic text-primary">{line}</em>
                  : line}
              </motion.h1>
            ))}
          </div>

          <motion.p variants={fadeUp} className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed font-body font-light">
            Write about your day. Our agent asks the right questions. Then watch your emotional landscape take shape — day by day, week by week.
          </motion.p>

          <motion.div variants={fadeUp} className="flex justify-center gap-4 pt-2">
            {/* Gradient-bordered CTA from 21st.dev */}
            <div className="relative p-[2px] rounded-xl"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary)), #a855f7, #ec4899)" }}>
              <Link href="/auth/signup"
                className="inline-flex items-center gap-2 bg-background text-foreground px-6 py-2.5 rounded-[10px] font-medium text-sm hover:bg-muted transition-colors">
                Start your journal <ArrowRight size={15} />
              </Link>
            </div>
            <Link href="/auth/login"
              className="inline-flex items-center gap-2 border border-border text-foreground px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-accent transition-colors">
              Sign in
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Emotion score strip ── */}
      <section className="relative z-10 py-10 border-y border-border/60 bg-background/60 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-8 flex flex-wrap justify-center gap-3">
          {[
            { label: "Joy", value: 7.4, color: "#F59E0B" },
            { label: "Calm", value: 6.8, color: "#10B981" },
            { label: "Sadness", value: 3.2, color: "#6366F1" },
            { label: "Anxiety", value: 4.1, color: "#F97316" },
            { label: "Anger", value: 1.8, color: "#EF4444" },
          ].map((e) => (
            <div key={e.label} className="flex items-center gap-2 bg-card/80 backdrop-blur-sm border border-border px-4 py-2.5 rounded-full text-sm">
              <span className="w-2 h-2 rounded-full" style={{ background: e.color }} />
              <span className="text-muted-foreground font-body">{e.label}</span>
              <span className="font-mono font-medium" style={{ color: e.color }}>{e.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative z-10 py-24 px-8 max-w-5xl mx-auto">
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-3 gap-8">
          {features.map((f) => (
            <motion.div key={f.title} variants={fadeUp}
              className="group p-6 rounded-2xl border border-border bg-card/80 backdrop-blur-sm hover:border-primary/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <f.icon size={18} className="text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-body font-light">{f.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-border py-8 px-8 text-center text-xs text-muted-foreground font-body bg-background/80 backdrop-blur-sm">
        <p>
          MindMap Journal — built for understanding, not surveillance.
          &nbsp;·&nbsp;
          <Link href="/auth/signup" className="hover:text-foreground transition-colors">Get started free</Link>
          &nbsp;·&nbsp;
          <span className="font-mono">
            Pattern: <span className="text-foreground capitalize">{PATTERNS[currentPattern]}</span>
          </span>
        </p>
      </footer>
    </main>
  );
}
