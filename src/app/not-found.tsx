import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE_NAME } from "@/lib/constants";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <SearchX className="h-12 w-12 text-slate-300" aria-hidden />
      <p className="mt-4 text-sm font-semibold text-brand-700">404</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
        We could not find that page
      </h1>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        The listing may have been removed by its owner, taken down by our moderation team, or the
        link may be mistyped. Nothing has been hidden from you without reason.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/properties">Search student housing</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">{SITE_NAME} home</Link>
        </Button>
      </div>
    </div>
  );
}
