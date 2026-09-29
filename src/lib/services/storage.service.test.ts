import { describe, expect, it } from "vitest";
import { readPrivateDocument, validateImageUpload, UploadError } from "@/lib/services/storage.service";

describe("validateImageUpload", () => {
  it("accepts a supported image within the size limit", () => {
    expect(() => validateImageUpload({ size: 200_000, type: "image/png" })).not.toThrow();
  });

  it.each([
    ["an empty file", { size: 0, type: "image/png" }],
    ["an oversized file", { size: 64 * 1024 * 1024, type: "image/png" }],
    ["a non-image type", { size: 200_000, type: "application/pdf" }],
    ["an svg, which can carry script", { size: 200_000, type: "image/svg+xml" }],
  ])("rejects %s", (_label, file) => {
    expect(() => validateImageUpload(file)).toThrow(UploadError);
  });

  it("reports a usable status code so the API can return 400 rather than 500", () => {
    try {
      validateImageUpload({ size: 0, type: "image/png" });
      expect.unreachable("should have thrown");
    } catch (error) {
      expect((error as UploadError).status).toBe(400);
    }
  });
});

describe("readPrivateDocument", () => {
  /**
   * Verification documents are identity evidence. The local provider keeps them
   * outside `public/` and refuses any path that escapes that directory, so a
   * guessed URL cannot be used to read the filesystem.
   */
  it.each([
    ["a parent traversal", "../../package.json"],
    ["an absolute path", "/etc/passwd"],
    ["a traversal hidden mid-path", "verification/user/../../../.env"],
    ["an encoded traversal", "verification/%2e%2e/%2e%2e/.env"],
    ["an empty path", ""],
  ])("refuses %s", async (_label, objectPath) => {
    expect(await readPrivateDocument(objectPath)).toBeNull();
  });

  it("returns null for a well-formed path that does not exist", async () => {
    expect(await readPrivateDocument("verification/nobody/does-not-exist.png")).toBeNull();
  });
});
