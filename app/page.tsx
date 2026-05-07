import Link from "next/link";
import { supabaseServer } from "@/lib/supabase";
import { mondayOf, addDays, toISODate, WEEKDAY_LABELS } from "@/lib/dates";
import type { MealPlanEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const sb = supabaseServer();
  const monday = mondayOf(new Date());
  const sunday = addDays(monday, 6);

  const { data: entries } = await sb
    .from("meal_plans")
    .select("*, recipe:recipes(id,name)")
    .gte("date", toISODate(monday))
    .lte("date", toISODate(sunday))
    .order("date", { ascending: true });

  const byDate = new Map<string, MealPlanEntry[]>();
  for (const e of (entries ?? []) as MealPlanEntry[]) {
    const arr = byDate.get(e.date) ?? [];
    arr.push(e);
    byDate.set(e.date, arr);
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <DashCard
          href="/rezepte"
          title="Rezepte"
          subtitle="Sammlung verwalten"
        />
        <DashCard
          href="/wochenplan"
          title="Wochenplan"
          subtitle="Mahlzeiten planen"
        />
        <DashCard
          href="/einkaufszettel"
          title="Einkaufszettel"
          subtitle="Liste generieren"
        />
      </div>

      <section className="bg-white border border-taupe-light rounded-lg shadow-sm">
        <div className="px-4 py-3 border-b border-taupe-light flex items-baseline justify-between">
          <h2 className="font-serif text-lg text-ink">Diese Woche</h2>
          <Link
            href="/wochenplan"
            className="text-xs text-forest hover:text-peach-dark"
          >
            bearbeiten →
          </Link>
        </div>
        <ul className="divide-y divide-taupe-light/60">
          {Array.from({ length: 7 }).map((_, i) => {
            const date = toISODate(addDays(monday, i));
            const items = byDate.get(date) ?? [];
            return (
              <li
                key={date}
                className="px-4 py-3 flex items-baseline gap-4 text-sm"
              >
                <div className="w-32 text-taupe-dark font-serif">
                  {WEEKDAY_LABELS[i]}
                </div>
                <div className="flex-1">
                  {items.length === 0 ? (
                    <span className="text-taupe">—</span>
                  ) : (
                    <div className="space-y-0.5">
                      {items.map((it) => (
                        <div key={it.id} className="text-ink">
                          <span className="text-taupe-dark mr-2 text-xs uppercase tracking-wide">
                            {it.slot === "lunch" ? "Mittag" : "Abend"}
                          </span>
                          {it.recipe?.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function DashCard({
  href,
  title,
  subtitle,
}: {
  href: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-taupe-light bg-white px-4 py-5 hover:border-forest hover:shadow-md transition-all group"
    >
      <div className="font-serif text-lg text-ink group-hover:text-forest">
        {title}
      </div>
      <div className="text-sm text-taupe-dark mt-0.5">{subtitle}</div>
    </Link>
  );
}
