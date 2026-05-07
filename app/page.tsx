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
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Link
          href="/rezepte"
          className="rounded-lg border bg-white p-4 hover:border-accent"
        >
          <div className="font-medium">Rezepte</div>
          <div className="text-sm text-neutral-500">
            Sammlung verwalten
          </div>
        </Link>
        <Link
          href="/wochenplan"
          className="rounded-lg border bg-white p-4 hover:border-accent"
        >
          <div className="font-medium">Wochenplan</div>
          <div className="text-sm text-neutral-500">
            Mahlzeiten planen
          </div>
        </Link>
        <Link
          href="/einkaufszettel"
          className="rounded-lg border bg-white p-4 hover:border-accent"
        >
          <div className="font-medium">Einkaufszettel</div>
          <div className="text-sm text-neutral-500">
            Liste generieren
          </div>
        </Link>
      </div>

      <section className="rounded-lg border bg-white">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Diese Woche</h2>
        </div>
        <ul className="divide-y">
          {Array.from({ length: 7 }).map((_, i) => {
            const date = toISODate(addDays(monday, i));
            const items = byDate.get(date) ?? [];
            return (
              <li
                key={date}
                className="p-3 flex items-baseline gap-3 text-sm"
              >
                <div className="w-32 text-neutral-500">
                  {WEEKDAY_LABELS[i]}
                </div>
                <div className="flex-1">
                  {items.length === 0 ? (
                    <span className="text-neutral-400">—</span>
                  ) : (
                    <div className="space-y-0.5">
                      {items.map((it) => (
                        <div key={it.id}>
                          <span className="text-neutral-500 mr-2">
                            {it.slot === "lunch" ? "Mittag" : "Abend"}:
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
