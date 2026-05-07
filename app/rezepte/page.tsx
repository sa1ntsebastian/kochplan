import Link from "next/link";
import { supabaseServer } from "@/lib/supabase";
import type { Recipe } from "@/lib/types";
import RecipeFilter from "./RecipeFilter";

export const dynamic = "force-dynamic";

export default async function RezeptePage() {
  const sb = supabaseServer();
  const { data } = await sb
    .from("recipes")
    .select("*")
    .order("name", { ascending: true });
  const recipes = (data ?? []) as Recipe[];

  const allTags = Array.from(
    new Set(recipes.flatMap((r) => r.tags ?? []))
  ).sort();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Rezepte</h1>
        <Link
          href="/rezepte/neu"
          className="bg-accent hover:bg-accent-dark text-white rounded px-3 py-2 text-sm font-medium"
        >
          + Neues Rezept
        </Link>
      </div>
      <RecipeFilter recipes={recipes} allTags={allTags} />
    </div>
  );
}
