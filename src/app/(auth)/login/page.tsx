import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSessionFor, verifyPassword } from "@/lib/auth";

async function login(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return;
  const rows = await db.select().from(users).where(eq(users.email, email));
  const user = rows[0];
  if (!user) {
    redirect("/login?error=invalid");
  }
  const ok = await verifyPassword(password, user!.passwordHash);
  if (!ok) {
    redirect("/login?error=invalid");
  }
  await createSessionFor(user!.id);
  redirect("/dashboard");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Link href="/" className="mb-6 text-sm text-muted-fg hover:text-fg">
        ← back to apiquake
      </Link>
      <h1 className="text-3xl font-bold">Log in</h1>
      <p className="mt-1 text-sm text-muted-fg">
        Welcome back. No account?{" "}
        <Link href="/signup" className="text-brand underline">
          Sign up
        </Link>
        .
      </p>
      <form action={login} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="input mt-1"
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="input mt-1"
          />
        </div>
        {sp.error === "invalid" && (
          <p className="text-sm text-danger">Invalid email or password.</p>
        )}
        <button type="submit" className="btn btn-primary w-full">
          Log in
        </button>
      </form>
    </main>
  );
}
