"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import { runAuditAction } from "@/app/actions/audit";
import { SiteLogo } from "@/components/site-logo";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  AuditFormSchema,
  DEFAULT_FORM_VALUES,
  USE_CASES,
  type AuditFormInput,
  type AuditFormValues,
} from "@/lib/audit/schema";
import {
  STORAGE_KEYS,
  loadJson,
  localStorageOrNull,
  saveJson,
  sessionStorageOrNull,
} from "@/lib/hooks/use-draft-storage";
import { ALL_TOOLS, TOOLS } from "@/lib/pricing/tools";
import type { ToolId } from "@/lib/pricing/types";

const USE_CASE_LABELS: Record<(typeof USE_CASES)[number], string> = {
  coding: "Coding",
  writing: "Writing",
  data: "Data analysis",
  research: "Research",
  mixed: "Mixed",
};

export default function AuditPage() {
  return (
    <Suspense fallback={null}>
      <AuditPageInner />
    </Suspense>
  );
}

function AuditPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const via = searchParams?.get("via") ?? null;
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [contactEmail, setContactEmail] = useState("");
  // Honeypot — bots fill every input, humans never see this field. Kept in
  // component state so it round-trips through the server action call.
  const [honeypot, setHoneypot] = useState("");

  // The form holds the pre-coercion input shape (numbers may arrive as strings
  // from the `<input>` element); zodResolver coerces on submit and we get
  // `AuditFormValues` in the submit handler.
  const form = useForm<AuditFormInput, undefined, AuditFormValues>({
    resolver: zodResolver(AuditFormSchema),
    defaultValues: DEFAULT_FORM_VALUES,
    mode: "onSubmit",
  });

  // Hydrate from localStorage on mount. Done after first render to avoid SSR hydration drift.
  useEffect(() => {
    const draft = loadJson<AuditFormInput | null>(
      localStorageOrNull(),
      STORAGE_KEYS.draftForm,
      null,
    );
    if (draft) {
      form.reset(draft);
    }
    const draftEmail = loadJson<string>(localStorageOrNull(), STORAGE_KEYS.draftEmail, "");
    if (draftEmail) {
      setContactEmail(draftEmail);
    }
    // Intentionally only run on mount — `form` is stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save every change. localStorage is fast enough that we don't bother debouncing.
  useEffect(() => {
    const sub = form.watch((values) => {
      saveJson(localStorageOrNull(), STORAGE_KEYS.draftForm, values);
    });
    return () => sub.unsubscribe();
  }, [form]);

  useEffect(() => {
    saveJson(localStorageOrNull(), STORAGE_KEYS.draftEmail, contactEmail);
  }, [contactEmail]);

  const fieldArray = useFieldArray({ control: form.control, name: "lines" });

  const onSubmit = (values: AuditFormValues) => {
    setSubmitError(null);
    const email = contactEmail.trim().toLowerCase();
    if (!isPlausibleEmail(email)) {
      setSubmitError("Enter a valid email so we can re-audit this stack later.");
      return;
    }
    startTransition(async () => {
      try {
        const state = await runAuditAction({ input: values, email, honeypot, via });
        if (state.status === "error") {
          setSubmitError(state.message);
          return;
        }
        // Save the result (and id, if persistence was configured) so /audit/result
        // can render without re-running the engine.
        saveJson(sessionStorageOrNull(), STORAGE_KEYS.lastResult, state.result);
        saveJson(sessionStorageOrNull(), STORAGE_KEYS.lastAuditId, state.auditId);
        saveJson(sessionStorageOrNull(), STORAGE_KEYS.lastAuditEmail, email);
        router.push("/audit/result");
      } catch {
        // Server action threw (network, runtime). Without this, startTransition
        // swallows the rejection and the user sees a dead button.
        setSubmitError("Something went wrong running your audit. Please try again.");
      }
    });
  };

  const onChangeTool = (index: number, toolId: ToolId) => {
    const tool = TOOLS[toolId];
    const currentPlanId = form.getValues(`lines.${index}.planId`);
    let planId = currentPlanId;
    if (!tool.plans.some((p) => p.id === currentPlanId)) {
      // The previously-selected plan doesn't exist on the new tool; pick the cheapest non-contract plan as a sensible default.
      const fallback =
        tool.plans.find((p) => !p.requiresContract && p.kind !== "free") ?? tool.plans[0];
      if (fallback) {
        planId = fallback.id;
        form.setValue(`lines.${index}.planId`, fallback.id, { shouldValidate: false });
      }
    }
    suggestListPriceSpend(index, toolId, planId);
  };

  /**
   * Pre-fill the monthly-spend field with the plan's list price × seats whenever
   * the tool, plan, or seat count changes. The engine still trusts whatever
   * value is in the form on submit (annual discounts, grandfathered rates, etc.),
   * but list price is a sensible starting suggestion — users edit if their
   * actual differs. Usage-billed plans (Anthropic API, OpenAI API) have no
   * list price; we leave whatever the user has typed.
   */
  const suggestListPriceSpend = (index: number, toolId: ToolId, planId: string) => {
    const plan = TOOLS[toolId]?.plans.find((p) => p.id === planId);
    if (!plan) return;
    if (plan.kind === "usage") return;
    const rawSeats = Number(form.getValues(`lines.${index}.seats`)) || 1;
    const effectiveSeats = Math.max(rawSeats, plan.minSeats ?? 1);
    const monthly = plan.kind === "free" ? 0 : plan.pricePerSeatMonthly * effectiveSeats;
    form.setValue(`lines.${index}.monthlySpendUsd`, monthly, {
      shouldValidate: false,
    });
  };

  const onChangePlan = (index: number) => {
    const toolId = form.getValues(`lines.${index}.toolId`) as ToolId;
    const planId = form.getValues(`lines.${index}.planId`);
    suggestListPriceSpend(index, toolId, planId);
  };

  const onChangeSeats = (index: number) => {
    const toolId = form.getValues(`lines.${index}.toolId`) as ToolId;
    const planId = form.getValues(`lines.${index}.planId`);
    suggestListPriceSpend(index, toolId, planId);
  };

  const addLine = () => {
    fieldArray.append({
      toolId: "claude",
      planId: "pro",
      seats: 1,
      monthlySpendUsd: 20,
    });
  };

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 lg:px-10 lg:py-16">
      <header className="mb-10">
        <SiteLogo size="sm" />
        <h1 className="balance mt-4 text-4xl font-medium tracking-tight md:text-5xl">
          What does your AI stack actually cost?
        </h1>
        <p className="text-muted-fg pretty mt-3 max-w-xl text-base leading-relaxed">
          Add the tools you pay for. We&apos;ll surface plan-fit issues, cheaper alternatives, and
          credit-based discounts — with a vendor URL for every recommendation.
        </p>
      </header>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" noValidate>
        <Card>
          <CardHeader>
            <CardTitle>Your team</CardTitle>
          </CardHeader>
          <CardBody className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="teamSize">Team size</Label>
              <Input
                id="teamSize"
                type="number"
                min={1}
                inputMode="numeric"
                {...form.register("teamSize")}
              />
              {form.formState.errors.teamSize && (
                <p className="text-warning text-xs">{form.formState.errors.teamSize.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="primaryUseCase">Primary use case</Label>
              <Select id="primaryUseCase" {...form.register("primaryUseCase")}>
                {USE_CASES.map((u) => (
                  <option key={u} value={u}>
                    {USE_CASE_LABELS[u]}
                  </option>
                ))}
              </Select>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Where to send re-audit alerts</CardTitle>
            <p className="text-muted-fg mt-1 text-xs">
              Round 2 stores each audit with an email so pricing-change reruns can reach the same
              inbox later.
            </p>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Email</Label>
              <Input
                id="contactEmail"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@startup.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tools you pay for</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            {fieldArray.fields.map((field, index) => {
              const toolId = form.watch(`lines.${index}.toolId`) as ToolId;
              const tool = TOOLS[toolId];
              const plans = tool?.plans ?? [];
              const errors = form.formState.errors.lines?.[index];

              return (
                <fieldset
                  key={field.id}
                  className="border-border/60 grid gap-3 rounded-xl border p-4 md:grid-cols-[2fr_2fr_1fr_1.5fr_auto]"
                >
                  <legend className="sr-only">Tool {index + 1}</legend>

                  <div className="space-y-2">
                    <Label htmlFor={`tool-${index}`}>Tool</Label>
                    <Select
                      id={`tool-${index}`}
                      {...form.register(`lines.${index}.toolId`, {
                        onChange: (e) => onChangeTool(index, e.target.value as ToolId),
                      })}
                    >
                      {ALL_TOOLS.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.displayName}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`plan-${index}`}>Plan</Label>
                    <Select
                      id={`plan-${index}`}
                      {...form.register(`lines.${index}.planId`, {
                        onChange: () => onChangePlan(index),
                      })}
                    >
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.vendorPlanName}
                        </option>
                      ))}
                    </Select>
                    {errors?.planId && (
                      <p className="text-warning text-xs">{errors.planId.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`seats-${index}`}>Seats</Label>
                    <Input
                      id={`seats-${index}`}
                      type="number"
                      min={1}
                      inputMode="numeric"
                      {...form.register(`lines.${index}.seats`, {
                        onChange: () => onChangeSeats(index),
                      })}
                    />
                    {errors?.seats && (
                      <p className="text-warning text-xs">{errors.seats.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`spend-${index}`}>$/month</Label>
                    <Input
                      id={`spend-${index}`}
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      {...form.register(`lines.${index}.monthlySpendUsd`)}
                    />
                    {errors?.monthlySpendUsd ? (
                      <p className="text-warning text-xs">{errors.monthlySpendUsd.message}</p>
                    ) : (
                      <p className="text-muted-fg text-[11px]">
                        Pre-filled from list price · edit if your actual differs
                      </p>
                    )}
                  </div>

                  <div className="flex items-end justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => fieldArray.remove(index)}
                      disabled={fieldArray.fields.length === 1}
                      aria-label={`Remove tool ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </fieldset>
              );
            })}

            {form.formState.errors.lines?.message && (
              <p className="text-warning text-sm">{form.formState.errors.lines.message}</p>
            )}

            <Button type="button" variant="secondary" size="md" onClick={addLine}>
              <Plus className="h-4 w-4" />
              Add a tool
            </Button>
          </CardBody>
        </Card>

        {/* Honeypot — visually hidden, hidden from assistive tech, only bots fill it. */}
        <div
          aria-hidden="true"
          className="absolute top-auto -left-[10000px] h-px w-px overflow-hidden"
        >
          <label>
            Leave this field empty
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </label>
        </div>

        <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-fg text-xs">
            This audit is stored with your email so Snipper can re-run it if pricing changes.
          </p>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <Button type="submit" size="lg" className="sm:min-w-44" disabled={isPending}>
              {isPending ? "Running…" : "Run my audit"}
              <ArrowRight className="h-4 w-4" />
            </Button>
            {submitError && (
              <p role="alert" className="text-warning text-xs">
                {submitError}
              </p>
            )}
          </div>
        </div>
      </form>
    </main>
  );
}

function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
