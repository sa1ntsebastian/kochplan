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
import type { MealPlanEntry } from "@/lib/types";
import WeekGrid from "./WeekGrid";
import type { RecipeMeta } from "./lib";

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
    sb
      .from("recipes")
      .select(
        "id, name, servings, tags, recipe_ingredients(ingredient:ingredients(name))"
      )
      .order("name"),
  ]);

  const plans = (plansRes.data ?? []) as MealPlanEntry[];

  type RawRecipe = {
    id: string;
    name: string;
    servings: number;
    tags: string[] | null;
    recipe_ingredients:
      | { ingredient: { name: string } | { name: string }[] | null }[]
      | null;
  };
  const rawRecipes = (recipesRes.data ?? []) as unknown as RawRecipe[];

  const recipes: RecipeMeta[] = rawRecipes.map((r) => {
    const names: string[] = [];
    for (const ri of r.recipe_ingredients ?? []) {
      const rel = ri.ingredient;
      if (!rel) continue;
      if (Array.isArray(rel)) {
        for (const x of rel) if (x?.name) names.push(x.name);
      } else if (rel.name) {
        names.push(rel.name);
      }
    }
    return {
      id: r.id,
      name: r.name,
      servings: r.servings,
      tags: r.tags ?? [],
      ingredient_names: names,
    };
  });

  const recipeNameById = new Map<string, string>();
  for (const r of recipes) recipeNameById.set(r.id, r.name);

  const days = weekDates(monday).map((d) => toISODate(d));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Wochenplan</h1>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={`/wochenplan?week=${prev}`}
            className="border rounded px-2 py-1 hover:bg-cream-50"
          >
            ← Woche
          </Link>
          <span className="text-taupe-dark px-2">
            {formatDateShort(monday)} – {formatDateShort(sunday)}
          </span>
          <Link
            href={`/wochenplan?week=${next}`}
            className="border rounded px-2 py-1 hover:bg-cream-50"
          >
            Woche →
          </Link>
        </div>
      </div>

      <WeekGrid
        days={days}
        weekdayLabels={WEEKDAY_LABELS}
        dayLabels={weekDates(monday).map((d) => formatDateShort(d))}
        plans={plans}
        recipes={recipes}
        recipeNameById={Array.from(recipeNameById.entries())}
      />

      <div className="text-right">
        <Link
          href="/einkaufszettel"
          className="inline-block bg-forest hover:bg-forest-dark text-white rounded px-4 py-2 text-sm font-medium"
        >
          Einkaufszettel öffnen →
        </Link>
      </div>
    </div>
  );
}
