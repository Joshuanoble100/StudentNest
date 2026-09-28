"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
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
import { INQUIRY_PRESETS, SAFETY_WARNING } from "@/lib/constants";

interface InquiryFormProps {
  propertyId: string;
  propertyTitle: string;
  /** Signed-in viewer state, decided on the server. */
  viewer: { signedIn: boolean; isStudent: boolean; isOwner: boolean };
}

const PRESET_MESSAGES: Record<string, string> = {
  AVAILABILITY: "Hello, is this property still available? I'm a student looking to move in soon.",
  VIEWING_REQUEST: "Hello, I'd like to schedule a viewing. What days and times work for you?",
  TOTAL_COST: "Hello, please confirm the total cost: rent, caution deposit, agency fee and any service charge.",
  DISTANCE: "Hello, how far is the property from campus and what is the walk/transport like?",
  OTHER: "Hello, I have a question about this listing.",
};

/**
 * Structured inquiry form. Messages never expose phone numbers and all contact
 * stays on-platform so there is a record if something goes wrong.
 */
export function InquiryForm({ propertyId, propertyTitle, viewer }: InquiryFormProps) {
  const router = useRouter();
  const [type, setType] = useState("AVAILABILITY");
  const [message, setMessage] = useState(PRESET_MESSAGES.AVAILABILITY!);
  const [viewingDate, setViewingDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  if (!viewer.signedIn) {
    return (
      <div className="space-y-2 text-center">
        <p className="text-sm text-slate-600">Create a free student account to send inquiries.</p>
        <Button asChild className="w-full">
          <Link href={`/login?callbackUrl=${encodeURIComponent(`/properties`)}`}>
            Log in to inquire
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href="/register?role=STUDENT">Register as a student</Link>
        </Button>
      </div>
    );
  }

  if (viewer.isOwner) {
    return (
      <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-600">
        This is your listing. Students can send you inquiries from this page.
      </p>
    );
  }

  if (!viewer.isStudent) {
    return (
      <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-600">
        Inquiries are limited to student accounts so owners can verify genuine interest. You can
        still message the owner directly.
      </p>
    );
  }

  if (sent) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm font-semibold text-emerald-700">Inquiry sent</p>
        <p className="text-sm text-slate-600">
          The owner will respond inside StudentNest. You can track it in your dashboard.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/dashboard/student/inquiries">View my inquiries</Link>
        </Button>
      </div>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (message.trim().length < 5) {
      toast.error("Write a short message first");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          type,
          message: message.trim(),
          viewingDate: type === "VIEWING_REQUEST" && viewingDate ? viewingDate : null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Could not send inquiry");
        return;
      }
      setSent(true);
      toast.success(`Inquiry sent about ${propertyTitle}`);
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="inquiry-type">What do you want to ask?</Label>
        <Select
          value={type}
          onValueChange={(value) => {
            setType(value);
            setMessage(PRESET_MESSAGES[value] ?? PRESET_MESSAGES.OTHER!);
          }}
        >
          <SelectTrigger id="inquiry-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INQUIRY_PRESETS.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {type === "VIEWING_REQUEST" && (
        <div className="space-y-1.5">
          <Label htmlFor="inquiry-date">Preferred viewing date</Label>
          <Input
            id="inquiry-date"
            type="date"
            value={viewingDate}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setViewingDate(e.target.value)}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="inquiry-message">Message</Label>
        <Textarea
          id="inquiry-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          maxLength={1000}
        />
        <p className="text-xs text-slate-500">
          {message.length}/1000 · Do not share passwords or BVN/NIN numbers.
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={busy}>
        <Send className="mr-2 h-4 w-4" aria-hidden />
        {busy ? "Sending…" : "Send inquiry"}
      </Button>

      <p className="text-xs leading-relaxed text-amber-800">{SAFETY_WARNING}</p>
    </form>
  );
}
