"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MealPlanEntry, Slot } from "@/lib/types";
import { applySlotOps, setMealSlot } from "./actions";
import { rankRecipes, type RecipeMeta } from "./lib";

type Props = {
  date: string;
  slot: Slot;
  entry: MealPlanEntry | undefined;
  recipeName: string | undefined;
  recipes: RecipeMeta[];
  // Globale DnD-Quelle (in Page hochgehoben für Cross-Cell-State)
  dragSource: { date: string; slot: Slot } | null;
  setDragSource: (s: { date: string; slot: Slot } | null) => void;
  recipesById: Map<string, RecipeMeta>;
  // Lookup für Drop-Auswertung (Ziel kennt seinen aktuellen Inhalt)
  entriesByKey: Map<string, MealPlanEntry>;
};

export default function SlotCell({
  date,
  slot,
  entry,
  recipeName,
  recipes,
  dragSource,
  setDragSource,
  recipesById,
  entriesByKey,
}: Props) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState(false);

  function applyAssign(recipeId: string) {
    const r = recipesById.get(recipeId);
    const servings = r?.servings ?? 2;
    startTransition(async () => {
      await setMealSlot({ date, slot, recipe_id: recipeId, servings });
      router.refresh();
    });
    setPickerOpen(false);
  }

  function applyClear() {
    startTransition(async () => {
      await setMealSlot({ date, slot, recipe_id: null, servings: 0 });
      router.refresh();
    });
    setPickerOpen(false);
  }

  function applyServings(newServings: number) {
    if (!entry) return;
    startTransition(async () => {
      await setMealSlot({
        date,
        slot,
        recipe_id: entry.recipe_id,
        servings: newServings,
      });
      router.refresh();
    });
  }

  function onDragStart(e: React.DragEvent) {
    if (!entry) return;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `${date}__${slot}`);
    setDragSource({ date, slot });
  }
  function onDragEnd() {
    setDragSource(null);
  }
  function onDragOver(e: React.DragEvent) {
    if (!dragSource) return;
    if (dragSource.date === date && dragSource.slot === slot) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!dragOver) setDragOver(true);
  }
  function onDragLeave() {
    setDragOver(false);
  }
  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;
    const [srcDate, srcSlot] = raw.split("__") as [string, Slot];
    if (srcDate === date && srcSlot === slot) return;

    const srcEntry = entriesByKey.get(`${srcDate}__${srcSlot}`);
    if (!srcEntry) return;

    const ops: Parameters<typeof applySlotOps>[0] = [];
    if (entry) {
      // Swap
      ops.push({
        type: "set",
        date,
        slot,
        recipe_id: srcEntry.recipe_id,
        servings: srcEntry.servings,
      });
      ops.push({
        type: "set",
        date: srcDate,
        slot: srcSlot,
        recipe_id: entry.recipe_id,
        servings: entry.servings,
      });
    } else {
      // Move
      ops.push({
        type: "set",
        date,
        slot,
        recipe_id: srcEntry.recipe_id,
        servings: srcEntry.servings,
      });
      ops.push({ type: "clear", date: srcDate, slot: srcSlot });
    }
    setDragSource(null);
    startTransition(async () => {
      await applySlotOps(ops);
      router.refresh();
    });
  }

  const filled = Boolean(entry && recipeName);
  const isDragSource =
    dragSource && dragSource.date === date && dragSource.slot === slot;

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`relative rounded transition-colors ${
        dragOver ? "ring-2 ring-accent ring-offset-1" : ""
      }`}
    >
      {filled ? (
        <div
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          className={`flex items-center gap-2 bg-white border rounded px-2 py-1.5 cursor-grab active:cursor-grabbing ${
            isDragSource ? "opacity-40" : "hover:border-accent"
          }`}
        >
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex-1 text-left text-sm truncate"
            title="Klick zum Ändern"
          >
            {recipeName}
          </button>
          <input
            type="number"
            min={1}
            value={entry?.servings ?? 2}
            onChange={(e) => applyServings(Number(e.target.value))}
            disabled={pending}
            className="w-12 border rounded px-1 py-0.5 text-xs"
            title="Portionen"
            aria-label="Portionen"
          />
          <button
            type="button"
            onClick={applyClear}
            disabled={pending}
            className="text-neutral-400 hover:text-red-600 px-1 text-base leading-none"
            title="Entfernen"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          disabled={pending}
          className="w-full bg-white border border-dashed rounded px-2 py-1.5 text-sm text-neutral-400 hover:border-accent hover:text-accent text-left"
        >
          + Rezept zuweisen
        </button>
      )}

      {pickerOpen && (
        <PickerPopover
          recipes={recipes}
          onPick={applyAssign}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

function PickerPopover({
  recipes,
  onPick,
  onClose,
}: {
  recipes: RecipeMeta[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const ranked = useMemo(() => rankRecipes(recipes, q), [recipes, q]);

  return (
    <div
      ref={ref}
      className="absolute z-30 mt-1 left-0 right-0 md:right-auto md:w-72 bg-white border rounded-lg shadow-lg overflow-hidden"
    >
      <div className="p-2 border-b">
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rezept, Tag oder Zutat suchen…"
          className="w-full border rounded px-2 py-1.5 text-sm"
        />
      </div>
      <div className="max-h-80 overflow-auto">
        {ranked.length === 0 ? (
          <div className="p-3 text-xs text-neutral-400">
            {q ? "Keine Treffer." : "Tippe um zu suchen oder wähle direkt:"}
          </div>
        ) : null}
        <ul className="divide-y">
          {ranked.slice(0, 30).map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onPick(r.id)}
                className="w-full text-left px-3 py-2 hover:bg-neutral-50 text-sm"
              >
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-neutral-500 flex items-center gap-2">
                  <span>{r.servings} P.</span>
                  {r.matchReason && (
                    <span className="text-amber-600">
                      {r.matchReason}
                    </span>
                  )}
                  {r.tags.length > 0 && (
                    <span className="truncate">{r.tags.join(", ")}</span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
