"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AMENITY_LABELS, FURNISHING_LABELS, PROPERTY_TYPE_LABELS, PROVIDER_TYPE_LABELS } from "@/lib/constants";
import { applyParams, queryString, readList } from "@/lib/search-url";
import type { AmenityKey } from "@/lib/types";

const ALL = "__all__";

interface FilterPanelProps {
  universities: { shortName: string; name: string }[];
  cities: string[];
  neighborhoods: { name: string; slug: string }[];
}

interface Draft {
  q: string;
  university: string;
  city: string;
  neighborhood: string;
  minRent: string;
  maxRent: string;
  propertyType: string;
  furnishing: string;
  bedrooms: string;
  bathrooms: string;
  maxOccupants: string;
  amenities: AmenityKey[];
  maxDistanceKm: string;
  minRating: string;
  providerType: string;
  verified: boolean;
  availableNow: boolean;
}

function draftFromParams(sp: URLSearchParams): Draft {
  return {
    q: sp.get("q") ?? "",
    university: sp.get("university") ?? "",
    city: sp.get("city") ?? "",
    neighborhood: sp.get("neighborhood") ?? "",
    minRent: sp.get("minRent") ?? "",
    maxRent: sp.get("maxRent") ?? "",
    propertyType: sp.get("propertyType") ?? "",
    furnishing: sp.get("furnishing") ?? "",
    bedrooms: sp.get("bedrooms") ?? "",
    bathrooms: sp.get("bathrooms") ?? "",
    maxOccupants: sp.get("maxOccupants") ?? "",
    amenities: readList(sp, "amenities") as AmenityKey[],
    maxDistanceKm: sp.get("maxDistanceKm") ?? "",
    minRating: sp.get("minRating") ?? "",
    providerType: sp.get("providerType") ?? "",
    verified: sp.get("verified") === "true",
    availableNow: sp.get("availableNow") === "true",
  };
}

const EMPTY_DRAFT: Draft = {
  q: "",
  university: "",
  city: "",
  neighborhood: "",
  minRent: "",
  maxRent: "",
  propertyType: "",
  furnishing: "",
  bedrooms: "",
  bathrooms: "",
  maxOccupants: "",
  amenities: [],
  maxDistanceKm: "",
  minRating: "",
  providerType: "",
  verified: false,
  availableNow: false,
};

const RENT_PRESETS = [
  { label: "Under ₦150k", min: "", max: "150000" },
  { label: "₦150k – ₦400k", min: "150000", max: "400000" },
  { label: "₦400k – ₦1m", min: "400000", max: "1000000" },
  { label: "Above ₦1m", min: "1000000", max: "" },
];

