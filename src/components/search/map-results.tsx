"use client";

import Link from "next/link";
import { useState } from "react";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatNaira } from "@/lib/utils";
import { RENT_PERIOD_LABELS } from "@/lib/constants";
import type { RentPeriod } from "@/lib/types";

export interface MapListingPoint {
  id: string;
  slug: string;
  title: string;
  rentAmount: number;
  rentPeriod: RentPeriod;
  latitude: number;
  longitude: number;
  locationApproximate: boolean;
  verificationStatus: string;
  image: string | null;
}

interface MapResultsProps {
  points: MapListingPoint[];
  provider: "mock" | "mapbox";
  token?: string;
  centerName?: string | null;
}

/**
 * Map results view.
 *
 * With MAP_PROVIDER=mapbox a real Mapbox static basemap is loaded behind the
 * pins. Otherwise a schematic plot of the same coordinates is rendered so the
 * view stays functional without external calls or keys. Pins honour
 * `locationApproximate` — exact street addresses are never exposed here.
 */
export function MapResults({ points, provider, token, centerName }: MapResultsProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  if (points.length === 0) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-center text-sm text-slate-500">
        <div>
          <MapPin className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
          <p className="mt-2">No listings with map coordinates match these filters.</p>
          <p className="text-xs text-slate-400">
            Owners who prefer not to share a pin still appear in grid and list view.
          </p>
        </div>
      </div>
    );
  }

  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const padLat = Math.max((maxLat - minLat) * 0.15, 0.004);
  const padLng = Math.max((maxLng - minLng) * 0.15, 0.004);
  const south = minLat - padLat;
  const north = maxLat + padLat;
  const west = minLng - padLng;
  const east = maxLng + padLng;

  const basemap =
    provider === "mapbox" && token
      ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/[${west},${south},${east},${north}]/1200x840@2x?access_token=${token}`
      : null;

  const active = points.find((p) => p.id === activeId) ?? null;

  return (
    <div className="space-y-3">
      <div
        className="relative h-[420px] overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:h-[520px]"
        role="group"
        aria-label={`Map of ${points.length} listings`}
      >
        {basemap ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={basemap} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
            aria-hidden
          />
        )}

        {points.map((point) => {
          const left = ((point.longitude - west) / (east - west)) * 100;
          const top = ((north - point.latitude) / (north - south)) * 100;
          const isActive = point.id === activeId;
          return (
            <button
              key={point.id}
              type="button"
              onMouseEnter={() => setActiveId(point.id)}
              onMouseLeave={() => setActiveId((cur) => (cur === point.id ? null : cur))}
              onFocus={() => setActiveId(point.id)}
              onBlur={() => setActiveId((cur) => (cur === point.id ? null : cur))}
              onClick={() => setActiveId(point.id)}
              className="absolute -translate-x-1/2 -translate-y-full"
              style={{ left: `${left}%`, top: `${top}%` }}
              aria-label={`${point.title}, ${formatNaira(point.rentAmount)} per ${RENT_PERIOD_LABELS[point.rentPeriod]}`}
            >
              <span
                className={
                  isActive
                    ? "flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 text-white shadow-lg ring-2 ring-white"
                    : "flex h-7 w-7 items-center justify-center rounded-full bg-brand-600/90 text-white shadow ring-1 ring-white"
                }
              >
                <MapPin className="h-4 w-4" aria-hidden />
              </span>
            </button>
          );
        })}

        {active && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-3">
            <div className="pointer-events-auto w-full max-w-sm rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
              <div className="flex items-start gap-3">
                {active.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={active.image}
                    alt=""
                    className="h-16 w-20 shrink-0 rounded-lg object-cover"
                  />
                )}
                <div className="min-w-0">
                  <Link
                    href={`/properties/${active.slug}`}
                    className="line-clamp-1 text-sm font-semibold text-slate-900 hover:text-brand-700"
                  >
                    {active.title}
                  </Link>
                  <p className="text-sm font-bold text-slate-900">
                    {formatNaira(active.rentAmount)}
                    <span className="text-xs font-normal text-slate-500">
                      {" "}
                      / {RENT_PERIOD_LABELS[active.rentPeriod]}
                    </span>
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {active.verificationStatus === "VERIFIED" && (
                      <Badge variant="verified">Verified</Badge>
                    )}
                    {active.locationApproximate && (
                      <Badge variant="outline">Approximate pin</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500">
        {provider === "mapbox"
          ? "Basemap © Mapbox © OpenStreetMap contributors."
          : "Schematic map — MAP_PROVIDER is set to mock, so no external map service is called."}{" "}
        {centerName ? `Positions are relative to ${centerName}. ` : ""}
        Pins may be approximate when an owner chose not to publish an exact location.
      </p>
    </div>
  );
}
