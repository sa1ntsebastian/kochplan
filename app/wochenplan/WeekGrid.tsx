"use client";

import { useMemo, useState } from "react";
import type { MealPlanEntry, Slot } from "@/lib/types";
import SlotCell from "./SlotCell";
import type { RecipeMeta } from "./lib";

export default function WeekGrid({
  days,
  weekdayLabels,
  dayLabels,
  plans,
  recipes,
  recipeNameById,
}: {
  days: string[];
  weekdayLabels: string[];
  dayLabels: string[];
  plans: MealPlanEntry[];
  recipes: RecipeMeta[];
  recipeNameById: [string, string][];
}) {
  const [dragSource, setDragSource] = useState<{
    date: string;
    slot: Slot;
  } | null>(null);

  const entriesByKey = useMemo(() => {
    const m = new Map<string, MealPlanEntry>();
    for (const p of plans) m.set(`${p.date}__${p.slot}`, p);
    return m;
  }, [plans]);

  const recipesById = useMemo(() => {
    const m = new Map<string, RecipeMeta>();
    for (const r of recipes) m.set(r.id, r);
    return m;
  }, [recipes]);

  const nameById = useMemo(() => new Map(recipeNameById), [recipeNameById]);

  return (
    <div className="bg-white border rounded-lg overflow-visible">
      <div className="hidden md:grid grid-cols-[8rem_1fr_1fr] text-xs uppercase tracking-wide text-neutral-500 border-b bg-neutral-50">
        <div className="p-2">Tag</div>
        <div className="p-2">Mittag</div>
        <div className="p-2">Abend</div>
      </div>
      <ul className="divide-y">
        {days.map((dateStr, i) => {
          const lunch = entriesByKey.get(`${dateStr}__lunch`);
          const dinner = entriesByKey.get(`${dateStr}__dinner`);
          return (
            <li
              key={dateStr}
              className="md:grid md:grid-cols-[8rem_1fr_1fr] p-2 md:p-0 space-y-2 md:space-y-0"
            >
              <div className="md:p-3">
                <div className="font-medium">{weekdayLabels[i]}</div>
                <div className="text-xs text-neutral-500">{dayLabels[i]}</div>
              </div>
              <div className="md:p-3 md:border-l">
                <div className="md:hidden text-xs text-neutral-500 mb-1">
                  Mittag
                </div>
                <SlotCell
                  date={dateStr}
                  slot="lunch"
                  entry={lunch}
                  recipeName={
                    lunch ? nameById.get(lunch.recipe_id) : undefined
                  }
                  recipes={recipes}
                  recipesById={recipesById}
                  entriesByKey={entriesByKey}
                  dragSource={dragSource}
                  setDragSource={setDragSource}
                />
              </div>
              <div className="md:p-3 md:border-l">
                <div className="md:hidden text-xs text-neutral-500 mb-1">
                  Abend
                </div>
                <SlotCell
                  date={dateStr}
                  slot="dinner"
                  entry={dinner}
                  recipeName={
                    dinner ? nameById.get(dinner.recipe_id) : undefined
                  }
                  recipes={recipes}
                  recipesById={recipesById}
                  entriesByKey={entriesByKey}
                  dragSource={dragSource}
                  setDragSource={setDragSource}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
