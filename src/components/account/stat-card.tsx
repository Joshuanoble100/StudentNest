import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  icon?: LucideIcon;
  tone?: "default" | "warning" | "positive";
}

/** Compact metric tile used across the student, landlord and admin overviews. */
export function StatCard({ label, value, hint, href, icon: Icon, tone = "default" }: StatCardProps) {
  const body = (
    <Card
      className={cn(
        "p-4 transition-colors",
        href && "hover:border-brand-300 hover:bg-brand-50/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        {Icon && <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />}
      </div>
      <p
        className={cn(
          "mt-1 text-2xl font-bold tabular-nums",
          tone === "warning" && "text-amber-600",
          tone === "positive" && "text-emerald-700",
          tone === "default" && "text-slate-900",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </Card>
  );

  if (!href) return body;
  return (
    <Link href={href} className="block rounded-xl focus-visible:outline-2 focus-visible:outline-brand-600">
      {body}
    </Link>
  );
}
