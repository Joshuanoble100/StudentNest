import Link from "next/link";
import { auth } from "@/auth";
import { SITE_NAME } from "@/lib/constants";
import { UserMenu } from "@/components/layout/user-menu";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Home, Search } from "lucide-react";

const navLinks = [
  { href: "/properties", label: "Find Housing" },
  { href: "/roommates", label: "Roommates" },
  { href: "/safety", label: "Safety" },
];

export async function SiteHeader() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2" aria-label={`${SITE_NAME} home`}>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-white">
              <Home className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-900">
              Student<span className="text-brand-700">Nest</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/properties"
            className="hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 sm:block"
            aria-label="Search properties"
          >
            <Search className="h-5 w-5" aria-hidden />
          </Link>
          {user ? (
            <>
              <NotificationBell />
              <div className="hidden sm:block">
                <UserMenu user={{ name: user.name ?? "Account", email: user.email ?? "", role: user.role }} />
              </div>
              <div className="sm:hidden">
                <MobileNav user={{ name: user.name ?? "Account", email: user.email ?? "", role: user.role }} />
              </div>
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-800"
              >
                Sign up
              </Link>
            </div>
          )}
          {!user && (
            <div className="sm:hidden">
              <MobileNav user={null} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
