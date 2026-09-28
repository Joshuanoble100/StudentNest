"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROPERTY_TYPE_LABELS } from "@/lib/constants";
import { formatNairaCompact } from "@/lib/utils";

interface UniversityOption {
  id: string;
  name: string;
  shortName: string;
  campuses: { id: string; name: string }[];
}

const MAX_RENT_STEPS = [100_000, 200_000, 300_000, 500_000, 750_000, 1_000_000, 2_000_000];

export function HeroSearch() {
  const router = useRouter();
  const [universities, setUniversities] = useState<UniversityOption[]>([]);
  const [university, setUniversity] = useState("");
  const [campus, setCampus] = useState("");
  const [location, setLocation] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [occupants, setOccupants] = useState("");

  useEffect(() => {
    fetch("/api/universities?withCampuses=true")
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((json) => setUniversities(json.data ?? []))
      .catch(() => setUniversities([]));
  }, []);

  const campuses = universities.find((u) => u.shortName === university)?.campuses ?? [];

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (university) params.set("university", university);
    if (campus) params.set("campusId", campus);
    if (location.trim()) params.set("q", location.trim());
    if (maxRent) params.set("maxRent", maxRent);
    if (propertyType) params.set("propertyType", propertyType);
    if (occupants) params.set("maxOccupants", occupants);
    router.push(`/properties?${params.toString()}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg sm:p-5"
      aria-label="Search student housing"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="hero-university">University</Label>
          <Select
            value={university}
            onValueChange={(v) => {
              setUniversity(v === "any" ? "" : v);
              setCampus("");
            }}
          >
            <SelectTrigger id="hero-university">
              <SelectValue placeholder="Any university" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any university</SelectItem>
              {universities.map((u) => (
                <SelectItem key={u.id} value={u.shortName}>
                  {u.shortName} — {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="hero-campus">Campus</Label>
          <Select value={campus || "any"} onValueChange={(v) => setCampus(v === "any" ? "" : v)} disabled={campuses.length === 0}>
            <SelectTrigger id="hero-campus">
              <SelectValue placeholder={campuses.length ? "Any campus" : "Select university first"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any campus</SelectItem>
              {campuses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="hero-location">Location</Label>
          <Input
            id="hero-location"
            placeholder="e.g. Awka, or a street/area name"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="hero-rent">Max rent</Label>
          <Select value={maxRent || "any"} onValueChange={(v) => setMaxRent(v === "any" ? "" : v)}>
            <SelectTrigger id="hero-rent">
              <SelectValue placeholder="Any budget" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any budget</SelectItem>
              {MAX_RENT_STEPS.map((amount) => (
                <SelectItem key={amount} value={String(amount)}>
                  Up to {formatNairaCompact(amount)} / year
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="hero-type">Property type</Label>
          <Select value={propertyType || "any"} onValueChange={(v) => setPropertyType(v === "any" ? "" : v)}>
            <SelectTrigger id="hero-type">
              <SelectValue placeholder="Any type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any type</SelectItem>
              {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="hero-occupants">Occupants</Label>
          <Select value={occupants || "any"} onValueChange={(v) => setOccupants(v === "any" ? "" : v)}>
            <SelectTrigger id="hero-occupants">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              {[1, 2, 3, 4].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}+ {n === 1 ? "person" : "people"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button type="submit" size="lg" className="mt-4 w-full sm:w-auto">
        <Search className="mr-2 h-4 w-4" aria-hidden />
        Find Housing
      </Button>
    </form>
  );
}
