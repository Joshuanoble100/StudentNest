"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Heart, MessageSquare } from "lucide-react";
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

interface RoommateActionsProps {
  /** The profile owner's user id — conversations are between users, not profiles. */
  userId: string;
  profileId: string;
  name: string;
  initialFavorited: boolean;
  signedIn: boolean;
  /** True when the viewer is looking at their own profile. */
  isOwn?: boolean;
}

const MIN_MESSAGE = 30;

/**
 * Save and contact actions for a roommate profile.
 *
 * Contact goes through internal messaging only. Phone numbers are never shown
 * on either side, and the first message is written by the sender rather than
 * auto-generated so nobody receives a canned line they did not choose.
 */
export function RoommateActions({
  userId,
  profileId,
  name,
  initialFavorited,
  signedIn,
  isOwn = false,
}: RoommateActionsProps) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState(
    `Hi ${name.split(" ")[0]}, I saw your roommate profile on StudentNest. `,
  );
  const [pending, startTransition] = useTransition();

  function requireSignIn() {
    if (signedIn) return true;
    toast.info("Log in or create an account to save and message roommates");
    signIn(undefined, { callbackUrl: window.location.href });
    return false;
  }

  function toggleFavorite() {
    if (!requireSignIn()) return;
    startTransition(async () => {
      const res = await fetch(`/api/roommates/${profileId}/favorite`, { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Could not update your saved list");
        return;
      }
      setFavorited(Boolean(json?.data?.favorited));
      toast.success(json?.data?.favorited ? "Saved to your list" : "Removed from your list");
    });
  }

  function send() {
    if (!requireSignIn()) return;
    if (body.trim().length < MIN_MESSAGE) {
      toast.error(`Write at least ${MIN_MESSAGE} characters so your message is worth replying to`);
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: userId,
          subject: `ROOMMATE:${profileId}`.slice(0, 120),
          firstMessage: body.trim(),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Could not start the conversation");
        return;
      }
      setOpen(false);
      router.push(`/messages/${json.data.id}`);
    });
  }

  if (isOwn) {
    return (
      <p className="text-sm text-slate-500">
        This is your own profile — edit it from{" "}
        <Button asChild variant="link" size="sm" className="h-auto p-0">
          <a href="/dashboard/student/roommate">your roommate dashboard</a>
        </Button>
        .
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" onClick={toggleFavorite} disabled={pending}>
        <Heart
          className={`mr-2 h-4 w-4 ${favorited ? "fill-red-500 text-red-500" : ""}`}
          aria-hidden
        />
        {favorited ? "Saved" : "Save"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" onClick={() => requireSignIn()}>
            <MessageSquare className="mr-2 h-4 w-4" aria-hidden />
            Message
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message {name}</DialogTitle>
            <DialogDescription>
              Sent through StudentNest. Neither of you can see the other&rsquo;s phone number, so
              say what you are actually looking for — budget, area, and when you want to move.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="roommate-message">Your message</Label>
            <Textarea
              id="roommate-message"
              rows={5}
              maxLength={2000}
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
            <p className="text-xs text-slate-500">
              {body.trim().length}/{MIN_MESSAGE} characters minimum. Do not ask to move money before
              you have met in person.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={send} disabled={pending}>
              {pending ? "Sending…" : "Send message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
