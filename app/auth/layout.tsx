import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#0f0f11" }}>
      {/* Same radial glow as landing page */}
      <div className="pointer-events-none fixed inset-0"
        style={{ background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(99,66,199,0.18) 0%, transparent 70%)" }} />

      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-40 flex items-center justify-between px-8 py-5 border-b border-white/[0.06]"
        style={{ background: "rgba(15,15,17,0.85)", backdropFilter: "blur(12px)" }}>
        <Link href="/" className="font-display text-xl font-semibold tracking-tight text-white">
          Mind<span style={{ color: "#8b5cf6" }}>Map</span>
        </Link>
        <Link href="/" className="text-sm text-white/40 hover:text-white/70 transition-colors">
          ← Back
        </Link>
      </nav>

      <div className="w-full max-w-md relative z-10 mt-16">{children}</div>
    </div>
  );
}
