"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

function readableError(error: unknown) {
  const fallback = "Unable to sign in right now. Please try again.";
  if (error instanceof Error && error.message && error.message !== "{}") return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message && message !== "{}") return message;
  }
  return fallback;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const local = await fetch("/api/local-auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      if (local.ok) {
        window.location.assign("/dashboard");
        return;
      }
      const result = await createClient().auth.signInWithPassword({ email, password });
      if (result.error) setError(readableError(result.error));
      else { window.location.assign("/dashboard"); }
    } catch (cause) {
      setError(readableError(cause));
    } finally {
      setLoading(false);
    }
  }

  return <main className="grid min-h-screen place-items-center p-5">
    <form onSubmit={submit} className="card w-full max-w-sm p-7">
      <div className="mb-8"><p className="text-xl font-bold">Studio<span className="text-moss">Ops</span></p><h1 className="mt-5 text-2xl font-semibold tracking-tight">Welcome back</h1><p className="mt-2 text-sm text-stone-500">Sign in to manage your studio work.</p></div>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <label className="label">Email</label><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@studio.com" />
      <label className="label mt-4">Password</label><input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      <button disabled={loading} className="btn mt-6 w-full">{loading ? "Signing in…" : "Sign in"}</button>
    </form>
  </main>;
}
