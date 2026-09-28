import Link from "next/link";
import { Home } from "lucide-react";
import { SITE_NAME, SAFETY_WARNING } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="container-page py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-white">
                <Home className="h-4 w-4" aria-hidden />
              </span>
              <span className="text-lg font-bold text-slate-900">
                Student<span className="text-brand-700">Nest</span>
              </span>
            </Link>
            <p className="mt-3 max-w-md text-sm text-slate-500">
              Student-focused housing and roommate matching for Nigerian universities.
              Find a place you can trust.
            </p>
            <p className="mt-4 max-w-md rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
              <strong>Stay safe:</strong> {SAFETY_WARNING}
            </p>
          </div>
          <nav aria-label="Platform links">
            <h3 className="text-sm font-semibold text-slate-900">Platform</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-500">
              <li><Link href="/properties" className="hover:text-brand-700">Browse properties</Link></li>
              <li><Link href="/roommates" className="hover:text-brand-700">Find roommates</Link></li>
              <li><Link href="/safety" className="hover:text-brand-700">Safety center</Link></li>
              <li><Link href="/register?role=LANDLORD" className="hover:text-brand-700">List a property</Link></li>
            </ul>
          </nav>
          <nav aria-label="Account links">
            <h3 className="text-sm font-semibold text-slate-900">Account</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-500">
              <li><Link href="/login" className="hover:text-brand-700">Log in</Link></li>
              <li><Link href="/register" className="hover:text-brand-700">Create account</Link></li>
              <li><Link href="/dashboard/student" className="hover:text-brand-700">Student dashboard</Link></li>
              <li><Link href="/dashboard/landlord" className="hover:text-brand-700">Landlord dashboard</Link></li>
            </ul>
          </nav>
        </div>
        <div className="mt-8 border-t border-slate-200 pt-6 text-xs text-slate-400">
          © {new Date().getFullYear()} {SITE_NAME}. Reviews and verification status reflect reported
          information and platform checks — they are not guarantees of quality or safety.
        </div>
      </div>
    </footer>
  );
}
