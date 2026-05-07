import Link from "next/link";
import { supabaseServer } from "@/lib/supabase";
import {
  addDays,
  formatDateShort,
  mondayOf,
  parseISODate,
  toISODate,
  WEEKDAY_LABELS,
  weekDates,
} from "@/lib/dates";
import type { MealPlanEntry, Recipe, Slot } from "@/lib/types";
import SlotEditor from "./SlotEditor";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ week?: string }>;

export default async function WochenplanPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const monday = sp.week ? mondayOf(parseISODate(sp.week)) : mondayOf(new Date());
  const sunday = addDays(monday, 6);
  const prev = toISODate(addDays(monday, -7));
  const next = toISODate(addDays(monday, 7));

  const sb = supabaseServer();

  const [plansRes, recipesRes] = await Promise.all([
    sb
      .from("meal_plans")
      .select("*")
      .gte("date", toISODate(monday))
      .lte("date", toISODate(sunday)),
    sb.from("recipes").select("id,name,servings").order("name"),
  ]);

  const plans = (plansRes.data ?? []) as MealPlanEntry[];
  const recipes = (recipesRes.data ?? []) as Pick<
    Recipe,
    "id" | "name" | "servings"
  >[];

  const lookup = new Map<string, MealPlanEntry>();
  for (const p of plans) lookup.set(`${p.date}__${p.slot}`, p);

  const days = weekDates(monday);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Wochenplan</h1>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={`/wochenplan?week=${prev}`}
            className="border rounded px-2 py-1 hover:bg-neutral-50"
          >
            ← Woche
          </Link>
          <span className="text-neutral-500 px-2">
            {formatDateShort(monday)} – {formatDateShort(sunday)}
          </span>
          <Link
            href={`/wochenplan?week=${next}`}
            className="border rounded px-2 py-1 hover:bg-neutral-50"
          >
            Woche →
          </Link>
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="hidden md:grid grid-cols-[8rem_1fr_1fr] text-xs uppercase tracking-wide text-neutral-500 border-b bg-neutral-50">
          <div className="p-2">Tag</div>
          <div className="p-2">Mittag</div>
          <div className="p-2">Abend</div>
        </div>
        <ul className="divide-y">
          {days.map((d, i) => {
            const dateStr = toISODate(d);
            const lunch = lookup.get(`${dateStr}__lunch`);
            const dinner = lookup.get(`${dateStr}__dinner`);
            return (
              <li
                key={dateStr}
                className="md:grid md:grid-cols-[8rem_1fr_1fr] p-2 md:p-0"
              >
                <div className="md:p-3">
                  <div className="font-medium">{WEEKDAY_LABELS[i]}</div>
                  <div className="text-xs text-neutral-500">
                    {formatDateShort(d)}
                  </div>
                </div>
                <SlotCell
                  date={dateStr}
                  slot="lunch"
                  entry={lunch}
                  recipes={recipes}
                />
                <SlotCell
                  date={dateStr}
                  slot="dinner"
                  entry={dinner}
                  recipes={recipes}
                />
              </li>
            );
          })}
        </ul>
      </div>

      <div className="text-right">
        <Link
          href="/einkaufszettel"
          className="inline-block bg-accent hover:bg-accent-dark text-white rounded px-4 py-2 text-sm font-medium"
        >
          Einkaufszettel öffnen →
        </Link>
      </div>
    </div>
  );
}

function SlotCell({
  date,
  slot,
  entry,
  recipes,
}: {
  date: string;
  slot: Slot;
  entry: MealPlanEntry | undefined;
  recipes: Pick<Recipe, "id" | "name" | "servings">[];
}) {
  return (
    <div className="md:p-3 md:border-l">
      <div className="md:hidden text-xs text-neutral-500 mt-2 mb-1">
        {slot === "lunch" ? "Mittag" : "Abend"}
      </div>
      <SlotEditor date={date} slot={slot} entry={entry} recipes={recipes} />
    </div>
  );
}
