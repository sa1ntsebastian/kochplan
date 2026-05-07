"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase";
import type { Slot } from "@/lib/types";

export async function setMealSlot(input: {
  date: string;
  slot: Slot;
  recipe_id: string | null;
  servings: number;
}) {
  const sb = supabaseServer();
  if (!input.recipe_id) {
    const { error } = await sb
      .from("meal_plans")
      .delete()
      .eq("date", input.date)
      .eq("slot", input.slot);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await sb.from("meal_plans").upsert(
      {
        date: input.date,
        slot: input.slot,
        recipe_id: input.recipe_id,
        servings: input.servings,
      },
      { onConflict: "date,slot" }
    );
    if (error) throw new Error(error.message);
  }
  revalidatePath("/wochenplan");
  revalidatePath("/");
  revalidatePath("/einkaufszettel");
}
