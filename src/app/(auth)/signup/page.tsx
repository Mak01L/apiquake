import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSessionFor, hashPassword } from "@/lib/auth";

async function signup(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim() || null;
  if (!email || !password || password.length < 8) {
    redirect("/signup?error=weak");
  }
  const existing = await db.select().from(users).where(eq(users.email, email));
  if (existing.length > 0) {
    redirect("/signup?error=exists");
  }
  const hash = await hashPassword(password);
  const inserted = await db
    .insert(users)
    .values({ email, passwordHash: hash, name })
    .returning({ id: users.id });
  await createSessionFor(inserted[0].id);
  redirect("/dashboard");
}

export default async function SignupPage({
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
      <h1 className="text-3xl font-bold">Create your account</h1>
      <p className="mt-1 text-sm text-muted-fg">
        5 APIs free, forever. No card required.
      </p>
      <form action={signup} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="name">
            Name (optional)
          </label>
          <input id="name" name="name" className="input mt-1" />
        </div>
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
            Password (8+ chars)
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="input mt-1"
          />
        </div>
        {sp.error === "exists" && (
          <p className="text-sm text-danger">That email is already registered.</p>
        )}
        {sp.error === "weak" && (
          <p className="text-sm text-danger">
            Password must be at least 8 characters.
          </p>
        )}
        <button type="submit" className="btn btn-primary w-full">
          Create account
        </button>
      </form>
      <p className="mt-4 text-xs text-muted-fg">
        Already have an account?{" "}
        <Link href="/login" className="text-brand underline">
          Log in
        </Link>
        .
      </p>
    </main>
  );
}
