import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-helpers";
import { AccountNav } from "@/components/layout/account-nav";

export const dynamic = "force-dynamic";

/** Shared shell for every signed-in page outside the admin panel. */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="container-page grid gap-6 py-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:py-8">
      <AccountNav role={user.role} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
