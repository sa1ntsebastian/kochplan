import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cookies } from "next/headers";
import "./globals.css";
import { AUTH_COOKIE } from "@/lib/auth";
import SavedToast from "./components/SavedToast";

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
    <html lang="de">
      <body className="min-h-screen flex flex-col">
        {isAuthed && (
          <header className="border-b bg-white sticky top-0 z-10">
            <nav className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4 text-sm">
              <Link href="/" className="font-semibold text-base">
                Kochplan
              </Link>
              <div className="flex gap-3 ml-auto">
                <Link href="/rezepte" className="hover:text-accent">
                  Rezepte
                </Link>
                <Link href="/wochenplan" className="hover:text-accent">
                  Wochenplan
                </Link>
                <Link href="/einkaufszettel" className="hover:text-accent">
                  Einkaufszettel
                </Link>
                <form action="/api/auth/logout" method="post">
                  <button
                    type="submit"
                    className="text-neutral-500 hover:text-neutral-900"
                  >
                    Logout
                  </button>
                </form>
              </div>
            </nav>
          </header>
        )}
        <Suspense fallback={null}>
          <SavedToast />
        </Suspense>
        <main className="flex-1 max-w-4xl mx-auto px-4 py-6 w-full">
          {children}
        </main>
      </body>
    </html>
  );
}
