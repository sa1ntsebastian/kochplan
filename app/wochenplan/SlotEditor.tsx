"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MealPlanEntry, Recipe, Slot } from "@/lib/types";
import { setMealSlot } from "./actions";

export default function SlotEditor({
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
  const router = useRouter();
  const [recipeId, setRecipeId] = useState<string>(entry?.recipe_id ?? "");
  const [servings, setServings] = useState<number>(entry?.servings ?? 2);
  const [pending, startTransition] = useTransition();

  function commit(nextRecipeId: string, nextServings: number) {
    startTransition(async () => {
      await setMealSlot({
        date,
        slot,
        recipe_id: nextRecipeId || null,
        servings: nextServings,
      });
      router.refresh();
    });
  }

  function onRecipeChange(v: string) {
    setRecipeId(v);
    if (!v) {
      commit("", servings);
      return;
    }
    const r = recipes.find((x) => x.id === v);
    const s = r?.servings ?? servings;
    setServings(s);
    commit(v, s);
  }

  function onServingsBlur() {
    if (!recipeId) return;
    commit(recipeId, servings);
  }

  return (
    <div className="flex gap-2 items-center">
      <select
        value={recipeId}
        onChange={(e) => onRecipeChange(e.target.value)}
        disabled={pending}
        className="flex-1 border rounded px-2 py-1.5 text-sm bg-white"
      >
        <option value="">— kein Eintrag —</option>
        {recipes.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      <input
        type="number"
        min={1}
        value={servings}
        onChange={(e) => setServings(Number(e.target.value))}
        onBlur={onServingsBlur}
        disabled={pending || !recipeId}
        title="Portionen"
        className="w-16 border rounded px-2 py-1.5 text-sm"
      />
    </div>
  );
}
