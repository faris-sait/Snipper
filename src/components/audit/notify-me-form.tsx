"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  STORAGE_KEYS,
  loadJson,
  localStorageOrNull,
  saveJson,
} from "@/lib/hooks/use-draft-storage";

interface StoredSignup {
  email: string;
  savedAt: string;
}

/**
 * Optimal-path lead capture (per brief: "still capture the lead with a 'notify
 * me when new optimizations apply' signup"). Stores the email locally so we can
 * migrate it to the Supabase + Resend pipeline in Phase 5 without losing the
 * lead. Visible only on optimal / low-savings audits — high-savings audits get
 * the Credex CTA instead.
 */
export function NotifyMeForm() {
  const [email, setEmail] = useState("");
  const [signup, setSignup] = useState<StoredSignup | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const existing = loadJson<StoredSignup | null>(
      localStorageOrNull(),
      STORAGE_KEYS.notifySignup,
      null,
    );
    if (existing) {
      // One-time hydration from localStorage on mount. This *is* the sync
      // boundary with the external store, not avoidable effect-driven state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSignup(existing);
    }
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!isPlausibleEmail(trimmed)) {
      setError("Enter a valid email");
      return;
    }
    const entry: StoredSignup = { email: trimmed, savedAt: new Date().toISOString() };
    saveJson(localStorageOrNull(), STORAGE_KEYS.notifySignup, entry);
    setSignup(entry);
  };

  if (signup) {
    return (
      <div
        className="border-success/40 bg-success/5 flex items-center gap-3 rounded-xl border px-4 py-3"
        role="status"
        aria-live="polite"
      >
        <span className="bg-success/15 text-success flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
          <Check className="h-3.5 w-3.5" aria-hidden />
        </span>
        <p className="text-fg pretty text-sm leading-relaxed">
          We&apos;ll email <span className="font-medium">{signup.email}</span> when a new
          optimization applies to your stack.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@startup.com"
          aria-label="Email address"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          className="sm:flex-1"
        />
        <Button type="submit" variant="secondary" size="md" className="sm:shrink-0">
          Notify me
        </Button>
      </div>
      {error ? (
        <p className="text-warning text-xs">{error}</p>
      ) : (
        <p className="text-muted-fg text-xs">
          One email when something materially changes for your stack. No newsletter, no
          drip campaign.
        </p>
      )}
    </form>
  );
}

function isPlausibleEmail(value: string): boolean {
  // Intentionally loose — server-side validation is the source of truth and
  // browsers already do their own pass via type="email". This catches the
  // accidental typo without rejecting valid edge-case addresses.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
