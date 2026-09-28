/**
 * URL search-param helpers shared by the search UI.
 * Params are the single source of truth for search state so results are
 * linkable, shareable and bookmarkable.
 */

export type ParamPatch = Record<string, string | number | boolean | null | undefined>;

export function applyParams(current: URLSearchParams, patch: ParamPatch): URLSearchParams {
  const next = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined || value === "" || value === false) {
      next.delete(key);
    } else {
      next.set(key, String(value === true ? "true" : value));
    }
  }
  // Any filter change invalidates the current page number.
  if (!("page" in patch)) next.delete("page");
  return next;
}

export function queryString(params: URLSearchParams): string {
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function readList(sp: URLSearchParams, key: string): string[] {
  const values = sp.getAll(key);
  return values.flatMap((v) => v.split(",")).map((v) => v.trim()).filter(Boolean);
}

/** Human-readable label for an active filter chip. */
export function describeFilter(key: string, value: string): string {
  const labels: Record<string, string> = {
    q: "Search",
    university: "University",
    universityId: "University",
    campusId: "Campus",
    city: "City",
    neighborhood: "Area",
    minRent: "Min rent",
    maxRent: "Max rent",
    propertyType: "Type",
    furnishing: "Furnishing",
    bedrooms: "Bedrooms",
    bathrooms: "Bathrooms",
    maxOccupants: "Occupants",
    amenities: "Amenity",
    maxDistanceKm: "Max distance",
    verified: "Verified only",
    availableNow: "Available now",
    minRating: "Min rating",
    providerType: "Listed by",
  };
  const prefix = labels[key];
  if (!prefix) return `${key}: ${value}`;
  if (key === "verified" || key === "availableNow") return value === "true" ? prefix : `${prefix}: ${value}`;
  if (key === "bedrooms" || key === "bathrooms" || key === "maxOccupants") return `${prefix}: ${value}+`;
  if (key === "maxDistanceKm") return `${prefix}: ${value} km`;
  if (key === "minRating") return `${prefix}: ${value}+`;
  return `${prefix}: ${value.replaceAll("_", " ").toLowerCase()}`;
}
