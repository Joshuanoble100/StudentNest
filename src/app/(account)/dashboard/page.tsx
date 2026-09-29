import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/** /dashboard sends each role to its own home. */
export default async function DashboardIndexPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=%2Fdashboard");

  if (user.role === "ADMIN") redirect("/admin");
  if (user.role === "STUDENT") redirect("/dashboard/student");
  redirect("/dashboard/landlord");
}
