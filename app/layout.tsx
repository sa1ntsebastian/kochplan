import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { EB_Garamond } from "next/font/google";
import "./globals.css";
import { AUTH_COOKIE } from "@/lib/auth";
import SavedToast from "./components/SavedToast";

const garamond = EB_Garamond({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kochplan",
  description: "Wochenplan & Einkaufszettel",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const isAuthed = Boolean(cookieStore.get(AUTH_COOKIE)?.value);

  return (
    <html lang="de" className={garamond.variable}>
      <body className="min-h-screen flex flex-col">
        {isAuthed && (
          <header className="bg-forest text-cream-100 sticky top-0 z-20 shadow-sm">
            <nav className="max-w-4xl mx-auto px-5 py-4 flex items-baseline gap-6">
              <Link
                href="/"
                className="brand text-xl text-cream-100 hover:text-peach"
              >
                kochplan
              </Link>
              <div className="flex items-baseline gap-5 ml-auto text-sm brand">
                <NavLink href="/rezepte">rezepte</NavLink>
                <NavLink href="/wochenplan">wochenplan</NavLink>
                <NavLink href="/einkaufszettel">einkauf</NavLink>
                <form action="/api/auth/logout" method="post">
                  <button
                    type="submit"
                    className="text-cream-100/60 hover:text-peach"
                  >
                    logout
                  </button>
                </form>
              </div>
            </nav>
          </header>
        )}
        <Suspense fallback={null}>
          <SavedToast />
        </Suspense>
        <main className="flex-1 max-w-4xl mx-auto px-5 py-8 w-full fade-up">
          {children}
        </main>
      </body>
    </html>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-cream-100 hover:text-peach transition-colors"
    >
      {children}
    </Link>
  );
}
