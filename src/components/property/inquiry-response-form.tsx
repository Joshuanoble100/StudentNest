"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inquiryResponseSchema } from "@/lib/validation/messaging";

type ResponseStatus = "RESPONDED" | "VIEWING_SCHEDULED" | "CLOSED";

interface InquiryResponseFormProps {
  inquiryId: string;
  inquiryType: string;
  closed?: boolean;
}

/**
 * Owner reply to a student inquiry.
 *
 * The student sees exactly what is typed here — nothing is filtered or hidden.
 * There is no phone field: contact stays on-platform so students cannot be
 * pushed off-record before a viewing.
 */
export function InquiryResponseForm({ inquiryId, inquiryType, closed = false }: InquiryResponseFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ResponseStatus>(
    inquiryType === "VIEWING_REQUEST" ? "VIEWING_SCHEDULED" : "RESPONDED",
  );
  const [response, setResponse] = useState("");
  const [viewingDate, setViewingDate] = useState("");
  const [busy, startTransition] = useTransition();

  if (closed) {
    return <p className="text-xs text-slate-500">This inquiry is closed and can no longer be replied to.</p>;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = inquiryResponseSchema.safeParse({
      status,
      response,
      viewingDate: viewingDate || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please complete the reply");
      return;
    }

    startTransition(async () => {
      const res = await fetch(`/api/inquiries/${inquiryId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Could not send that reply");
        return;
      }
      toast.success("Reply sent to the student");
      setOpen(false);
      setResponse("");
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <MessageSquare aria-hidden /> Reply
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`status-${inquiryId}`}>Outcome</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as ResponseStatus)}>
            <SelectTrigger id={`status-${inquiryId}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RESPONDED">Answered</SelectItem>
              <SelectItem value="VIEWING_SCHEDULED">Viewing scheduled</SelectItem>
              <SelectItem value="CLOSED">Close without a viewing</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {status === "VIEWING_SCHEDULED" && (
          <div className="space-y-1.5">
            <Label htmlFor={`date-${inquiryId}`}>Viewing date</Label>
            <Input
              id={`date-${inquiryId}`}
              type="datetime-local"
              value={viewingDate}
              onChange={(e) => setViewingDate(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`response-${inquiryId}`}>Your reply</Label>
        <Textarea
          id={`response-${inquiryId}`}
          rows={4}
          maxLength={2000}
          required
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="Answer the question directly. If the property is gone, say so and close the inquiry."
        />
        <p className="text-xs text-slate-500">
          The student sees this verbatim. Do not ask for a deposit before an in-person viewing.
        </p>
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          <Send aria-hidden /> Send reply
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