export function FilterPanel({ universities, cities, neighborhoods }: FilterPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [draft, setDraft] = useState<Draft>(() => draftFromParams(new URLSearchParams(searchParams.toString())));
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeCount = countActive(draft);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function toggleAmenity(key: AmenityKey) {
    setDraft((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(key)
        ? prev.amenities.filter((a) => a !== key)
        : [...prev.amenities, key],
    }));
  }

  function commit(next: Draft) {
    const params = applyParams(new URLSearchParams(searchParams.toString()), {
      q: next.q || null,
      university: next.university || null,
      city: next.city || null,
      neighborhood: next.neighborhood || null,
      minRent: next.minRent || null,
      maxRent: next.maxRent || null,
      propertyType: next.propertyType || null,
      furnishing: next.furnishing || null,
      bedrooms: next.bedrooms || null,
      bathrooms: next.bathrooms || null,
      maxOccupants: next.maxOccupants || null,
      amenities: next.amenities.length ? next.amenities.join(",") : null,
      maxDistanceKm: next.maxDistanceKm || null,
      minRating: next.minRating || null,
      providerType: next.providerType || null,
      verified: next.verified ? "true" : null,
      availableNow: next.availableNow ? "true" : null,
    });
    router.push(`${pathname}${queryString(params)}`, { scroll: false });
    setMobileOpen(false);
  }

  function reset() {
    setDraft(EMPTY_DRAFT);
    const params = applyParams(new URLSearchParams(searchParams.toString()), {
      q: null,
      university: null,
      city: null,
      neighborhood: null,
      minRent: null,
      maxRent: null,
      propertyType: null,
      furnishing: null,
      bedrooms: null,
      bathrooms: null,
      maxOccupants: null,
      amenities: null,
      maxDistanceKm: null,
      minRating: null,
      providerType: null,
      verified: null,
      availableNow: null,
    });
    router.push(`${pathname}${queryString(params)}`, { scroll: false });
    setMobileOpen(false);
  }

  const body = (
    <div className="space-y-5">
      <Field label="Keyword">
        <Input
          value={draft.q}
          onChange={(e) => set("q", e.target.value)}
          placeholder="e.g. self contain, Ikpa road"
          aria-label="Keyword"
        />
      </Field>

      <Field label="University">
        <SelectField
          value={draft.university || ALL}
          onValueChange={(v) => set("university", v === ALL ? "" : v)}
          placeholder="Any university"
        >
          {universities.map((u) => (
            <SelectItem key={u.shortName} value={u.shortName}>
              {u.shortName}
            </SelectItem>
          ))}
        </SelectField>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="City">
          <SelectField
            value={draft.city || ALL}
            onValueChange={(v) => set("city", v === ALL ? "" : v)}
            placeholder="Any city"
          >
            {cities.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectField>
        </Field>
        <Field label="Area">
          <SelectField
            value={draft.neighborhood || ALL}
            onValueChange={(v) => set("neighborhood", v === ALL ? "" : v)}
            placeholder="Any area"
          >
            {neighborhoods.map((n) => (
              <SelectItem key={n.slug} value={n.name}>
                {n.name}
              </SelectItem>
            ))}
          </SelectField>
        </Field>
      </div>

      <Separator />

      <Field label="Rent budget (₦)">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            step={10000}
            inputMode="numeric"
            value={draft.minRent}
            onChange={(e) => set("minRent", e.target.value)}
            placeholder="Min"
            aria-label="Minimum rent"
          />
          <span className="text-slate-400" aria-hidden>
            –
          </span>
          <Input
            type="number"
            min={0}
            step={10000}
            inputMode="numeric"
            value={draft.maxRent}
            onChange={(e) => set("maxRent", e.target.value)}
            placeholder="Max"
            aria-label="Maximum rent"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {RENT_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setDraft((p) => ({ ...p, minRent: preset.min, maxRent: preset.max }))}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 transition-colors hover:border-brand-400 hover:text-brand-700"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Property type">
        <SelectField
          value={draft.propertyType || ALL}
          onValueChange={(v) => set("propertyType", v === ALL ? "" : v)}
          placeholder="Any type"
        >
          {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectField>
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Beds">
          <SelectField value={draft.bedrooms || ALL} onValueChange={(v) => set("bedrooms", v === ALL ? "" : v)} placeholder="Any">
            {["1", "2", "3", "4"].map((n) => (
              <SelectItem key={n} value={n}>
                {n}+
              </SelectItem>
            ))}
          </SelectField>
        </Field>
        <Field label="Baths">
          <SelectField value={draft.bathrooms || ALL} onValueChange={(v) => set("bathrooms", v === ALL ? "" : v)} placeholder="Any">
            {["1", "2", "3"].map((n) => (
              <SelectItem key={n} value={n}>
                {n}+
              </SelectItem>
            ))}
          </SelectField>
        </Field>
        <Field label="Sleeps">
          <SelectField
            value={draft.maxOccupants || ALL}
            onValueChange={(v) => set("maxOccupants", v === ALL ? "" : v)}
            placeholder="Any"
          >
            {["1", "2", "3", "4"].map((n) => (
              <SelectItem key={n} value={n}>
                {n}+
              </SelectItem>
            ))}
          </SelectField>
        </Field>
      </div>

      <Field label="Furnishing">
        <SelectField
          value={draft.furnishing || ALL}
          onValueChange={(v) => set("furnishing", v === ALL ? "" : v)}
          placeholder="Any"
        >
          {Object.entries(FURNISHING_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectField>
      </Field>

      <Field label="Listed by">
        <SelectField
          value={draft.providerType || ALL}
          onValueChange={(v) => set("providerType", v === ALL ? "" : v)}
          placeholder="Anyone"
        >
          {Object.entries(PROVIDER_TYPE_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectField>
      </Field>

      <Separator />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Max distance to campus">
          <SelectField
            value={draft.maxDistanceKm || ALL}
            onValueChange={(v) => set("maxDistanceKm", v === ALL ? "" : v)}
            placeholder="Any"
          >
            {["1", "2", "5", "10", "20"].map((n) => (
              <SelectItem key={n} value={n}>
                {n} km
              </SelectItem>
            ))}
          </SelectField>
        </Field>
        <Field label="Minimum rating">
          <SelectField
            value={draft.minRating || ALL}
            onValueChange={(v) => set("minRating", v === ALL ? "" : v)}
            placeholder="Any"
          >
            {["3", "3.5", "4", "4.5"].map((n) => (
              <SelectItem key={n} value={n}>
                {n}+ stars
              </SelectItem>
            ))}
          </SelectField>
        </Field>
      </div>

      <div className="space-y-2.5">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
          <Checkbox
            checked={draft.verified}
            onCheckedChange={(v) => set("verified", v === true)}
            aria-label="Verified listings only"
          />
          Verified listings only
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
          <Checkbox
            checked={draft.availableNow}
            onCheckedChange={(v) => set("availableNow", v === true)}
            aria-label="Available now"
          />
          Available now
        </label>
      </div>

      <Separator />

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700">Amenities</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {(Object.keys(AMENITY_LABELS) as AmenityKey[]).map((key) => (
            <label key={key} className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600">
              <Checkbox
                checked={draft.amenities.includes(key)}
                onCheckedChange={() => toggleAmenity(key)}
                aria-label={AMENITY_LABELS[key]}
              />
              {AMENITY_LABELS[key]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="sticky bottom-0 flex gap-2 bg-white/95 pt-2 backdrop-blur">
        <Button className="flex-1" onClick={() => commit(draft)}>
          Show {activeCount > 0 ? `${activeCount} filter${activeCount > 1 ? "s" : ""}` : "results"}
        </Button>
        <Button variant="outline" onClick={reset} disabled={activeCount === 0}>
          Clear
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <div className="lg:hidden">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-filters"
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" aria-hidden />
          Filters{activeCount > 0 ? ` (${activeCount})` : ""}
          {mobileOpen && <X className="ml-2 h-4 w-4" aria-hidden />}
        </Button>
        {mobileOpen && (
          <div id="mobile-filters" className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
            {body}
          </div>
        )}
      </div>

      <aside className="hidden lg:block" aria-label="Search filters">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            Filters
            {activeCount > 0 && (
              <span className="ml-auto rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-800">
                {activeCount}
              </span>
            )}
          </h2>
          {body}
        </div>
      </aside>
    </>
  );
}

function countActive(draft: Draft): number {
  let count = 0;
  const strings: (keyof Draft)[] = [
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
  ];
  for (const key of strings) if (draft[key]) count += 1;
  count += draft.amenities.length;
  if (draft.verified) count += 1;
  if (draft.availableNow) count += 1;
  return count;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</Label>
      {children}
    </div>
  );
}

function SelectField({
  value,
  onValueChange,
  placeholder,
  children,
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-10" aria-label={placeholder}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}</SelectItem>
        {children}
      </SelectContent>
    </Select>
  );
}
