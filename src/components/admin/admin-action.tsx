"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AdminActionProps {
  /** API route to POST to, e.g. /api/admin/reviews/123/moderate */
  endpoint: string;
  /** Extra fields merged into the JSON body. */
  body?: Record<string, unknown>;
  action: string;
  label: string;
  description?: string;
  /** When set, a reason textarea is required before the action can run. */
  requiresReason?: boolean;
  reasonField?: string;
  reasonLabel?: string;
  variant?: "default" | "outline" | "destructive" | "ghost";
  size?: "sm" | "default";
}

/**
 * One dialog-backed moderation action.
 *
 * Every destructive decision in the admin panel goes through this so a reason
 * can be made mandatory in the UI as well as the API — moderation is never
 * silent, and every action lands in the audit log server-side.
 */
export function AdminAction({
  endpoint,
  body,
  action,
  label,
  description,
  requiresReason = false,
  reasonField = "reason",
  reasonLabel = "Reason (shown to the affected user)",
  variant = "outline",
  size = "sm",
}: AdminActionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function run() {
    if (requiresReason && reason.trim().length < 5) {
      toast.error("A reason of at least 5 characters is required");
      return;
    }
    startTransition(async () => {
      const payload: Record<string, unknown> = { action, ...body };
      if (reason.trim()) payload[reasonField] = reason.trim();

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(json?.error?.message ?? "That action could not be completed");
        return;
      }
      toast.success(`${label} recorded`);
      setOpen(false);
      setReason("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size={size} variant={variant}>
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {requiresReason ? (
          <div className="space-y-1.5">
            <Label htmlFor={`reason-${action}`}>{reasonLabel}</Label>
            <Textarea
              id={`reason-${action}`}
              rows={4}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <p className="text-xs text-slate-500">
              Stored with the decision, written to the audit log, and shown to the person
              affected. Be specific and factual.
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            This is recorded in the audit log against your account.
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={variant === "destructive" ? "destructive" : "default"}
            disabled={pending}
            onClick={run}
          >
            {pending ? "Working…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
