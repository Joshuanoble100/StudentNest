"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, List, Map as MapIcon, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SORT_OPTIONS } from "@/lib/constants";
import { applyParams, describeFilter, queryString } from "@/lib/search-url";
import { cn } from "@/lib/utils";
import { SaveSearchButton } from "./save-search-button";

export type ViewMode = "grid" | "list" | "map";

const VIEWS: { value: ViewMode; label: string; icon: typeof LayoutGrid }[] = [
  { value: "grid", label: "Grid view", icon: LayoutGrid },
  { value: "list", label: "List view", icon: List },
  { value: "map", label: "Map view", icon: MapIcon },
];

const CHIP_KEYS = [
  "q",
  "university",
  "city",
  "neighborhood",
  "minRent",
  "maxRent",
  "propertyType",
  "furnishing",
  "bedrooms",
  "bathrooms",
  "maxOccupants",
  "maxDistanceKm",
  "minRating",
  "providerType",
  "verified",
  "availableNow",
] as const;

interface ResultsToolbarProps {
  total: number;
  page: number;
  totalPages: number;
  view: ViewMode;
}

export function ResultsToolbar({ total, page, totalPages, view }: ResultsToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(patch: Record<string, string | null>) {
    const params = applyParams(new URLSearchParams(searchParams.toString()), patch);
    router.push(`${pathname}${queryString(params)}`, { scroll: false });
  }

  const chips: { key: string; value: string }[] = [];
  for (const key of CHIP_KEYS) {
    const value = searchParams.get(key);
    if (value) chips.push({ key, value });
  }
  for (const amenity of searchParams.get("amenities")?.split(",").filter(Boolean) ?? []) {
    chips.push({ key: `amenity:${amenity}`, value: amenity });
  }

  function removeChip(key: string) {
    if (key.startsWith("amenity:")) {
      const amenity = key.slice("amenity:".length);
      const remaining = (searchParams.get("amenities") ?? "")
        .split(",")
        .filter((a) => a && a !== amenity);
      update({ amenities: remaining.length ? remaining.join(",") : null });
      return;
    }
    update({ [key]: null });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600" role="status" aria-live="polite">
          <span className="font-semibold text-slate-900">{total.toLocaleString("en-NG")}</span>{" "}
          {total === 1 ? "listing" : "listings"}
          {totalPages > 1 && ` · page ${page} of ${totalPages}`}
        </p>

        <div className="flex items-center gap-2">
          <SaveSearchButton />
          <label className="sr-only" htmlFor="sort-select">
            Sort results
          </label>
          <Select value={searchParams.get("sort") ?? "newest"} onValueChange={(v) => update({ sort: v })}>
            <SelectTrigger id="sort-select" className="h-9 w-[170px] text-sm">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5" role="group" aria-label="Results layout">
            {VIEWS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => update({ view: value })}
                aria-label={label}
                aria-pressed={view === value}
                title={label}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                  view === value ? "bg-brand-700 text-white" : "text-slate-500 hover:bg-slate-100",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </button>
            ))}
          </div>
        </div>
      </div>

      {chips.length > 0 && (
        <ul className="flex flex-wrap items-center gap-2" aria-label="Active filters">
          {chips.map((chip) => (
            <li key={chip.key}>
              <button
                type="button"
                onClick={() => removeChip(chip.key)}
                className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800 transition-colors hover:border-brand-400"
              >
                {describeFilter(
                  chip.key.startsWith("amenity:") ? "amenities" : chip.key,
                  chip.value.replaceAll("_", " ").toLowerCase(),
                )}
                <X className="h-3 w-3" aria-hidden />
                <span className="sr-only">Remove filter</span>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => router.push(pathname)}
              className="text-xs font-semibold text-slate-500 underline-offset-2 hover:underline"
            >
              Clear all
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
