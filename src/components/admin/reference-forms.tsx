"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NIGERIAN_STATES } from "@/lib/constants";
import { campusSchema, neighborhoodSchema, universitySchema } from "@/lib/validation/admin";

const ENDPOINT = "/api/admin/reference";

async function post(kind: "university" | "campus" | "neighborhood", body: Record<string, unknown>) {
  const res = await fetch(`${ENDPOINT}?kind=${kind}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error?.message ?? "That could not be saved");
  return json;
}

export function UniversityForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = universitySchema.safeParse({ name, shortName, city, state });
    if (!parsed.success) {
      setErrors(flatten(parsed.error));
      return;
    }
    setErrors({});
    startTransition(async () => {
      try {
        await post("university", parsed.data);
        toast.success(`${parsed.data.shortName} added`);
        setName("");
        setShortName("");
        setCity("");
        setState("");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not add the university");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add a university or college</CardTitle>
        <CardDescription>
          Use the official name students recognise. The short name is what appears on cards
          (&ldquo;UNN&rdquo;, &ldquo;OAU&rdquo;) — 2 to 20 characters, shown uppercase.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="uni-name">Official name</Label>
            <Input
              id="uni-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="University of Nigeria, Nsukka"
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name && <FieldError message={errors.name} />}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="uni-short">Short name</Label>
              <Input
                id="uni-short"
                value={shortName}
                onChange={(e) => setShortName(e.target.value.toUpperCase())}
                placeholder="UNN"
                maxLength={20}
                aria-invalid={Boolean(errors.shortName)}
              />
              {errors.shortName && <FieldError message={errors.shortName} />}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uni-city">City</Label>
              <Input
                id="uni-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Nsukka"
                aria-invalid={Boolean(errors.city)}
              />
              {errors.city && <FieldError message={errors.city} />}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uni-state">State</Label>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger id="uni-state">
                <SelectValue placeholder="Select a state" />
              </SelectTrigger>
              <SelectContent>
                {NIGERIAN_STATES.map((entry) => (
                  <SelectItem key={entry} value={entry}>
                    {entry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.state && <FieldError message={errors.state} />}
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Adding…" : "Add university"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function CampusForm({ universities }: { universities: { id: string; name: string; shortName: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [universityId, setUniversityId] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = campusSchema.safeParse({ universityId, name, city: city || undefined });
    if (!parsed.success) {
      setErrors(flatten(parsed.error));
      return;
    }
    setErrors({});
    startTransition(async () => {
      try {
        await post("campus", parsed.data);
        toast.success(`${parsed.data.name} added`);
        setName("");
        setCity("");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not add the campus");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add a campus</CardTitle>
        <CardDescription>
          Campuses let students narrow a search to the site they actually attend. Skip this for
          single-campus institutions only if there is genuinely one site.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="campus-uni">University</Label>
            <Select value={universityId} onValueChange={setUniversityId}>
              <SelectTrigger id="campus-uni">
                <SelectValue placeholder="Select a university" />
              </SelectTrigger>
              <SelectContent>
                {universities.map((university) => (
                  <SelectItem key={university.id} value={university.id}>
                    {university.name} ({university.shortName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.universityId && <FieldError message={errors.universityId} />}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="campus-name">Campus name</Label>
              <Input
                id="campus-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Main Campus"
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name && <FieldError message={errors.name} />}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="campus-city">City (optional)</Label>
              <Input
                id="campus-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Enugu"
              />
            </div>
          </div>
          <Button type="submit" variant="secondary" disabled={pending || universities.length === 0}>
            {pending ? "Adding…" : "Add campus"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function NeighborhoodForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = neighborhoodSchema.safeParse({ name, city, state });
    if (!parsed.success) {
      setErrors(flatten(parsed.error));
      return;
    }
    setErrors({});
    startTransition(async () => {
      try {
        await post("neighborhood", parsed.data);
        toast.success(`${parsed.data.name} added`);
        setName("");
        setCity("");
        setState("");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not add the area");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add an area</CardTitle>
        <CardDescription>
          Areas are the local names students actually search for (&ldquo;Ogige&rdquo;,
          &ldquo;Awkunanaw&rdquo;). Use the spelling locals use, not a formal district name.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="hood-name">Area name</Label>
            <Input
              id="hood-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ogige"
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name && <FieldError message={errors.name} />}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="hood-city">City</Label>
              <Input
                id="hood-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Nsukka"
                aria-invalid={Boolean(errors.city)}
              />
              {errors.city && <FieldError message={errors.city} />}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hood-state">State</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger id="hood-state">
                  <SelectValue placeholder="Select a state" />
                </SelectTrigger>
                <SelectContent>
                  {NIGERIAN_STATES.map((entry) => (
                    <SelectItem key={entry} value={entry}>
                      {entry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.state && <FieldError message={errors.state} />}
            </div>
          </div>
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "Adding…" : "Add area"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function FieldError({ message }: { message: string }) {
  return <p className="text-xs font-medium text-red-700">{message}</p>;
}

type ZodLikeError = {
  issues: { path: (string | number)[]; message: string }[];
};

function flatten(error: unknown): Record<string, string> {
  const issues = (error as ZodLikeError).issues ?? [];
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
