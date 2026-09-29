import { describe, expect, it } from "vitest";
import { nigerianPhoneSchema, paginationSchema, passwordSchema } from "@/lib/validation/common";
import { loginSchema, registerSchema } from "@/lib/validation/auth";
import { propertyCreateSchema, propertySearchSchema, propertyUpdateSchema } from "@/lib/validation/property";
import { reviewCreateSchema, reviewReportSchema } from "@/lib/validation/review";

describe("nigerianPhoneSchema", () => {
  it.each([
    "08031234567",
    "09031234567",
    "07061234567",
    "+2348031234567",
    "2348031234567",
  ])("accepts %s", (value) => {
    expect(nigerianPhoneSchema.parse(value)).toBe(value);
  });

  it.each([
    ["a US number", "+14155552671"],
    ["too short", "0803123456"],
    ["an unsupported prefix", "06031234567"],
    ["letters", "0803abc4567"],
  ])("rejects %s", (_label, value) => {
    expect(nigerianPhoneSchema.safeParse(value).success).toBe(false);
  });
});

describe("passwordSchema", () => {
  it("requires length, a letter and a number", () => {
    expect(passwordSchema.safeParse("Student!2345").success).toBe(true);
    expect(passwordSchema.safeParse("short1").success).toBe(false);
    expect(passwordSchema.safeParse("allletters").success).toBe(false);
    expect(passwordSchema.safeParse("12345678").success).toBe(false);
  });
});

