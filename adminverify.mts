/**
 * Scratch verification harness — signs in as the seeded admin and walks every
 * admin surface, then exercises one real verification decision.
 *
 * Credentials are read from .env at runtime and are never written to output.
 */
import { loadDotEnv } from "./prisma/seed/helpers";
import { chromium } from "@playwright/test";

loadDotEnv();

const BASE = "http://localhost:3000";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "";
const STUDENT_EMAIL = "chi.student@studentnest.test";
const STUDENT_PASSWORD = process.env.E2E_PASSWORD ?? "Student!2345";

const PAGES = [
  "/admin",
  "/admin/users",
  "/admin/verifications",
  "/admin/properties",
  "/admin/reviews",
  "/admin/reports",
  "/admin/universities",
  "/admin/analytics",
  "/admin/audit-logs",
  "/admin/settings",
];

async function signIn(page: import("@playwright/test").Page, email: string, password: string, landOn: string) {
  await page.goto(`${BASE}/login?callbackUrl=${encodeURIComponent(landOn)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /log in/i }).click();
  await page.waitForURL((u) => u.pathname.startsWith(landOn), { timeout: 60_000 });
}

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.log("ABORT: SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set in .env");
    process.exitCode = 1;
    return;
  }
  console.log(`admin email = ${ADMIN_EMAIL} (password read from .env, ${ADMIN_PASSWORD.length} chars, not printed)`);

  const browser = await chromium.launch();

  // ---- admin session -------------------------------------------------------
  const adminCtx = await browser.newContext();
  const page = await adminCtx.newPage();
  await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD, "/admin");
  console.log(`SIGN-IN ok -> ${new URL(page.url()).pathname}`);

  console.log("\n=== admin pages ===");
  for (const path of PAGES) {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    const h1 = (await page.locator("h1").first().innerText().catch(() => "(no h1)")).replace(/\s+/g, " ").trim();
    console.log(`${res?.status()} ${path.padEnd(24)} h1="${h1.slice(0, 60)}"`);
  }

  // ---- role filtering on /admin/users -------------------------------------
  console.log("\n=== /admin/users role filters ===");
  for (const role of ["STUDENT", "LANDLORD", "AGENT", "ADMIN"]) {
    const res = await page.goto(`${BASE}/admin/users?role=${role}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    const header = (await page.locator("h1 + p, h1 ~ p").first().innerText().catch(() => "")).replace(/\s+/g, " ").trim();
    const rows = await page.locator("ul > li").count();
    console.log(`${res?.status()} role=${role.padEnd(8)} rows=${rows} "${header.slice(0, 70)}"`);
  }

  // ---- exercise one real verification decision -----------------------------
  console.log("\n=== verification workflow (one real approval) ===");
  await page.goto(`${BASE}/admin/verifications?status=PENDING`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  const pendingBefore = await page.locator("ul > li").count();
  console.log(`pending requests rendered: ${pendingBefore}`);

  if (pendingBefore === 0) {
    console.log("nothing pending to approve — skipping the live decision");
  } else {
    const first = page.locator("ul > li").first();
    console.log("step: reading first applicant…");
    const applicant = (await first.locator("p.font-semibold").first().innerText({ timeout: 10_000 })).trim();
    const docLinks = await first.locator('a[target="_blank"]').count();
    console.log(`first applicant: ${applicant}; attached document links: ${docLinks}`);

    const approveButton = first.getByRole("button", { name: /^Approve$/ });
    console.log(`step: approve buttons on first row = ${await approveButton.count()}`);
    await approveButton.first().click({ timeout: 10_000 });
    console.log("step: clicked Approve, waiting for dialog…");

    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ state: "visible", timeout: 15_000 });
    console.log(`dialog title: "${(await dialog.getByRole("heading").first().innerText()).trim()}"`);

    console.log("step: clicking Confirm…");
    const [apiRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/admin/verifications/") && r.request().method() === "POST", { timeout: 30_000 }),
      dialog.getByRole("button", { name: /^Confirm$/ }).click({ timeout: 10_000 }),
    ]);
    console.log(`POST ${new URL(apiRes.url()).pathname} -> ${apiRes.status()}`);
    console.log(`response body: ${JSON.stringify(await apiRes.json().catch(() => null))}`);

    await page.goto(`${BASE}/admin/verifications?status=PENDING`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    const pendingAfter = await page.locator("ul > li").count();
    console.log(`pending after approval: ${pendingAfter} (was ${pendingBefore})`);

    // The decision must be final: no action buttons on a decided request.
    await page.goto(`${BASE}/admin/verifications?status=VERIFIED`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    const decidedButtons = await page.locator("ul > li").first().getByRole("button", { name: /^(Approve|Reject)$/ }).count();
    const finality = (await page.locator("ul > li").first().innerText()).includes("Decisions are final");
    console.log(`decided row: action buttons=${decidedButtons} (expect 0), "Decisions are final" copy present=${finality}`);

    // Audit trail
    await page.goto(`${BASE}/admin/audit-logs`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    const body = await page.locator("body").innerText();
    console.log(`audit log mentions account.verification.verified: ${body.includes("account.verification.verified")}`);
  }

  // ---- a non-admin must still be refused ----------------------------------
  console.log("\n=== role enforcement with a student session ===");
  const studentCtx = await browser.newContext();
  const sPage = await studentCtx.newPage();
  await signIn(sPage, STUDENT_EMAIL, STUDENT_PASSWORD, "/dashboard/student");
  console.log(`student sign-in ok -> ${new URL(sPage.url()).pathname}`);
  for (const path of ["/admin", "/admin/users", "/admin/verifications"]) {
    const res = await sPage.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    console.log(`${res?.status()} student -> ${path} landed on ${new URL(sPage.url()).pathname}`);
  }
  const apiRes = await sPage.request.post(`${BASE}/api/admin/verifications/00000000-0000-0000-0000-000000000000`, {
    data: { decision: "VERIFIED" },
    headers: { "Content-Type": "application/json" },
  });
  console.log(`student POST /api/admin/verifications/<id> -> ${apiRes.status()} (expect 403)`);

  await browser.close();
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exitCode = 1;
});
