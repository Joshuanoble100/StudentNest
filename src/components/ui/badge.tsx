import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-brand-100 text-brand-800",
        verified: "bg-emerald-100 text-emerald-800",
        pending: "bg-amber-100 text-amber-800",
        rejected: "bg-red-100 text-red-800",
        neutral: "bg-slate-100 text-slate-700",
        outline: "border border-slate-300 text-slate-700",
        accent: "bg-accent-100 text-accent-700",
        info: "bg-sky-100 text-sky-800",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
