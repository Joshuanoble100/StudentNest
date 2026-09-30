import { expect, test } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL ?? "chi.student@studentnest.test";
const PASSWORD = process.env.E2E_PASSWORD ?? "Student!2345";
const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL ?? "emeka.owner@studentnest.test";
const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD ?? "Owner!2345";

async function signIn(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /log in/i }).click();
  // Wait for the credential POST to land — navigating early aborts it mid-flight.
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20_000 });
}

/**
 * Smoke coverage for the trust-critical paths: public search stays open to
 * signed-out visitors, the sort/filter contract is visible in the URL, role
 * checks are enforced by the server, and the safety copy is really rendered.
 */

test.describe("public search", () => {
  test("home page states the value proposition and links into search", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("actually trust");
    await expect(page.getByRole("link", { name: /student housing|browse|find/i }).first()).toBeVisible();
  });

  test("property search loads without a session and discloses its sorting rules", async ({ page }) => {
    await page.goto("/properties");
    await expect(page.getByRole("heading", { level: 1, name: "Student housing" })).toBeVisible();
    await expect(page.getByText(/no hidden .*best.* ranking/i)).toBeVisible();
    await expect(page.getByLabel("Search filters")).toBeAttached();
  });

  test("filters are written to the URL so a result set can be shared", async ({ page }) => {
    await page.goto("/properties");
    // Both panels exist in the DOM; scope to whichever the viewport actually shows.
    const desktopPanel = page.getByLabel("Search filters");
    let panel = desktopPanel;
    if (!(await desktopPanel.isVisible())) {
      await page.getByRole("button", { name: /^Filters/ }).click();
      panel = page.locator("#mobile-filters");
    }
    await panel.getByLabel("Maximum rent").fill("120000");
    await panel.getByRole("button", { name: /^Show 1 filter$/ }).click();
    await expect(page).toHaveURL(/maxRent=120000/);
    await expect(page).not.toHaveURL(/[?&]page=/);
  });

  test("a listing detail page carries the pre-payment safety warning", async ({ page }) => {
    await page.goto("/properties");
    const firstCard = page.locator('a[href^="/properties/"]').first();
    if (!(await firstCard.count())) {
      test.skip(true, "No seeded listings to open — run npm run db:seed first.");
    }
    const href = await firstCard.getAttribute("href");
    expect(href).toMatch(/^\/properties\/[^/]+$/);
    await page.goto(href!);
    // Scoped to main: the same warning is repeated in the footer site-wide.
    await expect(
      page.locator("#main-content").getByText(/Never send money solely because someone contacted you/i),
    ).toBeVisible();
  });

  test("roommate results explain how compatibility is calculated", async ({ page }) => {
    await page.goto("/roommates");
    await expect(page.getByRole("heading", { level: 1, name: "Find a roommate" })).toBeVisible();
    await expect(page.getByText(/protected characteristic are never/i)).toBeVisible();
  });

  test("safety center is reachable without signing in", async ({ page }) => {
    await page.goto("/safety");
    await expect(page.getByRole("heading", { level: 1, name: "Safety center" })).toBeVisible();
    await expect(page.getByText("Before you pay")).toBeVisible();
    await expect(page.getByText(/If you have already paid/i)).toBeVisible();
  });
});

test.describe("authentication and role enforcement", () => {
  test("admin area is refused to a signed-out visitor", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).not.toHaveURL(/\/admin($|\/(users|properties|reviews|reports))/);
  });

  test("a student can log in and reach their dashboard", async ({ page }) => {
    await page.goto("/login?callbackUrl=/dashboard/student");
    await page.getByLabel("Email").fill(EMAIL);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/student/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("a logged-in student is still refused the admin area", async ({ page }) => {
    await page.goto("/login?callbackUrl=/dashboard/student");
    await page.getByLabel("Email").fill(EMAIL);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/student/, { timeout: 20_000 });

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/forbidden|\/login/);
  });

  test("bad credentials are rejected without revealing which field was wrong", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(EMAIL);
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText(/invalid|incorrect|wrong/i).first()).toBeVisible();
  });
});

test.describe("landlord billing", () => {
  test("a landlord can open billing and sees what money cannot buy", async ({ page }) => {
    await signIn(page, OWNER_EMAIL, OWNER_PASSWORD);
    await page.goto("/dashboard/landlord/billing");
    await expect(page.getByRole("heading", { level: 1, name: "Billing" })).toBeVisible();
    // The paid extras exist, but so does the explicit list of what is never for sale.
    await expect(page.getByText("Buy an extra")).toBeVisible();
    await expect(page.getByText("What you cannot buy")).toBeVisible();
    await expect(page.getByText(/verification badge/i).first()).toBeVisible();
  });

  test("a student cannot open landlord billing", async ({ page }) => {
    await signIn(page, EMAIL, PASSWORD);
    await page.goto("/dashboard/landlord/billing");
    await expect(page).toHaveURL(/\/forbidden|\/dashboard\/student/);
  });
});
