import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";
import RecipeForm from "../RecipeForm";
import type { Ingredient, Recipe, RecipeIngredient } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RezeptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = supabaseServer();

  const { data: recipe } = await sb
    .from("recipes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!recipe) notFound();

  const { data: ingredients } = await sb
    .from("recipe_ingredients")
    .select("*, ingredient:ingredients(*)")
    .eq("recipe_id", id);

  const r = recipe as Recipe;
  const ris = (ingredients ?? []) as (RecipeIngredient & {
    ingredient: Ingredient;
  })[];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{r.name}</h1>
      <RecipeForm
        recipeId={r.id}
        initial={{
          name: r.name,
          servings: r.servings,
          instructions: r.instructions ?? "",
          notes: r.notes ?? "",
          tags: r.tags ?? [],
          rows: ris.map((ri) => ({
            ingredient: ri.ingredient,
            amount: Number(ri.amount),
          })),
        }}
      />
    </div>
  );
}
