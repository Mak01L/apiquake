import Link from "next/link";
import { requireUser } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <svg width="20" height="20" viewBox="0 0 24 24" className="text-brand">
              <path
                fill="currentColor"
                d="M3 13h3l2-6 4 14 3-9 2 4h4v2h-5l-1-2-3 9-4-14-1 4H3z"
              />
            </svg>
            <span>apiquake</span>
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/dashboard" className="text-muted-fg hover:text-fg">
              Feed
            </Link>
            <Link href="/dashboard/apis" className="text-muted-fg hover:text-fg">
              APIs
            </Link>
            <Link href="/dashboard/settings" className="text-muted-fg hover:text-fg">
              Settings
            </Link>
            <Link href="/dashboard/billing" className="text-muted-fg hover:text-fg">
              Billing
            </Link>
            <span className="text-xs text-muted-fg">
              {user.email} · <span className="uppercase">{user.plan}</span>
            </span>
            <form action="/logout" method="POST">
              <button className="btn btn-ghost text-xs" type="submit">
                Log out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
