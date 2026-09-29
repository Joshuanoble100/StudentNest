import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  BadgeCheck,
  Eye,
  Flag,
  Lock,
  MessageSquare,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/account/page-header";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SAFETY_WARNING, SITE_NAME, VERIFICATION_EXPLAINER } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Safety center · ${SITE_NAME}`,
  description:
    "How to avoid housing scams as a student in Nigeria, what our verification badge actually means, how reviews are moderated, and what to do if something goes wrong.",
  alternates: { canonical: "/safety" },
};

const RED_FLAGS = [
  "Asking for a deposit or “commitment fee” before you have seen the place in person.",
  "A price far below every other listing in the same area.",
  "Refusing a physical viewing, or offering a video call instead of a key to the door.",
  "Pressure to pay today because “two other students are coming this afternoon”.",
  "Payment to a personal bank account or a name that does not match the owner or agency.",
  "Photos that look like a hotel, a show home, or the same images across several listings.",
  "Asking you to move the conversation to WhatsApp and stop using StudentNest messages.",
  "No receipt, no agreement, or a refusal to put anything in writing.",
];

const BEFORE_YOU_PAY = [
  "See the property yourself. If you cannot travel yet, send someone you trust who will video-call you from inside the building, not outside the gate.",
  "Confirm who you are paying. Ask for the owner's ID or the agency's registration and match it against the name on the account or receipt.",
  "Ask the caretaker or a current tenant directly whether the person collecting money actually manages the building.",
  "Get the total cost in writing: rent, caution deposit, agency fee, service charge, and any “agreement” fee. Hidden fees are the most common complaint students make.",
  "Pay by transfer you can trace, never cash, and keep the receipt.",
  "Sign a tenancy agreement before handing over money for more than a reservation.",
];

