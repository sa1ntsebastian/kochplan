"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase";
import type { Slot } from "@/lib/types";

export type SlotOp =
  | {
      type: "set";
      date: string;
      slot: Slot;
      recipe_id: string;
      servings: number;
    }
  | { type: "clear"; date: string; slot: Slot };

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

export async function applySlotOps(ops: SlotOp[]) {
  const sb = supabaseServer();
  // Erst alle Clears, dann alle Sets — vermeidet UNIQUE-Konflikte beim Tauschen.
  const clears = ops.filter((o) => o.type === "clear");
  const sets = ops.filter((o) => o.type === "set");

  for (const c of clears) {
    const { error } = await sb
      .from("meal_plans")
      .delete()
      .eq("date", c.date)
      .eq("slot", c.slot);
    if (error) throw new Error(error.message);
  }
  for (const s of sets) {
    const op = s as Extract<SlotOp, { type: "set" }>;
    const { error } = await sb.from("meal_plans").upsert(
      {
        date: op.date,
        slot: op.slot,
        recipe_id: op.recipe_id,
        servings: op.servings,
      },
      { onConflict: "date,slot" }
    );
    if (error) throw new Error(error.message);
  }

  revalidatePath("/wochenplan");
  revalidatePath("/");
  revalidatePath("/einkaufszettel");
}
