import { describe, expect, it } from "vitest";
import { applyParams, describeFilter, queryString, readList } from "@/lib/search-url";

describe("applyParams", () => {
  it("keeps untouched params and replaces the patched one", () => {
    const next = applyParams(new URLSearchParams("city=Enugu&maxRent=150000"), { maxRent: 200_000 });
    expect(next.get("city")).toBe("Enugu");
    expect(next.get("maxRent")).toBe("200000");
  });

  it("deletes params that are cleared, empty, false, null or undefined", () => {
    const current = new URLSearchParams("city=Enugu&verified=true&minRent=1000&bedrooms=2&q=ogige");
    const next = applyParams(current, {
      city: "",
      verified: false,
      minRent: null,
      bedrooms: undefined,
    });
    expect(next.get("city")).toBeNull();
    expect(next.get("verified")).toBeNull();
    expect(next.get("minRent")).toBeNull();
    expect(next.get("bedrooms")).toBeNull();
    expect(next.get("q")).toBe("ogige");
  });

  it("writes booleans as the string the search schema expects", () => {
    expect(applyParams(new URLSearchParams(), { availableNow: true }).get("availableNow")).toBe("true");
  });

  it("resets pagination whenever a filter changes", () => {
    // Landing on page 4 of the old result set would show the wrong listings.
    const next = applyParams(new URLSearchParams("page=4&city=Enugu"), { city: "Nsukka" });
    expect(next.get("page")).toBeNull();
  });

  it("preserves an explicit page change", () => {
    const next = applyParams(new URLSearchParams("city=Enugu"), { page: 3 });
    expect(next.get("page")).toBe("3");
    expect(next.get("city")).toBe("Enugu");
  });

  it("does not mutate the params object it was given", () => {
    const current = new URLSearchParams("city=Enugu");
    applyParams(current, { city: "Nsukka" });
    expect(current.get("city")).toBe("Enugu");
  });
});

describe("queryString", () => {
  it("prefixes with ? only when there is something to send", () => {
    expect(queryString(new URLSearchParams())).toBe("");
    expect(queryString(new URLSearchParams("city=Enugu"))).toBe("?city=Enugu");
  });
});

describe("readList", () => {
  it("flattens repeated and comma-separated values", () => {
    const params = new URLSearchParams("amenities=water,electricity&amenities=wifi");
    expect(readList(params, "amenities")).toEqual(["water", "electricity", "wifi"]);
  });

  it("returns an empty array when the key is absent", () => {
    expect(readList(new URLSearchParams(), "amenities")).toEqual([]);
  });
});

describe("describeFilter", () => {
  it("labels known filters for a human-readable chip", () => {
    expect(describeFilter("maxRent", "150000")).toBe("Max rent: 150000");
    expect(describeFilter("bedrooms", "2")).toBe("Bedrooms: 2+");
    expect(describeFilter("maxDistanceKm", "3")).toBe("Max distance: 3 km");
    expect(describeFilter("propertyType", "SELF_CONTAIN")).toBe("Type: self contain");
    expect(describeFilter("verified", "true")).toBe("Verified only");
  });

  it("falls back to the raw key for anything unrecognised", () => {
    expect(describeFilter("mystery", "value")).toBe("mystery: value");
  });
});
