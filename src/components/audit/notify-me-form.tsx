"use client";

import { Check } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { captureLeadAction } from "@/app/actions/audit";
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

interface NotifyMeFormProps {
  /**
   * Optional audit context — when present, the signup is tagged with the audit
   * id so we know which stack prompted it. Null when persistence isn't
   * configured (local-only mode); the form still works via localStorage.
   */
  auditId?: string | null;
}

/**
 * Optimal-path lead capture (per brief: "still capture the lead with a 'notify
 * me when new optimizations apply' signup"). Calls the captureLeadAction server
 * action when persistence is configured; falls back to localStorage otherwise
 * so dev / take-home reviewers without a Supabase project don't lose the lead.
 */
export function NotifyMeForm({ auditId = null }: NotifyMeFormProps) {
  const [email, setEmail] = useState("");
  const [signup, setSignup] = useState<StoredSignup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const [isPending, startTransition] = useTransition();

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
    setError(null);
    startTransition(async () => {
      const state = await captureLeadAction({
        kind: "notify",
        auditId,
        email,
        honeypot,
      });
      if (state.status === "error") {
        setError(state.message);
        return;
      }
      const entry: StoredSignup = {
        email: email.trim().toLowerCase(),
        savedAt: new Date().toISOString(),
      };
      // Mirror to localStorage even on a successful server-action call — gives
      // a second-source-of-truth if the user comes back later in the same browser.
      saveJson(localStorageOrNull(), STORAGE_KEYS.notifySignup, entry);
      setSignup(entry);
    });
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
        <Button
          type="submit"
          variant="secondary"
          size="md"
          className="sm:shrink-0"
          disabled={isPending}
        >
          {isPending ? "Saving…" : "Notify me"}
        </Button>
      </div>

      {/* Honeypot — visually hidden, hidden from AT, only bots fill it. */}
      <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
        <label>
          Leave empty
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </label>
      </div>

      {error ? (
        <p role="alert" className="text-warning text-xs">
          {error}
        </p>
      ) : (
        <p className="text-muted-fg text-xs">
          One email when something materially changes for your stack. No newsletter, no
          drip campaign.
        </p>
      )}
    </form>
  );
}
