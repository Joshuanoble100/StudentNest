"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  count?: number;
  className?: string;
}

const sizeMap = { sm: "h-3.5 w-3.5", md: "h-4 w-4", lg: "h-5 w-5" };

/** Read-only star display with partial-fill support via overlay clipping. */
export function StarRating({ value, max = 5, size = "md", showValue = false, count, className }: StarRatingProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="relative inline-flex" role="img" aria-label={`Rated ${value.toFixed(1)} out of ${max}`}>
        <span className="inline-flex gap-0.5 text-slate-200">
          {Array.from({ length: max }).map((_, i) => (
            <Star key={i} className={sizeMap[size]} aria-hidden />
          ))}
        </span>
        <span className="absolute inset-0 overflow-hidden" style={{ width: `${pct}%` }}>
          <span className="inline-flex gap-0.5 text-amber-400">
            {Array.from({ length: max }).map((_, i) => (
              <Star key={i} className={sizeMap[size]} fill="currentColor" aria-hidden />
            ))}
          </span>
        </span>
      </span>
      {showValue && <span className="text-sm font-semibold text-slate-800">{value.toFixed(1)}</span>}
      {count !== undefined && (
        <span className="text-xs text-slate-500">
          {count} {count === 1 ? "review" : "reviews"}
        </span>
      )}
    </span>
  );
}

interface StarInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  id?: string;
  size?: "sm" | "md" | "lg";
}

/** Accessible interactive rating input (radio group semantics via buttons). */
export function StarInput({ value, onChange, label, id, size = "lg" }: StarInputProps) {
  const [hover, setHover] = React.useState(0);
  const shown = hover || value;
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <div className="flex items-center gap-1" role="radiogroup" aria-label={label ?? "Rating"}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            id={star === 1 ? id : undefined}
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-brand-600"
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(star)}
          >
            <Star
              className={cn(sizeMap[size], star <= shown ? "text-amber-400" : "text-slate-300")}
              fill={star <= shown ? "currentColor" : "none"}
              aria-hidden
            />
          </button>
        ))}
        {value > 0 && <span className="ml-2 text-sm font-medium text-slate-600">{value}/5</span>}
      </div>
    </div>
  );
}