describe("registerSchema", () => {
  const valid = {
    name: "Chioma Okafor",
    email: "chioma@studentnest.test",
    password: "Student!2345",
    role: "STUDENT",
  };

  it("accepts a student registration and defaults the phone to undefined", () => {
    const parsed = registerSchema.parse(valid);
    expect(parsed.phone).toBeUndefined();
  });

  it("never allows self-registration as an admin", () => {
    expect(registerSchema.safeParse({ ...valid, role: "ADMIN" }).success).toBe(false);
  });

  it("rejects an invalid phone number instead of storing it", () => {
    expect(registerSchema.safeParse({ ...valid, phone: "12345" }).success).toBe(false);
  });

  it("rejects a bad email", () => {
    expect(registerSchema.safeParse({ ...valid, email: "chioma@" }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("does not re-apply password complexity rules at login", () => {
    // An old account with a weak password must still be able to sign in so it
    // can be told to change it — locking them out would be worse.
    expect(loginSchema.safeParse({ email: "a@b.test", password: "weak" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "a@b.test", password: "" }).success).toBe(false);
  });
});

describe("paginationSchema", () => {
  it("coerces query strings and applies defaults", () => {
    expect(paginationSchema.parse({ page: "3" }).page).toBe(3);
    expect(paginationSchema.parse({}).pageSize).toBe(12);
  });

  it("rejects out-of-range pagination rather than silently clamping it", () => {
    expect(paginationSchema.safeParse({ page: "0" }).success).toBe(false);
    expect(paginationSchema.safeParse({ pageSize: "5000" }).success).toBe(false);
  });
});

describe("propertySearchSchema", () => {
  it("defaults to transparent, explainable sorting", () => {
    expect(propertySearchSchema.parse({}).sort).toBe("newest");
  });

  it("refuses an opaque ranking", () => {
    // There is deliberately no "best" or "recommended" sort: every ordering has
    // to be something a student can reason about.
    expect(propertySearchSchema.safeParse({ sort: "best" }).success).toBe(false);
    expect(propertySearchSchema.safeParse({ sort: "recommended" }).success).toBe(false);
  });

  it("normalises comma-separated amenity lists and drops unknown keys", () => {
    const parsed = propertySearchSchema.parse({ amenities: "water, electricity ,not_a_real_amenity" });
    expect(parsed.amenities).toEqual(["WATER", "ELECTRICITY"]);
  });

  it("coerces numeric filters from query strings", () => {
    const parsed = propertySearchSchema.parse({ minRent: "20000", maxRent: "150000", bedrooms: "2" });
    expect(parsed.minRent).toBe(20_000);
    expect(parsed.bedrooms).toBe(2);
  });

  it("rejects a negative rent", () => {
    expect(propertySearchSchema.safeParse({ minRent: "-1" }).success).toBe(false);
  });
});

describe("propertyCreateSchema", () => {
  const valid = {
    title: "Single room in Ogige",
    description: "A single room in a shared compound, five minutes from the campus gate.",
    propertyType: "SINGLE_ROOM",
    rentAmount: 120_000,
    rentPeriod: "PER_YEAR",
    universityId: "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
    areaName: "Ogige",
    city: "Nsukka",
    state: "Enugu",
    images: [{ url: "/uploads/properties/room.jpg", isCover: true }],
  };

  it("accepts a complete listing and defaults the charges a student must know about", () => {
    const parsed = propertyCreateSchema.parse(valid);
    expect(parsed.providerType).toBe("LANDLORD");
    expect(parsed.locationApproximate).toBe(false);
    expect(parsed.submitForReview).toBe(true);
  });

  it("requires at least one photo, with one marked as the cover", () => {
    expect(propertyCreateSchema.safeParse({ ...valid, images: [] }).success).toBe(false);
    expect(
      propertyCreateSchema.safeParse({ ...valid, images: [{ url: "/uploads/a.jpg" }] }).success,
    ).toBe(false);
  });

  it("requires an availability date when the listing is not available now", () => {
    expect(propertyCreateSchema.safeParse({ ...valid, availableNow: false }).success).toBe(false);
    expect(
      propertyCreateSchema.safeParse({ ...valid, availableNow: false, availableFrom: "2026-11-01" })
        .success,
    ).toBe(true);
  });

  it("requires the facts a student needs before paying", () => {
    const required = [
      "title",
      "description",
      "propertyType",
      "rentAmount",
      "universityId",
      "areaName",
      "city",
      "state",
    ];
    for (const field of required) {
      const rest: Record<string, unknown> = { ...valid };
      delete rest[field];
      expect(propertyCreateSchema.safeParse(rest).success, `${field} should be required`).toBe(false);
    }
  });

  it("rejects a rent of zero or an absurd rent", () => {
    expect(propertyCreateSchema.safeParse({ ...valid, rentAmount: 0 }).success).toBe(false);
    expect(propertyCreateSchema.safeParse({ ...valid, rentAmount: 900_000_000 }).success).toBe(false);
  });

  it("rejects a description too thin to be informative", () => {
    expect(propertyCreateSchema.safeParse({ ...valid, description: "Nice room" }).success).toBe(false);
  });

  it("rejects coordinates outside the valid range", () => {
    expect(propertyCreateSchema.safeParse({ ...valid, latitude: 95 }).success).toBe(false);
  });
});

describe("propertyUpdateSchema", () => {
  it("accepts a partial edit of a single field", () => {
    expect(propertyUpdateSchema.parse({ rentAmount: 150_000 }).rentAmount).toBe(150_000);
  });

  it("applies the same field rules as creation", () => {
    expect(propertyUpdateSchema.safeParse({ rentAmount: 0 }).success).toBe(false);
    expect(propertyUpdateSchema.safeParse({ title: "x" }).success).toBe(false);
  });

  it("never lets an owner publish their own listing", () => {
    // Approval is a moderation decision. DRAFT / PENDING_REVIEW / RENTED_OUT are
    // the only statuses an owner may set; ACTIVE and SUSPENDED are not.
    expect(propertyUpdateSchema.safeParse({ status: "DRAFT" }).success).toBe(true);
    expect(propertyUpdateSchema.safeParse({ status: "PENDING_REVIEW" }).success).toBe(true);
    expect(propertyUpdateSchema.safeParse({ status: "ACTIVE" }).success).toBe(false);
    expect(propertyUpdateSchema.safeParse({ status: "SUSPENDED" }).success).toBe(false);
  });

  it("enforces the availability rule only when availability is being changed", () => {
    expect(propertyUpdateSchema.safeParse({ availableNow: false }).success).toBe(false);
    expect(
      propertyUpdateSchema.safeParse({ availableNow: false, availableFrom: "2026-11-01" }).success,
    ).toBe(true);
    expect(propertyUpdateSchema.safeParse({ title: "Renovated single room" }).success).toBe(true);
  });
});

describe("reviewCreateSchema", () => {
  it("requires enough text to be useful", () => {
    expect(reviewCreateSchema.safeParse({ overallRating: 4, body: "Nice place" }).success).toBe(false);
    expect(
      reviewCreateSchema.safeParse({ overallRating: 4, body: "Water runs every morning and the caretaker responds quickly." })
        .success,
    ).toBe(true);
  });

  it("clamps ratings to 1–5", () => {
    expect(reviewCreateSchema.safeParse({ overallRating: 6, body: "x".repeat(40) }).success).toBe(false);
    expect(reviewCreateSchema.safeParse({ overallRating: 0, body: "x".repeat(40) }).success).toBe(false);
  });

  it("refuses duplicate category ratings", () => {
    const result = reviewCreateSchema.safeParse({
      overallRating: 4,
      body: "x".repeat(40),
      categoryRatings: [
        { category: "WATER", rating: 4 },
        { category: "WATER", rating: 2 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("limits photos so a review cannot be used as free image hosting", () => {
    const result = reviewCreateSchema.safeParse({
      overallRating: 4,
      body: "x".repeat(40),
      photos: Array.from({ length: 7 }, (_unused, index) => `/uploads/${index}.jpg`),
    });
    expect(result.success).toBe(false);
  });

  it("does not let a reviewer claim verification themselves", () => {
    const parsed = reviewCreateSchema.parse({
      overallRating: 5,
      body: "x".repeat(40),
      verification: "VERIFIED_STAY",
    });
    expect(parsed).not.toHaveProperty("verification");
  });
});

describe("reviewReportSchema", () => {
  it("accepts a defined reason and defaults to non-anonymous", () => {
    const parsed = reviewReportSchema.parse({ reason: "FAKE_REVIEW" });
    expect(parsed.anonymous).toBe(false);
  });

  it("rejects a free-text reason so reports stay categorisable", () => {
    expect(reviewReportSchema.safeParse({ reason: "because" }).success).toBe(false);
  });
});
