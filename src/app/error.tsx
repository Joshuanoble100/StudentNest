"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Segment-level error boundary.
 *
 * Server Component errors arrive with a generic message plus a `digest`, so we
 * show the digest (useful for support) rather than pretending to know the cause.
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <TriangleAlert className="h-12 w-12 text-amber-500" aria-hidden />
      <h1 className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        This page could not be loaded. Your data is safe — try again, and if it keeps happening let
        us know.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-slate-400">Reference: {error.digest}</p>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={retry}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