export default function SafetyPage() {
  return (
    <div className="container-page py-8">
      <PageHeader
        title="Safety center"
        description="Housing scams target students because students are new to an area, under time pressure, and often paying a full year up front. This page is what we wish someone had handed every student before they paid."
      />

      <Alert variant="danger" className="mb-6">
        <AlertTitle>The one rule that prevents most losses</AlertTitle>
        <p className="text-sm">{SAFETY_WARNING}</p>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-brand-700" aria-hidden />
              Before you pay
            </CardTitle>
            <CardDescription>Work through these every time, even when the listing looks perfect.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2.5 text-sm text-slate-700">
              {BEFORE_YOU_PAY.map((item, index) => (
                <li key={item} className="flex gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {index + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden />
              Red flags
            </CardTitle>
            <CardDescription>
              Any one of these is enough to walk away. You will find another place; you will not
              necessarily find the money again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-700">
              {RED_FLAGS.map((flag) => (
                <li key={flag} className="flex gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" aria-hidden />
                  {flag}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-brand-700" aria-hidden />
              What “Verified” means
            </CardTitle>
            <CardDescription>We would rather be precise than impressive.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <p>{VERIFICATION_EXPLAINER}</p>
            <p>
              A badge is issued by a human moderator who records what evidence they checked, and
              every one of those decisions is written to an audit log. A listing without a badge is
              not being called a scam — it means nobody has checked it yet, and that uncertainty is
              shown rather than hidden.
            </p>
            <p>
              <span className="font-medium">Featured</span> is different: that is a paid placement
              bought by an owner. It says nothing about quality and it cannot be bought by anyone
              whose listing has not already passed moderation.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" aria-hidden />
              How reviews are protected
            </CardTitle>
            <CardDescription>
              Reviews are the reason this platform exists, so they are defended deliberately.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <p>
              Owners and agents can publish a response to any review. They cannot delete one, edit
              one, or pay to have one removed.
            </p>
            <p>
              A review is only hidden or rejected by a moderator, who must record a written reason.
              That reason is stored with the decision, shown to the reviewer, and logged against the
              moderator&rsquo;s account — so silent censorship is not possible.
            </p>
            <p>
              Reviews are labelled{" "}
              <span className="font-medium">verified stay</span>,{" "}
              <span className="font-medium">verified reviewer</span> or{" "}
              <span className="font-medium">unverified</span> depending on what we could actually
              confirm. We never mark something verified when we have not checked it.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-red-600" aria-hidden />
              Reporting a listing or a person
            </CardTitle>
            <CardDescription>
              Every property, review, message and profile has a Report button.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <p>
              You can report anonymously. If you do not, your name is visible to our moderators but
              never to the person you reported.
            </p>
            <p>
              Reports alleging a scam or a fake listing raise an urgent notification to the
              moderation team immediately. A report is treated as a claim to investigate, not as a
              verdict — we check the listing, the owner&rsquo;s evidence and the history before
              acting, and we record the outcome either way.
            </p>
            <p>
              Reporting something that turns out to be fine is not a failure. It is how fake
              listings get caught early.
            </p>
            <div className="pt-1">
              <Button asChild variant="outline" size="sm">
                <Link href="/properties">Browse listings</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-slate-600" aria-hidden />
              Your privacy
            </CardTitle>
            <CardDescription>What we hide from other users, and why.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <p>
              <span className="font-medium">Phone numbers are never exchanged.</span> Contact happens
              through in-platform messaging so neither side can harvest the other&rsquo;s number, and
              so there is a record if a conversation turns into harassment.
            </p>
            <p>
              <span className="font-medium">Listing addresses are approximate.</span> Public pages
              show the area and an approximate pin, not a door number. The exact location is shared
              by the owner once you are arranging a viewing.
            </p>
            <p>
              <span className="font-medium">Identity documents stay private.</span> Verification
              documents are stored outside the public file directory and can only be opened by a
              moderator through an access-controlled route. Every open is written to the audit log.
            </p>
            <p>
              You can block anyone from messaging you, and blocked users cannot start a new
              conversation.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-brand-700" aria-hidden />
            Sharing with a roommate
          </CardTitle>
          <CardDescription>
            Compatibility scores help you shortlist. They are not a character reference.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <p>
            A match percentage is computed only from what two people told us about budget, area,
            move-in date and living habits. Gender, ethnicity, religion and disability are never
            part of the score — the gender filter is applied only when a user explicitly asks for
            it, and it never changes anybody&rsquo;s number.
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Meet in a public place first, and tell a friend where you are going.</li>
            <li>View the property together before either of you pays anything.</li>
            <li>Agree the split in writing, including who pays the deposit and what happens if one of you leaves.</li>
            <li>Do not send money to a prospective roommate for “your share” before the landlord has confirmed the space.</li>
          </ul>
          <div className="pt-1">
            <Button asChild variant="outline" size="sm">
              <Link href="/roommates">Find a roommate</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6 border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-800">
            <Eye className="h-5 w-5" aria-hidden />
            If you have already paid and something is wrong
          </CardTitle>
          <CardDescription>Act quickly — the first hours matter most.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>Report the listing and the person on {SITE_NAME} so no other student is sent to them.</li>
            <li>
              Contact your bank immediately and ask them to attempt a recall on the transfer. Save
              the transaction reference.
            </li>
            <li>
              Keep every message, receipt and screenshot. Export the conversation from{" "}
              <Link href="/messages" className="font-medium underline">
                your messages
              </Link>{" "}
              before anything is deleted.
            </li>
            <li>
              Report the fraud to the Nigeria Police Force Cybercrime Unit or the EFCC, and tell
              your institution&rsquo;s student affairs office — they often know whether the same
              person has targeted other students.
            </li>
            <li>
              If you were threatened or feel unsafe, contact campus security or the police first and
              let us know through your report so we can preserve the account&rsquo;s data.
            </li>
          </ol>
          <p className="pt-1 text-xs text-slate-500">
            {SITE_NAME} is not a bank, a law-enforcement agency or a party to your tenancy
            agreement. We can remove a listing, suspend an account and hand over the records we hold
            when asked by the proper authorities.
          </p>
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <p className="flex items-center gap-2 text-sm text-slate-700">
          <MessageSquare className="h-4 w-4 text-slate-400" aria-hidden />
          Every listing, review, profile and conversation has a Report button — reports can be filed
          anonymously.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/properties">Find the listing to report</Link>
        </Button>
      </div>
    </div>
  );
}
