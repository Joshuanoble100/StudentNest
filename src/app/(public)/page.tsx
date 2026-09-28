import Link from "next/link";
import {
  BadgeCheck,
  MessageSquareHeart,
  MapPin,
  ShieldAlert,
  Star,
  Users,
  FileSearch,
  Home as HomeIcon,
} from "lucide-react";
import { HeroSearch } from "@/components/home/hero-search";
import { PropertyCard } from "@/components/property/property-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { getHomeData } from "@/lib/services/search.service";
import { SAFETY_WARNING, VERIFICATION_EXPLAINER } from "@/lib/constants";

export const revalidate = 60;

export default async function HomePage() {
  const { recent, highlyReviewed, neighborhoods, universities, totalActiveListings } =
    await getHomeData().catch(() => ({
      recent: [],
      highlyReviewed: [],
      neighborhoods: [],
      universities: [],
      totalActiveListings: 0,
    }));

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-50 via-white to-slate-50">
        <div className="container-page py-12 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              Find student housing you can <span className="text-brand-700">actually trust</span>.
            </h1>
            <p className="mt-4 text-base text-slate-600 sm:text-lg">
              Find affordable student accommodation, compare real living conditions, and hear from
              students who have stayed there before.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {totalActiveListings > 0
                ? `${totalActiveListings.toLocaleString("en-NG")} active listings across Nigeria`
                : "Built for Nigerian universities — starting with your campus."}
            </p>
          </div>
          <div className="mx-auto mt-8 max-w-4xl">
            <HeroSearch />
          </div>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/properties">Find Housing</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/register?role=LANDLORD">List a Property</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Popular student areas */}
      {neighborhoods.length > 0 && (
        <section className="container-page py-10" aria-labelledby="areas-heading">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 id="areas-heading" className="text-xl font-bold text-slate-900 sm:text-2xl">
                Popular student areas
              </h2>
              <p className="text-sm text-slate-500">Where students are searching right now</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {neighborhoods.map((area) => (
              <Link
                key={area.id}
                href={`/locations/${area.slug}`}
                className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-brand-300 hover:shadow-md"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-900 group-hover:text-brand-700">
                  <MapPin className="h-4 w-4 text-brand-600" aria-hidden />
                  {area.name}
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  {area.city}, {area.state} · {area._count.properties} listings
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Universities */}
      {universities.length > 0 && (
        <section className="container-page pb-10" aria-labelledby="unis-heading">
          <h2 id="unis-heading" className="mb-4 text-xl font-bold text-slate-900 sm:text-2xl">
            Browse by university
          </h2>
          <div className="flex flex-wrap gap-2">
            {universities.map((u) => (
              <Link
                key={u.id}
                href={`/properties?university=${encodeURIComponent(u.shortName)}`}
                className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-brand-300 hover:text-brand-700"
              >
                {u.shortName}
                <span className="ml-1.5 text-xs text-slate-400">{u._count.properties}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recently added */}
      <section className="container-page pb-10" aria-labelledby="recent-heading">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 id="recent-heading" className="text-xl font-bold text-slate-900 sm:text-2xl">
              Recently added
            </h2>
            <p className="text-sm text-slate-500">Sorted by newest listing date</p>
          </div>
          <Link href="/properties?sort=newest" className="text-sm font-semibold text-brand-700 hover:underline">
            See all
          </Link>
        </div>
        {recent.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<HomeIcon className="h-10 w-10" aria-hidden />}
            title="No listings yet"
            description="Properties will appear here as landlords and caretakers add them."
            action={
              <Button asChild variant="outline">
                <Link href="/register?role=LANDLORD">List the first property</Link>
              </Button>
            }
          />
        )}
      </section>

      {/* Highly reviewed */}
      {highlyReviewed.length > 0 && (
        <section className="container-page pb-10" aria-labelledby="reviewed-heading">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 id="reviewed-heading" className="text-xl font-bold text-slate-900 sm:text-2xl">
                Most reviewed by students
              </h2>
              <p className="text-sm text-slate-500">
                Sorted by number of published student reviews, then average rating — not an
                editorial &ldquo;best&rdquo; ranking
              </p>
            </div>
            <Link href="/properties?sort=most_reviewed" className="text-sm font-semibold text-brand-700 hover:underline">
              See all
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {highlyReviewed.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        </section>
      )}

      {/* Why StudentNest */}
      <section className="border-y border-slate-200 bg-white" aria-labelledby="why-heading">
        <div className="container-page py-12">
          <h2 id="why-heading" className="text-center text-2xl font-bold text-slate-900">
            Why StudentNest?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-500">
            A platform built around trust, transparency, and real student experiences.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Feature
              icon={<BadgeCheck className="h-6 w-6 text-brand-700" aria-hidden />}
              title="Verified properties"
              body={VERIFICATION_EXPLAINER}
            />
            <Feature
              icon={<Star className="h-6 w-6 text-amber-500" aria-hidden />}
              title="Real student reviews"
              body="Ratings across electricity, water, security, internet, maintenance and more — from students with confirmed engagement, clearly labelled by verification status."
            />
            <Feature
              icon={<MapPin className="h-6 w-6 text-brand-700" aria-hidden />}
              title="Location information"
              body="See estimated distance to campus and nearby student areas, so you know the real commute before you pay."
            />
            <Feature
              icon={<FileSearch className="h-6 w-6 text-brand-700" aria-hidden />}
              title="Transparent housing details"
              body="Rent, caution deposit, agency fees, amenities and living conditions — all structured and comparable. Advertised charges are separated from estimates."
            />
            <Feature
              icon={<Users className="h-6 w-6 text-brand-700" aria-hidden />}
              title="Roommate matching"
              body="Find compatible roommates with a transparent scoring system based on budget, location, move-in date and lifestyle preferences."
            />
            <Feature
              icon={<MessageSquareHeart className="h-6 w-6 text-brand-700" aria-hidden />}
              title="Direct, safe contact"
              body="Message landlords, caretakers and agents inside the platform — no need to share your phone number first."
            />
          </div>
        </div>
      </section>

      {/* Safety */}
      <section className="container-page py-12" aria-labelledby="safety-heading">
        <div className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50">
          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 id="safety-heading" className="flex items-center gap-2 text-xl font-bold text-amber-900">
                <ShieldAlert className="h-6 w-6" aria-hidden />
                Stay safe while house hunting
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-amber-900">
                <strong>{SAFETY_WARNING}</strong>
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-900">
                <li>Always inspect the property in person before paying anything.</li>
                <li>Ask for identification and proof the person can rent out the property.</li>
                <li>Never pay cash without a receipt, and be wary of &ldquo;inspection fee&rdquo; pressure.</li>
                <li>Use the report button on any listing, review, or message that feels suspicious — anonymous reports are allowed.</li>
              </ul>
            </div>
            <div className="flex flex-col gap-2 lg:w-48">
              <Button asChild variant="secondary">
                <Link href="/safety">Safety center</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/properties">Browse housing</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
        {icon}
      </div>
      <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}
