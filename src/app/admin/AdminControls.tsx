"use client";

import { useActionState, useId } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

import {
  clearPricingOverrideAction,
  runDetectChangesAction,
  setPricingOverrideAction,
  type AdminActionResult,
} from "./actions";

export interface ToolOption {
  id: string;
  displayName: string;
  plans: { id: string; vendorPlanName: string; pricePerSeatMonthly: number }[];
}

export interface ActiveOverride {
  toolId: string;
  planId: string;
  toolDisplayName: string;
  planName: string;
  baselinePrice: number;
  overridePrice: number;
  updatedAt: string;
}

export function AdminControls({
  tools,
  activeOverrides,
}: {
  tools: ToolOption[];
  activeOverrides: ActiveOverride[];
}) {
  return (
    <section className="mt-12 space-y-6">
      <h2 className="text-xs font-mono uppercase tracking-tight text-muted-fg">
        Live pricing controls
      </h2>

      <Card>
        <CardHeader>
          <CardTitle>Set or update a pricing override</CardTitle>
          <p className="text-muted-fg mt-1 text-xs">
            Mutates the live pricing the audit engine reads. Affected audits
            will pick this up the next time detect-changes runs.
          </p>
        </CardHeader>
        <CardBody>
          <SetOverrideForm tools={tools} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Run detect-changes now</CardTitle>
          <p className="text-muted-fg mt-1 text-xs">
            Same code path as <code>POST /api/detect-changes</code> — no bearer
            token required from the dashboard.
          </p>
        </CardHeader>
        <CardBody>
          <RunDetectChangesForm />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active overrides</CardTitle>
          <p className="text-muted-fg mt-1 text-xs">
            Every row here mutates a plan&apos;s price away from the in-code
            registry. Clear them when you&apos;re done testing.
          </p>
        </CardHeader>
        <CardBody>
          {activeOverrides.length === 0 ? (
            <p className="text-muted-fg text-sm">No overrides are active.</p>
          ) : (
            <ul className="space-y-3">
              {activeOverrides.map((row) => (
                <li
                  key={`${row.toolId}:${row.planId}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-md border border-border/60 bg-background/40 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {row.toolDisplayName}{" "}
                      <span className="text-muted-fg font-normal">
                        · {row.planName}
                      </span>
                    </p>
                    <p className="text-muted-fg font-mono text-[11px] tracking-tight">
                      ${row.baselinePrice}/seat → ${row.overridePrice}/seat
                    </p>
                  </div>
                  <ClearOverrideForm toolId={row.toolId} planId={row.planId} />
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </section>
  );
}

function SetOverrideForm({ tools }: { tools: ToolOption[] }) {
  const toolSelectId = useId();
  const planSelectId = useId();
  const priceId = useId();

  const [state, formAction, pending] = useActionState<
    AdminActionResult | null,
    FormData
  >(setPricingOverrideAction, null);

  // Render plan options grouped per tool; the browser-native <select> doesn't
  // support reactive filtering without client state, so we list every plan
  // prefixed with its tool. With ~10 tools and ~25 plans total this is fine.
  const allPlans = tools.flatMap((tool) =>
    tool.plans.map((plan) => ({
      key: `${tool.id}:${plan.id}`,
      label: `${tool.displayName} · ${plan.vendorPlanName} · $${plan.pricePerSeatMonthly}/seat baseline`,
      toolId: tool.id,
      planId: plan.id,
    })),
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <input type="hidden" id={toolSelectId} />
        <div className="space-y-1.5">
          <Label htmlFor={planSelectId}>Plan</Label>
          <Select
            id={planSelectId}
            name="targetKey"
            required
            defaultValue=""
            onChange={(event) => {
              const target = event.target as HTMLSelectElement;
              const form = target.form;
              if (!form) return;
              const [toolId, planId] = target.value.split(":");
              (form.elements.namedItem("toolId") as HTMLInputElement).value =
                toolId ?? "";
              (form.elements.namedItem("planId") as HTMLInputElement).value =
                planId ?? "";
            }}
          >
            <option value="" disabled>
              Select a plan…
            </option>
            {allPlans.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </Select>
          <input type="hidden" name="toolId" defaultValue="" />
          <input type="hidden" name="planId" defaultValue="" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={priceId}>New $/seat/month</Label>
          <Input
            id={priceId}
            type="number"
            min={0}
            step={1}
            name="pricePerSeatMonthly"
            placeholder="60"
            required
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Applying…" : "Apply override"}
        </Button>
        <ActionStatus state={state} />
      </div>
    </form>
  );
}

function ClearOverrideForm({ toolId, planId }: { toolId: string; planId: string }) {
  const [state, formAction, pending] = useActionState<
    AdminActionResult | null,
    FormData
  >(clearPricingOverrideAction, null);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="toolId" value={toolId} />
      <input type="hidden" name="planId" value={planId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "Clearing…" : "Clear"}
      </Button>
      <ActionStatus state={state} muted />
    </form>
  );
}

function RunDetectChangesForm() {
  const [state, formAction, pending] = useActionState<
    AdminActionResult | null,
    FormData
  >(runDetectChangesAction, null);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <Button type="submit" disabled={pending}>
        {pending ? "Running…" : "Run detect-changes"}
      </Button>
      <ActionStatus state={state} />
    </form>
  );
}

function ActionStatus({
  state,
  muted = false,
}: {
  state: AdminActionResult | null;
  muted?: boolean;
}) {
  if (!state) return null;
  const tone =
    state.status === "ok"
      ? muted
        ? "text-muted-fg"
        : "text-emerald-700 dark:text-emerald-400"
      : "text-red-600 dark:text-red-400";
  return <p className={`text-xs ${tone}`}>{state.message}</p>;
}
