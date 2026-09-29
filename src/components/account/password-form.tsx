"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { changePasswordSchema } from "@/lib/validation/auth";

/**
 * Password change. Requires the current password and is rate limited server-side
 * to 5 attempts per 5 minutes.
 */
export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  if (!hasPassword) {
    return (
      <Alert variant="info">
        This account signs in through a linked provider and has no StudentNest password. If you set
        one here you would lock yourself out of that provider flow, so password changes are disabled.
      </Alert>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});

    if (newPassword !== confirm) {
      setErrors({ confirm: "The two new passwords do not match" });
      return;
    }

    const parsed = changePasswordSchema.safeParse({ currentPassword, newPassword });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".") || "form";
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Could not change your password");
        return;
      }
      toast.success("Password changed");
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          aria-invalid={Boolean(errors.currentPassword)}
        />
        {errors.currentPassword && <p className="text-xs text-red-600">{errors.currentPassword}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          aria-invalid={Boolean(errors.newPassword)}
          aria-describedby="newPassword-help"
        />
        <p id="newPassword-help" className="text-xs text-slate-500">
          At least 8 characters, including a letter and a number.
        </p>
        {errors.newPassword && <p className="text-xs text-red-600">{errors.newPassword}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={Boolean(errors.confirm)}
        />
        {errors.confirm && <p className="text-xs text-red-600">{errors.confirm}</p>}
      </div>

      <Button type="submit" disabled={busy}>
        <KeyRound aria-hidden /> {busy ? "Updating…" : "Change password"}
      </Button>
    </form>
  );
}
