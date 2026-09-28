import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}

export function Pagination({ page, totalPages, hrefFor }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = pagesAround(page, totalPages);

  return (
    <nav aria-label="Search results pages" className="mt-8 flex items-center justify-center gap-1">
      <PageLink href={page > 1 ? hrefFor(page - 1) : null} label="Previous page" rel="prev">
        <ChevronLeft className="h-4 w-4" aria-hidden />
        <span className="sr-only sm:not-sr-only">Previous</span>
      </PageLink>

      {pages.map((entry, index) =>
        entry === "gap" ? (
          <span key={`gap-${index}`} className="px-2 text-sm text-slate-400" aria-hidden>
            …
          </span>
        ) : (
          <PageLink
            key={entry}
            href={hrefFor(entry)}
            label={`Page ${entry}`}
            current={entry === page}
          >
            {entry}
          </PageLink>
        ),
      )}

      <PageLink href={page < totalPages ? hrefFor(page + 1) : null} label="Next page" rel="next">
        <span className="sr-only sm:not-sr-only">Next</span>
        <ChevronRight className="h-4 w-4" aria-hidden />
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  label,
  current,
  rel,
  children,
}: {
  href: string | null;
  label: string;
  current?: boolean;
  rel?: "prev" | "next";
  children: React.ReactNode;
}) {
  const classes = cn(
    "inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-lg border px-2.5 text-sm font-medium transition-colors",
    current
      ? "border-brand-700 bg-brand-700 text-white"
      : "border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:text-brand-700",
    !href && "pointer-events-none opacity-40",
  );

  if (!href) {
    return (
      <span className={classes} aria-disabled="true" aria-label={label}>
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      rel={rel}
      aria-label={label}
      aria-current={current ? "page" : undefined}
      className={classes}
      scroll={false}
    >
      {children}
    </Link>
  );
}

function pagesAround(page: number, totalPages: number): (number | "gap")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages: (number | "gap")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) pages.push("gap");
  for (let i = start; i <= end; i += 1) pages.push(i);
  if (end < totalPages - 1) pages.push("gap");
  pages.push(totalPages);
  return pages;
}
