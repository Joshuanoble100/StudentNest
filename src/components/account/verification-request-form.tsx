"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck, Upload, X } from "lucide-react";
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
import { VERIFICATION_TYPE_LABELS } from "@/lib/constants";

interface VerificationRequestFormProps {
  hasPendingRequest: boolean;
}

const TYPE_HINTS: Record<string, string> = {
  IDENTITY: "A government-issued photo ID: NIN slip, driver's licence, voter's card or international passport.",
  OWNERSHIP: "Proof you own or manage the property: deed, tenancy/management agreement, or a recent utility bill in your name for that address.",
  AGENCY_LICENSE: "Your agency registration with the relevant state body, plus your staff ID if you are listing on behalf of a firm.",
};

/**
 * Submit identity / ownership / agency proof.
 *
 * Documents are uploaded to a private folder and are only ever rendered to
 * admins inside the moderation panel. Submitting never grants a badge on its
 * own — an admin decision does, and the reason is recorded either way.
 */
export function VerificationRequestForm({ hasPendingRequest }: VerificationRequestFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<string>("IDENTITY");
  const [fullName, setFullName] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [documents, setDocuments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  async function upload(file: File | undefined) {
    if (!file) return;
    if (documents.length >= 5) {
      toast.error("You can attach up to 5 documents");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", "verification");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Upload failed");
        return;
      }
      setDocuments((prev) => [...prev, json.data.url]);
      toast.success("Document uploaded — it is stored privately");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (fullName.trim().length < 3) {
      toast.error("Enter the full name on your document");
      return;
    }
    if (documents.length === 0) {
      toast.error("Attach at least one document");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          documentUrls: documents,
          submittedData: {
            fullName: fullName.trim(),
            documentNumber: documentNumber.trim() || null,
            notes: notes.trim() || null,
          },
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Could not submit this request");
        return;
      }
      toast.success("Submitted. Our team will review it and notify you.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (hasPendingRequest) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        You already have a request in the queue. We review in the order they arrive; you will get
        a notification and an email with the outcome. You cannot submit a second one until this
        one is decided.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="verification-type">What are you verifying?</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger id="verification-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(VERIFICATION_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-slate-500">{TYPE_HINTS[type]}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="verification-name">Full name on the document</Label>
          <Input
            id="verification-name"
            required
            maxLength={150}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="verification-number">Document number</Label>
          <Input
            id="verification-number"
            maxLength={80}
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="verification-notes">Anything we should know (optional)</Label>
        <Textarea
          id="verification-notes"
          rows={3}
          maxLength={1000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. The property is registered in my company's name; the deed is attached."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="verification-file">Documents</Label>
        <input
          id="verification-file"
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => upload(e.target.files?.[0])}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
            <Upload aria-hidden /> {uploading ? "Uploading…" : "Attach a document"}
          </Button>
          <span className="text-xs text-slate-500">{documents.length}/5 · JPEG, PNG or WebP</span>
        </div>
        {documents.length > 0 && (
          <ul className="space-y-1">
            {documents.map((url, index) => (
              <li key={url} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="truncate text-slate-700">Document {index + 1}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label={`Remove document ${index + 1}`}
                  onClick={() => setDocuments((prev) => prev.filter((_, i) => i !== index))}
                >
                  <X aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-slate-500">
          Stored privately. Only our moderation team can open these — they are never shown to
          students or other landlords, and never appear on your public profile.
        </p>
      </div>

      <Button type="submit" disabled={busy}>
        <ShieldCheck aria-hidden /> {busy ? "Submitting…" : "Submit for review"}
      </Button>
    </form>
  );
}
