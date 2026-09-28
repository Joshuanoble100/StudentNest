"use client";

import Link from "next/link";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { Menu, X, Home, Search, Users, ShieldAlert, LayoutDashboard, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileNavProps {
  user: { name: string; email: string; role: string } | null;
}

function dashboardHome(role: string): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "STUDENT":
      return "/dashboard/student";
    default:
      return "/dashboard/landlord";
  }
}

export function MobileNav({ user }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Open menu">
        <Menu className="h-5 w-5" aria-hidden />
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 bg-slate-950/50" onClick={() => setOpen(false)} aria-hidden>
          <nav
            className="absolute right-0 top-0 h-full w-72 bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            aria-label="Mobile navigation"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="font-semibold text-slate-900">Menu</span>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close menu">
                <X className="h-5 w-5" aria-hidden />
              </Button>
            </div>
            <div className="flex flex-col gap-1">
              <MobileLink href="/properties" onClick={() => setOpen(false)} icon={<Search className="h-4 w-4" />}>
                Find Housing
              </MobileLink>
              <MobileLink href="/roommates" onClick={() => setOpen(false)} icon={<Users className="h-4 w-4" />}>
                Roommates
              </MobileLink>
              <MobileLink href="/safety" onClick={() => setOpen(false)} icon={<ShieldAlert className="h-4 w-4" />}>
                Safety
              </MobileLink>
              {user ? (
                <>
                  <hr className="my-2 border-slate-200" />
                  <MobileLink
                    href={dashboardHome(user.role)}
                    onClick={() => setOpen(false)}
                    icon={<LayoutDashboard className="h-4 w-4" />}
                  >
                    Dashboard
                  </MobileLink>
                  <MobileLink href="/messages" onClick={() => setOpen(false)} icon={<Home className="h-4 w-4" />}>
                    Messages
                  </MobileLink>
                  <button
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                    onClick={() => signOut({ callbackUrl: "/" })}
                  >
                    <LogIn className="h-4 w-4" aria-hidden /> Log out
                  </button>
                </>
              ) : (
                <>
                  <hr className="my-2 border-slate-200" />
                  <MobileLink href="/login" onClick={() => setOpen(false)} icon={<LogIn className="h-4 w-4" />}>
                    Log in
                  </MobileLink>
                  <Link
                    href="/register"
                    onClick={() => setOpen(false)}
                    className="mt-2 rounded-lg bg-brand-700 px-3 py-2 text-center text-sm font-semibold text-white"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}

function MobileLink({
  href,
  onClick,
  icon,
  children,
}: {
  href: string;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
    >
      {icon}
      {children}
    </Link>
  );
}
