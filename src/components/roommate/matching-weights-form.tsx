"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface Weights {
  budgetWeight: number;
  locationWeight: number;
  moveInWeight: number;
  lifestyleWeight: number;
}

const FACTORS = [
  {
    key: "budgetWeight",
    label: "Budget overlap",
    hint: "How much your rent ranges overlap.",
  },
  {
    key: "locationWeight",
    label: "Location",
    hint: "Same campus, same university, or overlapping preferred areas.",
  },
  {
    key: "moveInWeight",
    label: "Move-in date",
    hint: "How close your intended move-in dates are.",
  },
  {
    key: "lifestyleWeight",
    label: "Lifestyle habits",
    hint: "Cleanliness, sleep schedule, study habits, social preference, noise tolerance, smoking and pets.",
  },
] as const;

/**
 * Matching weights, fully user-editable.
 *
 * The score is a weighted average of exactly these four factors and nothing
 * else — weights must total 100 so every percentage point is accounted for and
 * the result can always be explained back to the student.
 */
export function MatchingWeightsForm({ initial }: { initial: Weights }) {
  const router = useRouter();
  const [weights, setWeights] = useState<Weights>(initial);
  const [busy, setBusy] = useState(false);

  const total =
    weights.budgetWeight + weights.locationWeight + weights.moveInWeight + weights.lifestyleWeight;
  const valid = total === 100;

  function set(key: keyof Weights, value: number) {
    setWeights((prev) => ({ ...prev, [key]: Math.max(0, Math.min(100, Math.round(value || 0))) }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid) {
      toast.error(`Weights must add up to 100 (currently ${total})`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/roommates/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(weights),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Could not save your weights");
        return;
      }
      toast.success("Matching weights saved");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <SlidersHorizontal className="h-4 w-4 text-brand-700" aria-hidden />
          How your compatibility score is calculated
        </CardTitle>
        <CardDescription>
          Set how much each factor matters to you. The four weights must total 100. Nothing else —
          not gender, not name, not how long you have been registered — affects the score.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            {FACTORS.map((factor) => (
              <div key={factor.key} className="space-y-1.5">
                <Label htmlFor={factor.key}>{factor.label}</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id={factor.key}
                    type="number"
                    min={0}
                    max={100}
                    step={5}
                    value={weights[factor.key]}
                    onChange={(e) => set(factor.key, Number(e.target.value))}
                    className="w-24"
                    aria-describedby={`${factor.key}-hint`}
                  />
                  <span className="text-sm text-slate-500">%</span>
                  <div
                    className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"
                    role="img"
                    aria-label={`${factor.label}: ${weights[factor.key]} percent`}
                  >
                    <div
                      className="h-full rounded-full bg-brand-600 transition-all"
                      style={{ width: `${weights[factor.key]}%` }}
                    />
                  </div>
                </div>
                <p id={`${factor.key}-hint`} className="text-xs text-slate-500">
                  {factor.hint}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
            <p
              className={cn(
                "text-sm font-semibold tabular-nums",
                valid ? "text-emerald-700" : "text-red-600",
              )}
              aria-live="polite"
            >
              Total: {total}%{valid ? "" : " — must be 100%"}
            </p>
            <Button type="submit" size="sm" disabled={busy || !valid}>
              {busy ? "Saving…" : "Save weights"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() =>
                setWeights({ budgetWeight: 25, locationWeight: 20, moveInWeight: 20, lifestyleWeight: 35 })
              }
            >
              Use defaults
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
