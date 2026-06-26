import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign In — TOREO Customer Portal" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/portal" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/portal`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/portal" });
    } catch (e: any) {
      setError(e.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    try {
      await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/portal`,
      });
    } catch (e: any) {
      setError(e.message ?? "Google sign-in failed");
    }
  }

  return (
    <div className="min-h-screen bg-[#070708] text-white flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="font-mono text-[10px] tracking-[0.3em] text-white/40 hover:text-white/80 uppercase"
        >
          ← TOREO
        </Link>
        <div className="mt-6 border border-white/10 bg-white/[0.02] backdrop-blur-md rounded-lg p-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "signin" ? "Sign in" : "Create account"}
          </h1>
          <p className="mt-1 text-sm text-white/50">
            {mode === "signin"
              ? "Access your TOREO customer portal"
              : "Register to track and manage your orders"}
          </p>

          <button
            type="button"
            onClick={handleGoogle}
            className="mt-6 w-full border border-white/15 hover:border-white/40 bg-white/5 hover:bg-white/10 rounded-md py-2.5 text-sm font-medium transition"
          >
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-5 text-[10px] uppercase tracking-[0.3em] text-white/30">
            <div className="flex-1 h-px bg-white/10" />
            or
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
                className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2.5 text-sm placeholder:text-white/30 focus:border-white/40 outline-none"
              />
            )}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2.5 text-sm placeholder:text-white/30 focus:border-white/40 outline-none"
            />
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 8 chars)"
              className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2.5 text-sm placeholder:text-white/30 focus:border-white/40 outline-none"
            />
            {error && (
              <div className="text-xs text-red-400 border border-red-500/30 bg-red-500/10 rounded px-3 py-2">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black hover:bg-white/90 rounded-md py-2.5 text-sm font-semibold tracking-wide disabled:opacity-50"
            >
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-5 w-full text-center text-xs text-white/50 hover:text-white"
          >
            {mode === "signin"
              ? "Don't have an account? Create one"
              : "Already have an account? Sign in"}
          </button>
        </div>

        <div className="mt-6 text-center">
          <Link to="/track" className="text-xs text-white/40 hover:text-white">
            Track an order without signing in →
          </Link>
        </div>
      </div>
    </div>
  );
}
