"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export interface NotificationPrefs {
  emailEnabled: boolean;
  inquiryEmails: boolean;
  messageEmails: boolean;
  matchEmails: boolean;
  reviewEmails: boolean;
  marketingEmails: boolean;
  pushEnabled: boolean;
}

const EMAIL_GROUPS: { key: keyof NotificationPrefs; label: string; hint: string }[] = [
  {
    key: "inquiryEmails",
    label: "Inquiries",
    hint: "When a landlord or caretaker replies to a question or viewing request.",
  },
  {
    key: "messageEmails",
    label: "Messages",
    hint: "When someone sends you a message inside StudentNest.",
  },
  {
    key: "matchEmails",
    label: "Matches & saved searches",
    hint: "New roommate matches, and new listings matching a search you saved.",
  },
  {
    key: "reviewEmails",
    label: "Reviews",
    hint: "When an owner responds to your review, or a review lands on your listing.",
  },
  {
    key: "marketingEmails",
    label: "Product updates",
    hint: "Occasional news about StudentNest. Off by default, never required.",
  },
];

/** Per-category email and in-app notification opt-ins. */
export function NotificationPreferencesForm({ initial }: { initial: NotificationPrefs }) {
  const router = useRouter();
  const [prefs, setPrefs] = useState<NotificationPrefs>(initial);
  const [busy, setBusy] = useState(false);

  const dirty = (Object.keys(initial) as (keyof NotificationPrefs)[]).some(
    (key) => prefs[key] !== initial[key],
  );

  function toggle(key: keyof NotificationPrefs, value: boolean) {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Could not save your preferences");
        return;
      }
      toast.success("Notification preferences saved");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <Row
          id="emailEnabled"
          label="Email notifications"
          hint="Master switch. Turning this off stops every email below; in-app notifications still appear."
          checked={prefs.emailEnabled}
          onChange={(value) => toggle("emailEnabled", value)}
        />
        <Separator />
        <Row
          id="pushEnabled"
          label="In-app notifications"
          hint="The bell in the header and your notifications page."
          checked={prefs.pushEnabled}
          onChange={(value) => toggle("pushEnabled", value)}
        />
      </div>

      <fieldset disabled={!prefs.emailEnabled} className="space-y-3">
        <legend className="mb-2 text-sm font-medium text-slate-700">Email me about…</legend>
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 disabled:opacity-60">
          {EMAIL_GROUPS.map((group, index) => (
            <div key={group.key}>
              {index > 0 && <Separator className="mb-3" />}
              <Row
                id={group.key}
                label={group.label}
                hint={group.hint}
                checked={prefs[group.key]}
                onChange={(value) => toggle(group.key, value)}
              />
            </div>
          ))}
        </div>
      </fieldset>

      <Button type="submit" disabled={busy || !dirty}>
        <Save aria-hidden /> {busy ? "Saving…" : dirty ? "Save preferences" : "No changes"}
      </Button>
    </form>
  );
}

function Row({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-medium text-slate-900">
          {label}
        </Label>
        <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} className="mt-1 shrink-0" />
    </div>
  );
}
