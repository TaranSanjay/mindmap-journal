"use client";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const score = [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;
  const colors = ["", "#ef4444", "#f97316", "#eab308", "#10b981"];
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  if (!password) return null;
  return (
    <div className="space-y-1.5 mt-1">
      <div className="flex gap-1">
        {[0,1,2,3].map(i => (
          <div key={i} className="h-1 flex-1 rounded-full transition-colors duration-300"
            style={{ background: i < score ? colors[score] : "rgba(255,255,255,0.1)" }} />
        ))}
      </div>
      <p className="text-xs" style={{ color: colors[score] || "rgba(255,255,255,0.3)" }}>{labels[score]}</p>
    </div>
  );
}

const inputClass = "w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition text-white placeholder-white/30 border focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30";
const inputStyle = { background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" };

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setError(null); setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
    });
    setLoading(false);
    if (error) { setError(error.message); } else { window.location.href = "/journal"; }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
  }

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl p-8 text-center space-y-4 border"
        style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
        <CheckCircle2 size={40} className="mx-auto" style={{ color: "#10b981" }} />
        <h2 className="font-display text-xl font-semibold text-white">You&apos;re in!</h2>
        <p className="text-sm text-white/40">Account created for <span className="text-white/70">{email}</span>.</p>
        <Link href="/auth/login" style={{ color: "#a78bfa" }} className="inline-block text-sm hover:underline mt-2">Sign in now</Link>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="rounded-2xl p-8 border"
      style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>

      <div className="mb-8">
        <p className="text-white/40 text-sm font-body">Start understanding your emotional patterns.</p>
      </div>

      <button onClick={handleGoogle} disabled={googleLoading}
        className="w-full flex items-center justify-center gap-2.5 font-medium py-2.5 rounded-lg transition-all disabled:opacity-60 active:scale-[0.98] text-sm mb-4 border text-white/80 hover:text-white"
        style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}>
        {googleLoading ? <Loader2 size={15} className="animate-spin" /> : <GoogleIcon />}
        Continue with Google
      </button>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
        <span className="text-xs text-white/30">or</span>
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Email</label>
          <input type="email" autoComplete="email" required value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass} style={inputStyle} placeholder="you@example.com" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Password</label>
          <div className="relative">
            <input type={showPass ? "text" : "password"} autoComplete="new-password" required value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass + " pr-10"} style={inputStyle} placeholder="Min 8 characters" />
            <button type="button" onClick={() => setShowPass(v => !v)}
              className="absolute right-3 top-[14px] text-white/30 hover:text-white/60 transition-colors">
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <PasswordStrength password={password} />
        </div>

        <p className="text-xs text-white/30 rounded-lg px-3 py-2 border"
          style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
          Your journal entries are encrypted at rest and never shared.
        </p>

        {error && (
          <p className="text-xs rounded-lg px-3 py-2" style={{ color: "#f87171", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 font-medium py-2.5 rounded-lg transition-all disabled:opacity-60 active:scale-[0.98] text-white"
          style={{ background: "#8b5cf6" }}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <>Create account <ArrowRight size={15} /></>}
        </button>
      </form>

      <p className="text-center text-sm text-white/30 mt-6">
        Already have an account?{" "}
        <Link href="/auth/login" style={{ color: "#a78bfa" }} className="hover:underline">Sign in</Link>
      </p>
    </motion.div>
  );
}
