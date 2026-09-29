import type { Metadata } from "next";
import { requireUserPage } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getAccountSettings } from "@/lib/services/settings.service";
import { PageHeader } from "@/components/account/page-header";
import { ProfileForm } from "@/components/account/profile-form";
import { PasswordForm } from "@/components/account/password-form";
import { NotificationPreferencesForm } from "@/components/account/notification-preferences-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Account settings" };

export default async function AccountPage() {
  const session = await requireUserPage("/account");
  const settings = await getAccountSettings(session.id);

  const [universities, campuses, faculties, departments, hasPassword] = await Promise.all([
    prisma.university.findMany({
      select: { id: true, name: true, shortName: true },
      orderBy: { name: "asc" },
    }),
    prisma.campus.findMany({
      select: { id: true, name: true, universityId: true },
      orderBy: { name: "asc" },
    }),
    prisma.faculty.findMany({ select: { id: true, name: true, universityId: true } }),
    prisma.department.findMany({ select: { id: true, name: true, facultyId: true } }),
    prisma.user.findUnique({
      where: { id: session.id },
      select: { passwordHash: true },
    }),
  ]);

  const profile = settings.profile;
  const prefs = profile?.notificationPreference;

  return (
    <div>
      <PageHeader
        title="Account settings"
        description="Your details, password and notification preferences."
      />

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{settings.email}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Member since {formatDate(settings.createdAt)}
            {settings.phone ? ` · ${settings.phone}` : ""}
          </p>
        </div>
        <Badge variant="neutral">{ROLE_LABELS[settings.role]}</Badge>
        <Badge variant={settings.emailVerified ? "verified" : "pending"}>
          {settings.emailVerified ? "Email verified" : "Email not verified"}
        </Badge>
      </div>

      {!settings.emailVerified && (
        <Alert variant="warning" className="mb-5">
          Your email address is not verified yet. Some actions — including publishing a review as
          verified — need a confirmed email. Check your inbox for the verification link.
        </Alert>
      )}

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <ProfileForm
            initial={{
              name: settings.name,
              phone: settings.phone,
              displayName: profile?.displayName ?? null,
              bio: profile?.bio ?? null,
              gender: profile?.gender ?? null,
              level: profile?.level ?? null,
              universityId: profile?.universityId ?? null,
              campusId: profile?.campusId ?? null,
              facultyId: profile?.facultyId ?? null,
              departmentId: profile?.departmentId ?? null,
            }}
            isStudent={settings.role === "STUDENT"}
            universities={universities}
            campuses={campuses}
            faculties={faculties}
            departments={departments}
          />
        </TabsContent>

        <TabsContent value="password" className="mt-4">
          <PasswordForm hasPassword={Boolean(hasPassword?.passwordHash)} />
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <NotificationPreferencesForm
            initial={{
              emailEnabled: prefs?.emailEnabled ?? true,
              inquiryEmails: prefs?.inquiryEmails ?? true,
              messageEmails: prefs?.messageEmails ?? true,
              matchEmails: prefs?.matchEmails ?? true,
              reviewEmails: prefs?.reviewEmails ?? true,
              marketingEmails: prefs?.marketingEmails ?? false,
              pushEnabled: prefs?.pushEnabled ?? true,
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
