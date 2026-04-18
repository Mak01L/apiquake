import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "apiquake — Never get surprised by an API breaking change again",
  description:
    "Monitor changelogs for Stripe, OpenAI, GitHub, Twilio, Vercel and 200+ APIs. Get alerts on breaking changes, deprecations, and new features in Slack, Discord, and email.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://apiquake.dev",
  ),
  openGraph: {
    title: "apiquake",
    description:
      "Never get surprised by an API breaking change again. Alerts for Stripe, OpenAI, GitHub, Twilio, Vercel and more.",
    url: "https://apiquake.dev",
    siteName: "apiquake",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
