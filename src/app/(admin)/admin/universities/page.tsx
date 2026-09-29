import type { Metadata } from "next";
import Link from "next/link";
import { requireRolePage } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/account/page-header";
import { CampusForm, NeighborhoodForm, UniversityForm } from "@/components/admin/reference-forms";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Admin · Universities & areas", robots: { index: false } };

export default async function AdminUniversitiesPage() {
  await requireRolePage("ADMIN");

  const [universities, neighborhoods] = await Promise.all([
    prisma.university.findMany({
      orderBy: [{ name: "asc" }],
      include: {
        campuses: { orderBy: { name: "asc" }, select: { id: true, name: true, slug: true, city: true } },
        _count: { select: { properties: true } },
      },
    }),
    prisma.neighborhood.findMany({
      orderBy: [{ city: "asc" }, { name: "asc" }],
      include: { _count: { select: { properties: true } } },
    }),
  ]);

  const demoCount = universities.filter((u) => u.isDemoData).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Universities & areas"
        description="The reference data every search filter is built from. Adding a university or area makes it selectable in filters immediately."
      />

      <Alert variant="info">
        <AlertTitle>Spelling matters more than completeness</AlertTitle>
        Students filter by the names they know. If a campus or area is spelled differently from how
        locals say it, listings attached to it will be missed in search. Use local spellings.
        {demoCount > 0 && (
          <>
            {" "}
            {demoCount} of the {universities.length} universities below are seed data and are
            labelled as such.
          </>
        )}
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        <UniversityForm />
        <CampusForm
          universities={universities.map((u) => ({ id: u.id, name: u.name, shortName: u.shortName }))}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <NeighborhoodForm />

        <Card>
          <CardHeader>
            <CardTitle>Areas</CardTitle>
            <CardDescription>
              {neighborhoods.length} area{neighborhoods.length === 1 ? "" : "s"} across{" "}
              {new Set(neighborhoods.map((n) => n.city)).size} cities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {neighborhoods.length === 0 ? (
              <EmptyState title="No areas yet" description="Add the first area using the form." />
            ) : (
              <ul className="max-h-[22rem] space-y-2 overflow-y-auto pr-1">
                {neighborhoods.map((hood) => (
                  <li
                    key={hood.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{hood.name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {hood.city}, {hood.state}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {hood.isDemoData && <Badge variant="neutral">Demo</Badge>}
                      <Link
                        href={`/admin/properties?area=${encodeURIComponent(hood.name)}`}
                        className="text-xs font-medium text-brand-700 hover:underline"
                      >
                        {hood._count.properties} listing
                        {hood._count.properties === 1 ? "" : "s"}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Universities</CardTitle>
          <CardDescription>{universities.length} institutions and their campuses.</CardDescription>
        </CardHeader>
        <CardContent>
          {universities.length === 0 ? (
            <EmptyState
              title="No universities yet"
              description="Add the first institution — campuses and listings attach to it."
            />
          ) : (
            <ul className="space-y-3">
              {universities.map((university) => (
                <li
                  key={university.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{university.name}</p>
                        <Badge variant="default">{university.shortName}</Badge>
                        {university.isDemoData && <Badge variant="neutral">Demo data</Badge>}
                      </div>
                      <p className="mt-0.5 text-sm text-slate-600">
                        {university.city}, {university.state} · {university.country}
                      </p>
                      <Link
                        href={`/locations/${university.slug}`}
                        className="mt-1 inline-block text-xs font-medium text-brand-700 hover:underline"
                      >
                        View student-facing page →
                      </Link>
                    </div>
                    <p className="text-sm text-slate-600">
                      {university._count.properties} listing
                      {university._count.properties === 1 ? "" : "s"}
                    </p>
                  </div>

                  {university.campuses.length === 0 ? (
                    <p className="mt-3 text-xs text-amber-700">
                      No campuses yet — students can only filter this institution at university
                      level until you add one.
                    </p>
                  ) : (
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {university.campuses.map((campus) => (
                        <li key={campus.id}>
                          <Badge variant="outline">
                            {campus.name}
                            {campus.city ? ` · ${campus.city}` : ""}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
