"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUploader, type ImageMeta } from "./image-uploader";
import { propertyCreateSchema } from "@/lib/validation/property";
import {
  AMENITY_LABELS,
  FLOOD_RISK_LABELS,
  FURNISHING_LABELS,
  INTERNET_TYPE_LABELS,
  NIGERIAN_STATES,
  PROPERTY_TYPE_LABELS,
  PROVIDER_TYPE_LABELS,
  RENT_PERIOD_LABELS,
  SECURITY_FEATURE_LABELS,
  WATER_SOURCE_LABELS,
} from "@/lib/constants";

const NONE = "__none__";

export interface PropertyFormInitial {
  id?: string;
  title: string;
  description: string;
  providerType: string;
  propertyType: string;
  rentAmount: number;
  rentPeriod: string;
  cautionDeposit: number | null;
  agencyFee: number | null;
  serviceCharge: number | null;
  bedrooms: number;
  bathrooms: number;
  maxOccupants: number;
  furnishing: string;
  availableNow: boolean;
  availableFrom: string | null;
  universityId: string | null;
  campusId: string | null;
  neighborhoodId: string | null;
  addressLine: string | null;
  areaName: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  locationApproximate: boolean;
  amenities: string[];
  features: string[];
  houseRules: string | null;
  images: ImageMeta[];
  condition: {
    electricityAvailable: boolean;
    generatorAvailable: boolean;
    solarAvailable: boolean;
    prepaidMeter: boolean;
    waterSource: string;
    internetType: string;
    securityFeatures: string[];
    electricityReliability: number | null;
    waterReliability: number | null;
    networkQuality: number | null;
    roadCondition: number | null;
    noiseLevel: number | null;
    cleanliness: number | null;
    floodRisk: string;
  } | null;
}

export const EMPTY_PROPERTY_FORM: PropertyFormInitial = {
  title: "",
  description: "",
  providerType: "LANDLORD",
  propertyType: "SELF_CONTAIN",
  rentAmount: 0,
  rentPeriod: "PER_YEAR",
  cautionDeposit: null,
  agencyFee: null,
  serviceCharge: null,
  bedrooms: 1,
  bathrooms: 1,
  maxOccupants: 1,
  furnishing: "UNFURNISHED",
  availableNow: true,
  availableFrom: null,
  universityId: null,
  campusId: null,
  neighborhoodId: null,
  addressLine: null,
  areaName: "",
  city: "",
  state: NONE,
  latitude: null,
  longitude: null,
  locationApproximate: false,
  amenities: [],
  features: [],
  houseRules: null,
  images: [],
  condition: null,
};

interface PropertyFormProps {
  initial: PropertyFormInitial;
  universities: { id: string; name: string; shortName: string }[];
  campuses: { id: string; name: string; universityId: string }[];
  neighborhoods: { id: string; name: string; city: string }[];
}

type Errors = Record<string, string>;

const RATING_1TO5 = [1, 2, 3, 4, 5] as const;

/**
 * Create / edit a listing.
 *
 * Validated on the client with the exact schema the API uses, so the two can
 * never drift — but the server re-validates regardless. Editing a live listing
 * sends it back for review; that is stated in the UI rather than happening
 * silently.
 */
