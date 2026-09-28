import { env } from "@/lib/env";
import { distanceKm } from "@/lib/utils";

/**
 * Map abstraction layer.
 *
 * MAP_PROVIDER=mock (default): no external calls or keys. The UI renders a
 * styled placeholder with coordinates and distances — fully functional for
 * development and demos.
 * MAP_PROVIDER=mapbox + NEXT_PUBLIC_MAPBOX_TOKEN: embeds real Mapbox static/
 * interactive maps.
 *
 * Privacy rule: when Property.locationApproximate is true, the stored pin is
 * already deliberately offset by the owner. The exact addressLine is never
 * sent to the client for non-privileged viewers.
 */

export interface MapPoint {
  latitude: number;
  longitude: number;
  label?: string;
}

export function getMapProvider(): "mock" | "mapbox" {
  if (env.maps.provider === "mapbox" && env.maps.mapboxToken) return "mapbox";
  return "mock";
}

/** Static map image URL for server-rendered previews. */
export function staticMapUrl(point: MapPoint, opts: { width?: number; height?: number; zoom?: number } = {}): string | null {
  if (getMapProvider() !== "mapbox") return null;
  const { width = 640, height = 360, zoom = 15 } = opts;
  return (
    `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/` +
    `pin-s+0f76d6(${point.longitude},${point.latitude})/` +
    `${point.longitude},${point.latitude},${zoom}/${width}x${height}@2x` +
    `?access_token=${env.maps.mapboxToken}`
  );
}

/** Mapbox GL JS style + token for the interactive client component. */
export function interactiveMapConfig(): { provider: "mock" | "mapbox"; token?: string } {
  if (getMapProvider() === "mapbox") {
    return { provider: "mapbox", token: env.maps.mapboxToken };
  }
  return { provider: "mock" };
}

/** Distance from a property pin to the campus centre. */
export function distanceToCampusKm(
  property: { latitude: unknown; longitude: unknown },
  campus: { latitude: unknown; longitude: unknown } | null,
): number | null {
  const toNum = (v: unknown): number | null => {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const plat = toNum(property.latitude);
  const plon = toNum(property.longitude);
  const clat = toNum(campus?.latitude);
  const clon = toNum(campus?.longitude);
  if (plat === null || plon === null || clat === null || clon === null) return null;
  return distanceKm(plat, plon, clat, clon);
}
