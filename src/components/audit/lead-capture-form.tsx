"use client";

import { Check } from "lucide-react";
import { useState, useTransition } from "react";

import { captureLeadAction } from "@/app/actions/audit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LeadCaptureFormProps {
  /** Audit id from sessionStorage. Null when persistence wasn't configured. */
  auditId: string | null;
  /** Email already attached to the audit, when the submit path captured one. */
  defaultEmail?: string | null;
  /** Tunes the copy for the high-savings case where Credex follow-up is on the table. */
  variant?: "report" | "credex";
}

/**
 * Post-result enrichment: optional company / role / team_size fields for the
 * recipient lifecycle, plus a prefilled email so the user can confirm or swap
 * the inbox tied to this audit before we send the report.
 */
export function LeadCaptureForm({
  auditId,
  defaultEmail = null,
  variant = "report",
}: LeadCaptureFormProps) {
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const state = await captureLeadAction({
        kind: "lead",
        auditId,
        email,
        company: company || undefined,
        role: role || undefined,
        teamSize: teamSize ? Number(teamSize) : undefined,
        honeypot,
      });
      if (state.status === "error") {
        setError(state.message);
        return;
      }
      setDone(true);
    });
  };

  if (done) {
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
          {variant === "credex"
            ? "Got it — Credex will reach out within a working day."
            : "Got it — your audit summary will land in your inbox shortly."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="lead-email">Email</Label>
        <Input
          id="lead-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="you@startup.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
        />
      </div>

      <details className="text-muted-fg text-xs">
        <summary className="hover:text-fg cursor-pointer select-none">
          Add company, role, or team size (optional)
        </summary>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="lead-company" className="text-xs">
              Company
            </Label>
            <Input
              id="lead-company"
              autoComplete="organization"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-role" className="text-xs">
              Role
            </Label>
            <Input
              id="lead-role"
              autoComplete="organization-title"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-team-size" className="text-xs">
              Team size
            </Label>
            <Input
              id="lead-team-size"
              type="number"
              min={1}
              inputMode="numeric"
              value={teamSize}
              onChange={(e) => setTeamSize(e.target.value)}
            />
          </div>
        </div>
      </details>

      {/* Honeypot — visually hidden, hidden from AT, only bots fill it. */}
      <div
        aria-hidden="true"
        className="absolute top-auto -left-[10000px] h-px w-px overflow-hidden"
      >
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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-fg text-xs">
          {variant === "credex"
            ? "We'll send the audit and have Credex follow up about discounted credits."
            : "Your audit summary, plus an email if a new optimization shows up for your stack."}
        </p>
        <Button type="submit" size="md" disabled={isPending}>
          {isPending
            ? "Sending…"
            : variant === "credex"
              ? "Email me + book Credex"
              : "Email me my audit"}
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-warning text-xs">
          {error}
        </p>
      )}
    </form>
  );
}