export function PropertyForm({ initial, universities, campuses, neighborhoods }: PropertyFormProps) {
  const router = useRouter();
  const isEdit = Boolean(initial.id);

  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState<"draft" | "submit" | null>(null);
  const [showCondition, setShowCondition] = useState(Boolean(initial.condition));

  const campusOptions = useMemo(
    () => campuses.filter((c) => c.universityId === form.universityId),
    [campuses, form.universityId],
  );
  const neighborhoodOptions = useMemo(
    () => neighborhoods.filter((n) => !form.city || n.city.toLowerCase() === form.city.toLowerCase()),
    [neighborhoods, form.city],
  );

  const set = <K extends keyof PropertyFormInitial>(key: K, value: PropertyFormInitial[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const condition = form.condition ?? {
    electricityAvailable: true,
    generatorAvailable: false,
    solarAvailable: false,
    prepaidMeter: false,
    waterSource: "NONE",
    internetType: "NONE",
    securityFeatures: [] as string[],
    electricityReliability: null,
    waterReliability: null,
    networkQuality: null,
    roadCondition: null,
    noiseLevel: null,
    cleanliness: null,
    floodRisk: "UNKNOWN",
  };
  const setCondition = <K extends keyof typeof condition>(key: K, value: (typeof condition)[K]) =>
    setForm((prev) => ({
      ...prev,
      condition: { ...condition, [key]: value },
    }));

  function buildPayload(submitForReview: boolean) {
    return {
      title: form.title,
      description: form.description,
      providerType: form.providerType,
      propertyType: form.propertyType,
      rentAmount: form.rentAmount,
      rentPeriod: form.rentPeriod,
      cautionDeposit: form.cautionDeposit,
      agencyFee: form.agencyFee,
      serviceCharge: form.serviceCharge,
      bedrooms: form.bedrooms,
      bathrooms: form.bathrooms,
      maxOccupants: form.maxOccupants,
      furnishing: form.furnishing,
      availableNow: form.availableNow,
      availableFrom: form.availableFrom,
      universityId: form.universityId,
      campusId: form.campusId === NONE ? null : form.campusId,
      neighborhoodId: form.neighborhoodId === NONE ? null : form.neighborhoodId,
      addressLine: form.addressLine,
      areaName: form.areaName,
      city: form.city,
      state: form.state,
      latitude: form.latitude,
      longitude: form.longitude,
      locationApproximate: form.locationApproximate,
      amenities: form.amenities,
      features: form.features,
      houseRules: form.houseRules ?? undefined,
      images: form.images,
      condition: form.condition ?? undefined,
      submitForReview,
    };
  }

  async function save(submitForReview: boolean) {
    setErrors({});
    const parsed = propertyCreateSchema.safeParse(buildPayload(submitForReview));
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".") || "form";
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      toast.error("Please fix the highlighted fields");
      return;
    }

    setBusy(submitForReview ? "submit" : "draft");
    try {
      const body = JSON.stringify(parsed.data);
      const res = isEdit
        ? await fetch(`/api/properties/${initial.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...parsed.data, status: submitForReview ? "PENDING_REVIEW" : "DRAFT" }),
          })
        : await fetch("/api/properties", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
          });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Could not save this listing");
        return;
      }
      toast.success(
        submitForReview
          ? "Sent for review. Our team will check it before it goes live."
          : "Saved as a draft. It is not visible to students yet.",
      );
      router.push("/dashboard/landlord/properties");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const errorFor = (key: string) =>
    errors[key] ? <p className="text-xs text-red-600">{errors[key]}</p> : null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(true);
      }}
      className="space-y-6"
      noValidate
    >
      <Alert variant="info">
        <AlertTitle>Before you list</AlertTitle>
        <p className="text-sm">
          Every listing is checked by our team before it goes live, and students can
          report anything that does not match reality. Only describe what is actually
          there — inflated photos or missing charges are the most common reason a
          listing is rejected, and repeated cases get an account suspended.
        </p>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>The basics</CardTitle>
          <CardDescription>What students see first on the listing card.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Listing title</Label>
            <Input
              id="title"
              required
              maxLength={120}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Spacious self-contain 5 minutes from the main gate"
            />
            <p className="text-xs text-slate-500">
              Plain and factual. Avoid “best”, “cheapest” or “luxury” — students sort by
              price and rating, not by adjectives.
            </p>
            {errorFor("title")}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              required
              rows={8}
              maxLength={5000}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
            <p className="text-xs text-slate-500">
              {form.description.length}/5000 · Mention the real condition, what the rent
              includes, and any charges students will owe.
            </p>
            {errorFor("description")}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="providerType">You are listing as</Label>
              <Select value={form.providerType} onValueChange={(v) => set("providerType", v)}>
                <SelectTrigger id="providerType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROVIDER_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">Shown to students. Do not misrepresent your role.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="propertyType">Property type</Label>
              <Select value={form.propertyType} onValueChange={(v) => set("propertyType", v)}>
                <SelectTrigger id="propertyType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errorFor("propertyType")}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Money</CardTitle>
          <CardDescription>
            All amounts in Naira. Every charge a student will pay must be listed — hidden
            fees are the number one complaint on the platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rentAmount">Rent (₦)</Label>
              <Input
                id="rentAmount"
                type="number"
                min={1000}
                step={1000}
                required
                value={form.rentAmount || ""}
                onChange={(e) => set("rentAmount", Number(e.target.value))}
              />
              {errorFor("rentAmount")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rentPeriod">Charged per</Label>
              <Select value={form.rentPeriod} onValueChange={(v) => set("rentPeriod", v)}>
                <SelectTrigger id="rentPeriod">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RENT_PERIOD_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      Per {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cautionDeposit">Caution / damage deposit (₦)</Label>
              <Input
                id="cautionDeposit"
                type="number"
                min={0}
                step={1000}
                value={form.cautionDeposit ?? ""}
                onChange={(e) =>
                  set("cautionDeposit", e.target.value === "" ? null : Number(e.target.value))
                }
              />
              <p className="text-xs text-slate-500">Leave blank if you do not charge one.</p>
              {errorFor("cautionDeposit")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agencyFee">Agency / agreement fee (₦)</Label>
              <Input
                id="agencyFee"
                type="number"
                min={0}
                step={1000}
                value={form.agencyFee ?? ""}
                onChange={(e) => set("agencyFee", e.target.value === "" ? null : Number(e.target.value))}
              />
              {errorFor("agencyFee")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="serviceCharge">Other service charge (₦)</Label>
              <Input
                id="serviceCharge"
                type="number"
                min={0}
                step={1000}
                value={form.serviceCharge ?? ""}
                onChange={(e) =>
                  set("serviceCharge", e.target.value === "" ? null : Number(e.target.value))
                }
              />
              {errorFor("serviceCharge")}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Space &amp; availability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="bedrooms">Rooms</Label>
              <Input
                id="bedrooms"
                type="number"
                min={0}
                max={50}
                value={form.bedrooms}
                onChange={(e) => set("bedrooms", Number(e.target.value))}
              />
              {errorFor("bedrooms")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bathrooms">Bathrooms</Label>
              <Input
                id="bathrooms"
                type="number"
                min={0}
                max={50}
                value={form.bathrooms}
                onChange={(e) => set("bathrooms", Number(e.target.value))}
              />
              {errorFor("bathrooms")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maxOccupants">Max occupants</Label>
              <Input
                id="maxOccupants"
                type="number"
                min={1}
                max={50}
                value={form.maxOccupants}
                onChange={(e) => set("maxOccupants", Number(e.target.value))}
              />
              {errorFor("maxOccupants")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="furnishing">Furnishing</Label>
              <Select value={form.furnishing} onValueChange={(v) => set("furnishing", v)}>
                <SelectTrigger id="furnishing">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FURNISHING_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <Switch
                id="availableNow"
                checked={form.availableNow}
                onCheckedChange={(checked) => set("availableNow", checked)}
              />
              <Label htmlFor="availableNow">Available now</Label>
            </div>
            {!form.availableNow && (
              <div className="space-y-1.5">
                <Label htmlFor="availableFrom">Available from</Label>
                <Input
                  id="availableFrom"
                  type="date"
                  value={form.availableFrom ?? ""}
                  onChange={(e) => set("availableFrom", e.target.value || null)}
                />
                {errorFor("availableFrom")}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="houseRules">House rules (optional)</Label>
            <Textarea
              id="houseRules"
              rows={3}
              maxLength={2000}
              value={form.houseRules ?? ""}
              onChange={(e) => set("houseRules", e.target.value)}
              placeholder="Curfew, guest policy, cleaning rota…"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
          <CardDescription>
            Students search by university and campus, so an accurate campus matters more
            than an exact street address.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="universityId">University</Label>
              <Select
                value={form.universityId ?? NONE}
                onValueChange={(v) => {
                  set("universityId", v === NONE ? null : v);
                  set("campusId", null);
                }}
              >
                <SelectTrigger id="universityId">
                  <SelectValue placeholder="Select a university" />
                </SelectTrigger>
                <SelectContent>
                  {universities.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.shortName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errorFor("universityId")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="campusId">Campus</Label>
              <Select
                value={form.campusId ?? NONE}
                onValueChange={(v) => set("campusId", v === NONE ? null : v)}
                disabled={campusOptions.length === 0}
              >
                <SelectTrigger id="campusId">
                  <SelectValue placeholder="Select a campus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Not specified</SelectItem>
                  {campusOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errorFor("campusId")}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="areaName">Area</Label>
              <Input
                id="areaName"
                required
                maxLength={120}
                value={form.areaName}
                onChange={(e) => set("areaName", e.target.value)}
                placeholder="e.g. Ikogbo, Nsukka"
              />
              {errorFor("areaName")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">City / town</Label>
              <Input
                id="city"
                required
                maxLength={80}
                value={form.city}
                onChange={(e) => {
                  set("city", e.target.value);
                  set("neighborhoodId", null);
                }}
              />
              {errorFor("city")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">State</Label>
              <Select value={form.state} onValueChange={(v) => set("state", v)}>
                <SelectTrigger id="state">
                  <SelectValue placeholder="Select a state" />
                </SelectTrigger>
                <SelectContent>
                  {NIGERIAN_STATES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errorFor("state")}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="neighborhoodId">Known neighbourhood (optional)</Label>
              <Select
                value={form.neighborhoodId ?? NONE}
                onValueChange={(v) => set("neighborhoodId", v === NONE ? null : v)}
                disabled={neighborhoodOptions.length === 0}
              >
                <SelectTrigger id="neighborhoodId">
                  <SelectValue placeholder="Select a neighbourhood" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Not listed</SelectItem>
                  {neighborhoodOptions.map((n) => (
                    <SelectItem key={n.id} value={n.id}>
                      {n.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="addressLine">Street address (private)</Label>
              <Input
                id="addressLine"
                maxLength={250}
                value={form.addressLine ?? ""}
                onChange={(e) => set("addressLine", e.target.value)}
                aria-describedby="address-help"
              />
              <p id="address-help" className="text-xs text-slate-500">
                Only shown to you and to our moderation team. Students see the area and an
                approximate pin.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="0.000001"
                min={-90}
                max={90}
                value={form.latitude ?? ""}
                onChange={(e) => set("latitude", e.target.value === "" ? null : Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="0.000001"
                min={-180}
                max={180}
                value={form.longitude ?? ""}
                onChange={(e) => set("longitude", e.target.value === "" ? null : Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Switch
              id="locationApproximate"
              checked={form.locationApproximate}
              onCheckedChange={(checked) => set("locationApproximate", checked)}
            />
            <div className="space-y-0.5">
              <Label htmlFor="locationApproximate">Publish an approximate location only</Label>
              <p className="text-xs text-slate-500">
                Recommended. The map pin will be jittered and students are told the location
                is approximate; the exact address is shared after a viewing is arranged.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Photos</CardTitle>
          <CardDescription>
            Real photos of this property. Every image needs a short description so the
            listing works with a screen reader.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <ImageUploader value={form.images} onChange={(images) => set("images", images)} />
          {errorFor("images")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Amenities &amp; features</CardTitle>
          <CardDescription>Only tick what genuinely exists and works.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(AMENITY_LABELS).map(([key, label]) => {
              const checked = form.amenities.includes(key);
              return (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(next) =>
                      set(
                        "amenities",
                        next
                          ? [...form.amenities, key]
                          : form.amenities.filter((a) => a !== key),
                      )
                    }
                  />
                  {label}
                </label>
              );
            })}
          </div>
          {errorFor("amenities")}

          <div className="space-y-1.5">
            <Label htmlFor="features">Other features (one per line)</Label>
            <Textarea
              id="features"
              rows={4}
              value={form.features.join("\n")}
              onChange={(e) =>
                set(
                  "features",
                  e.target.value
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .slice(0, 30),
                )
              }
            />
            <p className="text-xs text-slate-500">{form.features.length}/30 · up to 80 characters each</p>
            {errorFor("features")}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-4">
            <span>Utilities &amp; condition</span>
            <Switch
              checked={showCondition}
              onCheckedChange={(checked) => {
                setShowCondition(checked);
                if (!checked) set("condition", null);
                else setCondition("electricityAvailable", condition.electricityAvailable);
              }}
              aria-label="Include utilities and condition details"
            />
          </CardTitle>
          <CardDescription>
            Optional, but listings with honest utility details get fewer wasted viewings and
            better reviews. Leave a rating blank rather than guessing.
          </CardDescription>
        </CardHeader>
        {showCondition && (
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ["electricityAvailable", "Grid electricity"],
                  ["generatorAvailable", "Generator"],
                  ["solarAvailable", "Solar"],
                  ["prepaidMeter", "Prepaid meter"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={condition[key]}
                    onCheckedChange={(next) => setCondition(key, Boolean(next))}
                  />
                  {label}
                </label>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="waterSource">Water source</Label>
                <Select value={condition.waterSource} onValueChange={(v) => setCondition("waterSource", v)}>
                  <SelectTrigger id="waterSource">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(WATER_SOURCE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="internetType">Internet</Label>
                <Select value={condition.internetType} onValueChange={(v) => setCondition("internetType", v)}>
                  <SelectTrigger id="internetType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INTERNET_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="floodRisk">Flood risk</Label>
                <Select value={condition.floodRisk} onValueChange={(v) => setCondition("floodRisk", v)}>
                  <SelectTrigger id="floodRisk">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FLOOD_RISK_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">Say “Unknown” if you are not sure.</p>
              </div>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-slate-900">Security features</legend>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {Object.entries(SECURITY_FEATURE_LABELS).map(([key, label]) => {
                  const checked = condition.securityFeatures.includes(key);
                  return (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) =>
                          setCondition(
                            "securityFeatures",
                            next
                              ? [...condition.securityFeatures, key]
                              : condition.securityFeatures.filter((f) => f !== key),
                          )
                        }
                      />
                      {label}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-3">
              {(
                [
                  ["electricityReliability", "Electricity reliability"],
                  ["waterReliability", "Water reliability"],
                  ["networkQuality", "Network quality"],
                  ["roadCondition", "Road condition"],
                  ["noiseLevel", "Noise level (1 = quiet)"],
                  ["cleanliness", "Cleanliness"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={key}>{label}</Label>
                  <Select
                    value={condition[key] == null ? NONE : String(condition[key])}
                    onValueChange={(v) => setCondition(key, v === NONE ? null : Number(v))}
                  >
                    <SelectTrigger id={key}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Not specified</SelectItem>
                      {RATING_1TO5.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} / 5
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {isEdit && (
        <Alert variant="warning">
          <AlertTitle>Editing a live listing</AlertTitle>
          <p className="text-sm">
            If this listing is currently active, changing the title, description, price, type
            or location sends it back for review and takes it offline until an admin approves
            it again. Availability and photos can be updated without re-review.
          </p>
        </Alert>
      )}

      <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-4">
        <Button type="submit" disabled={busy !== null}>
          <Send aria-hidden />
          {busy === "submit" ? "Sending…" : isEdit ? "Save & send for review" : "Submit for review"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy !== null}
          onClick={() => save(false)}
        >
          <Save aria-hidden /> {busy === "draft" ? "Saving…" : "Save as draft"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={busy !== null}
          onClick={() => router.push("/dashboard/landlord/properties")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
