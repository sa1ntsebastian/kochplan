"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";

export type RecipeIngredientInput = {
  ingredient_id: string;
  amount: number; // in primary unit (z.B. g)
  display_amount: number | null;
  display_unit: string | null;
};

export async function createRecipe(input: {
  name: string;
  servings: number;
  instructions: string;
  notes: string;
  tags: string[];
  ingredients: RecipeIngredientInput[];
}) {
  const sb = supabaseServer();
  const { data: recipe, error } = await sb
    .from("recipes")
    .insert({
      name: input.name,
      servings: input.servings,
      instructions: input.instructions || null,
      notes: input.notes || null,
      tags: input.tags,
    })
    .select("id")
    .single();
  if (error || !recipe) throw new Error(error?.message ?? "insert failed");

  if (input.ingredients.length > 0) {
    const rows = input.ingredients.map((ri) => ({
      recipe_id: recipe.id,
      ingredient_id: ri.ingredient_id,
      amount: ri.amount,
      display_amount: ri.display_amount,
      display_unit: ri.display_unit,
    }));
    const { error: e2 } = await sb.from("recipe_ingredients").insert(rows);
    if (e2) throw new Error(e2.message);
  }

  revalidatePath("/rezepte");
  redirect(`/rezepte/${recipe.id}`);
}

export async function updateRecipe(
  id: string,
  input: {
    name: string;
    servings: number;
    instructions: string;
    notes: string;
    tags: string[];
    ingredients: RecipeIngredientInput[];
  }
) {
  const sb = supabaseServer();
  const { error } = await sb
    .from("recipes")
    .update({
      name: input.name,
      servings: input.servings,
      instructions: input.instructions || null,
      notes: input.notes || null,
      tags: input.tags,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await sb.from("recipe_ingredients").delete().eq("recipe_id", id);
  if (input.ingredients.length > 0) {
    const rows = input.ingredients.map((ri) => ({
      recipe_id: id,
      ingredient_id: ri.ingredient_id,
      amount: ri.amount,
      display_amount: ri.display_amount,
      display_unit: ri.display_unit,
    }));
    const { error: e2 } = await sb.from("recipe_ingredients").insert(rows);
    if (e2) throw new Error(e2.message);
  }

  revalidatePath("/rezepte");
  revalidatePath(`/rezepte/${id}`);
}

export async function deleteRecipe(id: string) {
  const sb = supabaseServer();
  const { error } = await sb.from("recipes").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/rezepte");
  redirect("/rezepte");
}
