"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { REPORT_REASON_LABELS } from "@/lib/constants";

const PROPERTY_REASONS = [
  "FAKE_PROPERTY",
  "SCAM",
  "IMPERSONATION",
  "SUSPICIOUS_PAYMENT_REQUEST",
  "MISLEADING_INFORMATION",
  "HARASSMENT",
  "SPAM",
  "OTHER",
] as const;

const USER_REASONS = [
  "HARASSMENT",
  "IMPERSONATION",
  "SCAM",
  "UNSAFE_BEHAVIOUR",
  "SPAM",
  "ADVERTISING",
  "INAPPROPRIATE_CONTENT",
  "OTHER",
] as const;

const REVIEW_REASONS = [
  "FAKE_REVIEW",
  "SPAM",
  "HARASSMENT",
  "PERSONAL_INFORMATION",
  "THREATS",
  "INAPPROPRIATE_CONTENT",
  "ADVERTISING",
  "OTHER",
] as const;

const REASONS = {
  PROPERTY: PROPERTY_REASONS,
  USER: USER_REASONS,
  REVIEW: REVIEW_REASONS,
  MESSAGE: USER_REASONS,
  CONVERSATION: USER_REASONS,
} as const;

type ReportableTarget = keyof typeof REASONS;

interface ReportDialogProps {
  targetType: ReportableTarget;
  targetId: string;
  /** Review reports use a dedicated endpoint. */
  endpoint?: string;
  label?: string;
  variant?: "ghost" | "outline";
  className?: string;
}

export function ReportDialog({
  targetType,
  targetId,
  endpoint = "/api/reports",
  label = "Report",
  variant = "ghost",
  className,
}: ReportDialogProps) {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);

  const signedIn = status === "authenticated";

  async function submit() {
    if (!reason) {
      toast.error("Choose a reason");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetId,
          reason,
          details: details.trim() || undefined,
          anonymous,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Could not submit report");
        return;
      }
      toast.success("Report submitted. Our team will review it.");
      setOpen(false);
      setReason("");
      setDetails("");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant={variant} size="sm" className={className}>
          <Flag className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report this {targetType.toLowerCase()}</DialogTitle>
          <DialogDescription>
            Reports are reviewed by our team. They never remove content automatically, and you can
            report{signedIn ? " anonymously" : " without an account"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="report-reason">Reason</Label>
            <Select value={reason || undefined} onValueChange={setReason}>
              <SelectTrigger id="report-reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REASONS[targetType].map((value) => (
                  <SelectItem key={value} value={value}>
                    {REPORT_REASON_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="report-details">What happened? (optional)</Label>
            <Textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Include dates, amounts requested, or messages received. Do not include your password or ID numbers."
            />
            <p className="text-xs text-slate-500">{details.length}/2000</p>
          </div>

          {signedIn && (
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
              <Checkbox checked={anonymous} onCheckedChange={(v) => setAnonymous(v === true)} />
              <span>
                Submit anonymously
                <span className="block text-xs text-slate-500">
                  Your name will not be attached to this report.
                </span>
              </span>
            </label>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={submit} disabled={busy}>
            {busy ? "Submitting…" : "Submit report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
