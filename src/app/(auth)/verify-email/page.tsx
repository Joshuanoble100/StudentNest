import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { verifyEmailToken } from "@/lib/services/auth.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Verify email" };
export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  let success = false;
  let errorMessage = "This verification link is invalid or has expired.";

  if (token) {
    try {
      await verifyEmailToken(token);
      success = true;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : errorMessage;
    }
  }

  return (
    <div className="container-page flex min-h-[60vh] items-center justify-center py-10">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8 text-center">
          {success ? (
            <>
              <CheckCircle2 className="h-12 w-12 text-emerald-600" aria-hidden />
              <h1 className="text-xl font-semibold text-slate-900">Email verified</h1>
              <p className="text-sm text-slate-500">
                Your account is fully active. You can now use every StudentNest feature.
              </p>
            </>
          ) : (
            <>
              <XCircle className="h-12 w-12 text-red-500" aria-hidden />
              <h1 className="text-xl font-semibold text-slate-900">Verification failed</h1>
              <p className="text-sm text-slate-500">{errorMessage}</p>
            </>
          )}
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/">Home</Link>
            </Button>
            <Button asChild>
              <Link href={success ? "/login" : "/account"}>
                {success ? "Log in" : "Account settings"}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
