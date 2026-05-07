import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";
import RecipeForm from "../RecipeForm";
import type {
  Ingredient,
  IngredientUnit,
  Recipe,
  RecipeIngredient,
} from "@/lib/types";

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
    .select(
      "*, ingredient:ingredients(*, units:ingredient_units(id, ingredient_id, label, factor, sort_order))"
    )
    .eq("recipe_id", id);

  const r = recipe as Recipe;
  const ris = (ingredients ?? []) as (RecipeIngredient & {
    ingredient: Ingredient & { units: IngredientUnit[] };
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
            ingredient: {
              ...ri.ingredient,
              units: (ri.ingredient.units ?? [])
                .slice()
                .sort((a, b) => a.sort_order - b.sort_order),
            },
            amount: Number(ri.amount),
            display_amount:
              ri.display_amount != null ? Number(ri.display_amount) : null,
            display_unit: ri.display_unit,
          })),
        }}
      />
    </div>
  );
}
