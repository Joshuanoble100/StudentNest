import type { Metadata } from "next";
import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth-helpers";
import { ROLE_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Not allowed", robots: { index: false } };

/**
 * Reached by `requireRolePage` when a signed-in user lacks the required role.
 * Deliberately vague: it confirms nothing about what the page contains or who
 * may access it beyond the visitor's own role.
 */
export default async function ForbiddenPage() {
  const user = await getSessionUser();

  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <ShieldOff className="h-12 w-12 text-slate-300" aria-hidden />
      <p className="mt-4 text-sm font-semibold text-brand-700">403</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
        That page is not available to your account
      </h1>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        {user ? (
          <>
            You are signed in as <strong className="font-semibold">{user.name}</strong> (
            {ROLE_LABELS[user.role]}). Some areas of StudentNest are restricted to specific account
            types. If you believe this is a mistake, contact support.
          </>
        ) : (
          <>Some areas of StudentNest are restricted. Sign in with an account that has access.</>
        )}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href={user ? "/dashboard" : "/login"}>{user ? "Go to my dashboard" : "Log in"}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/properties">Browse housing</Link>
        </Button>
      </div>
    </div>
  );
}
