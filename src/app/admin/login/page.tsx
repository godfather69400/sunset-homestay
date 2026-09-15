"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "").trim();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        const message =
          res.status === 401
            ? "That password did not match. Use ADMIN_PASSWORD from Vercel, not the Supabase database password."
            : data.error ?? "Could not sign in. Check ADMIN_PASSWORD and ADMIN_SECRET in Vercel.";
        setError(message);
        toast.error(message);
        setLoading(false);
        return;
      }
      window.location.href = "/admin";
    } catch {
      const message = "Network error. Try again.";
      setError(message);
      toast.error(message);
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[80vh] items-center justify-center px-4 pt-24">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-3xl border bg-card p-6 shadow-soft">
        <h1 className="font-serif text-3xl">Owner login</h1>
        <p className="text-sm text-muted-foreground">
          Type the <span className="font-medium text-foreground">ADMIN_PASSWORD</span> from Vercel, then tap{" "}
          <span className="font-medium text-foreground">Enter dashboard</span>.
        </p>
        <div>
          <Label htmlFor="password">Admin password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="mt-1"
          />
        </div>
        {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Enter dashboard"}
        </Button>
      </form>
    </main>
  );
}
