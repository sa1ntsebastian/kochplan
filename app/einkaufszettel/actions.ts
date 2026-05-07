"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase";
import type { Category, Unit } from "@/lib/types";

export async function regenerateShoppingList(weekStart: string) {
  const sb = supabaseServer();

  const weekEnd = addDaysISO(weekStart, 6);

  const { data: plans, error: ePlans } = await sb
    .from("meal_plans")
    .select("recipe_id, servings, recipe:recipes(id, servings)")
    .gte("date", weekStart)
    .lte("date", weekEnd);
  if (ePlans) throw new Error(ePlans.message);

  const recipeIds = Array.from(
    new Set((plans ?? []).map((p) => p.recipe_id))
  );

  type RIRow = {
    recipe_id: string;
    amount: number;
    ingredient: {
      id: string;
      name: string;
      unit: Unit;
      category: Category;
    } | null;
  };
  let ris: RIRow[] = [];
  if (recipeIds.length > 0) {
    const { data, error } = await sb
      .from("recipe_ingredients")
      .select("recipe_id, amount, ingredient:ingredients(id, name, unit, category)")
      .in("recipe_id", recipeIds);
    if (error) throw new Error(error.message);
    ris = (data ?? []) as unknown as RIRow[];
  }

  // Aggregate
  type Agg = {
    ingredient_id: string;
    name: string;
    unit: Unit;
    category: Category;
    amount: number;
  };
  const agg = new Map<string, Agg>();
  for (const plan of plans ?? []) {
    const rel = (plan as unknown as { recipe: { id: string; servings: number } | { id: string; servings: number }[] | null }).recipe;
    const recipe = Array.isArray(rel) ? rel[0] : rel;
    if (!recipe || !recipe.servings) continue;
    const factor = (plan.servings ?? recipe.servings) / recipe.servings;
    const recipeRis = ris.filter((r) => r.recipe_id === plan.recipe_id);
    for (const ri of recipeRis) {
      if (!ri.ingredient) continue;
      const cur = agg.get(ri.ingredient.id);
      const add = Number(ri.amount) * factor;
      if (cur) {
        cur.amount += add;
      } else {
        agg.set(ri.ingredient.id, {
          ingredient_id: ri.ingredient.id,
          name: ri.ingredient.name,
          unit: ri.ingredient.unit,
          category: ri.ingredient.category,
          amount: add,
        });
      }
    }
  }

  // Snapshot check state of aggregated items before delete
  const { data: oldAgg } = await sb
    .from("shopping_list_items")
    .select("ingredient_id, checked")
    .eq("week_start", weekStart)
    .eq("source", "aggregated");
  const wasChecked = new Map<string, boolean>();
  for (const r of oldAgg ?? []) {
    if (r.ingredient_id) wasChecked.set(r.ingredient_id, r.checked);
  }

  // Replace aggregated rows for this week
  await sb
    .from("shopping_list_items")
    .delete()
    .eq("week_start", weekStart)
    .eq("source", "aggregated");

  if (agg.size > 0) {
    const rows = Array.from(agg.values()).map((a) => ({
      week_start: weekStart,
      name: a.name,
      amount: round1(a.amount),
      unit: a.unit,
      category: a.category,
      source: "aggregated" as const,
      ingredient_id: a.ingredient_id,
      checked: wasChecked.get(a.ingredient_id) ?? false,
    }));
    const { error } = await sb.from("shopping_list_items").insert(rows);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/einkaufszettel");
}

export async function addManualItem(input: {
  weekStart: string;
  name: string;
  category: Category;
  amount: number | null;
  unit: Unit | null;
}) {
  if (!input.name.trim()) return;
  const sb = supabaseServer();
  const { error } = await sb.from("shopping_list_items").insert({
    week_start: input.weekStart,
    name: input.name.trim(),
    amount: input.amount,
    unit: input.unit,
    category: input.category,
    source: "manual",
    checked: false,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/einkaufszettel");
}

export async function toggleItem(id: string, checked: boolean) {
  const sb = supabaseServer();
  const { error } = await sb
    .from("shopping_list_items")
    .update({ checked })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/einkaufszettel");
}

export async function deleteItem(id: string) {
  const sb = supabaseServer();
  const { error } = await sb.from("shopping_list_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/einkaufszettel");
}

export async function resetList(weekStart: string) {
  const sb = supabaseServer();
  const { error } = await sb
    .from("shopping_list_items")
    .delete()
    .eq("week_start", weekStart);
  if (error) throw new Error(error.message);
  revalidatePath("/einkaufszettel");
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
