"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GraduationCap, Building2, Briefcase, Home } from "lucide-react";

interface UniversityOption {
  id: string;
  name: string;
  shortName: string;
  campuses: { id: string; name: string }[];
}

const roleCards = [
  { value: "STUDENT", label: "Student", description: "Find housing & roommates", icon: GraduationCap },
  { value: "LANDLORD", label: "Landlord", description: "List your properties", icon: Building2 },
  { value: "AGENT", label: "Caretaker / Agent", description: "Manage listings for owners", icon: Briefcase },
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role");
  const [submitting, setSubmitting] = useState(false);
  const [universities, setUniversities] = useState<UniversityOption[]>([]);
  const [selectedUniversityId, setSelectedUniversityId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>(
    initialRole === "LANDLORD" || initialRole === "AGENT" ? initialRole : "STUDENT",
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: selectedRole as RegisterInput["role"] },
  });

  const watchRole = watch("role");

  useEffect(() => {
    fetch("/api/universities?withCampuses=true")
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((json) => setUniversities(json.data ?? []))
      .catch(() => setUniversities([]));
  }, []);

  const showUniversity = (watchRole ?? selectedRole) === "STUDENT";

  async function onSubmit(values: RegisterInput) {
    setSubmitting(true);
    try {
      const payload = { ...values, role: values.role ?? (selectedRole as RegisterInput["role"]) };
      if (!showUniversity) {
        delete payload.universityId;
        delete payload.campusId;
      }
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Registration failed");
        return;
      }
      // Auto-login after registration.
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });
      if (result?.error) {
        toast.success("Account created! Please log in.");
        router.push("/login");
        return;
      }
      toast.success("Welcome to StudentNest! Check your email to verify your account.");
      const home =
        payload.role === "STUDENT" ? "/dashboard/student" : "/dashboard/landlord";
      router.push(home);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container-page flex min-h-[calc(100vh-4rem)] items-center justify-center py-10">
      <Card className="w-full max-w-lg">
        <CardHeader className="items-center text-center">
          <Link href="/" className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-700 text-white" aria-label="StudentNest home">
            <Home className="h-5 w-5" aria-hidden />
          </Link>
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>Join thousands of students finding trusted housing.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-slate-700">I am a…</legend>
              <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Account type">
                {roleCards.map((role) => {
                  const Icon = role.icon;
                  const active = (watchRole ?? selectedRole) === role.value;
                  return (
                    <button
                      key={role.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => {
                        setSelectedRole(role.value);
                        setValue("role", role.value as RegisterInput["role"], { shouldValidate: false });
                      }}
                      className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${
                        active
                          ? "border-brand-700 bg-brand-50 ring-1 ring-brand-700"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <Icon className="h-5 w-5 text-brand-700" aria-hidden />
                      <span className="text-sm font-semibold text-slate-900">{role.label}</span>
                      <span className="text-xs text-slate-500">{role.description}</span>
                    </button>
                  );
                })}
              </div>
              <input type="hidden" {...register("role")} />
            </fieldset>

            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" autoComplete="name" aria-invalid={Boolean(errors.name)} {...register("name")} />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} {...register("email")} />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone <span className="font-normal text-slate-400">(optional)</span></Label>
              <Input id="phone" type="tel" autoComplete="tel" placeholder="08031234567" aria-invalid={Boolean(errors.phone)} {...register("phone")} />
              {errors.phone && <p className="text-xs text-red-600">{errors.phone.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.password)}
                {...register("password")}
              />
              {errors.password ? (
                <p className="text-xs text-red-600">{errors.password.message}</p>
              ) : (
                <p className="text-xs text-slate-400">At least 8 characters, with a letter and a number.</p>
              )}
            </div>

            {showUniversity && universities.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="university">University <span className="font-normal text-slate-400">(optional)</span></Label>
                  <Select
                    onValueChange={(value) => {
                      const id = value === "none" ? "" : value;
                      setSelectedUniversityId(id);
                      setValue("universityId", id || undefined);
                      setValue("campusId", undefined);
                    }}
                  >
                    <SelectTrigger id="university">
                      <SelectValue placeholder="Select university" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Prefer not to say</SelectItem>
                      {universities.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({u.shortName})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <CampusSelect
                  campuses={universities.find((u) => u.id === selectedUniversityId)?.campuses ?? []}
                  onCampusChange={(id) => setValue("campusId", id)}
                />
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting ? "Creating account…" : "Create account"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-brand-700 hover:underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function CampusSelect({
  campuses,
  onCampusChange,
}: {
  campuses: { id: string; name: string }[];
  onCampusChange: (id: string | undefined) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="campus">Campus <span className="font-normal text-slate-400">(optional)</span></Label>
      <Select
        disabled={campuses.length === 0}
        onValueChange={(value) => onCampusChange(value === "none" ? undefined : value)}
      >
        <SelectTrigger id="campus">
          <SelectValue placeholder={campuses.length ? "Select campus" : "Select university first"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Any campus</SelectItem>
          {campuses.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
