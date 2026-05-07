"use client";

import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { MealPlanEntry, Slot } from "@/lib/types";
import { applySlotOps, setMealSlot } from "./actions";
import { rankRecipes, type RecipeMeta } from "./lib";

type SlotKey = `${string}__${Slot}`;
function k(date: string, slot: Slot): SlotKey {
  return `${date}__${slot}`;
}

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
  // Optimistic state
  const [entries, setEntries] = useState<Map<SlotKey, MealPlanEntry>>(() => {
    const m = new Map<SlotKey, MealPlanEntry>();
    for (const p of plans) m.set(k(p.date, p.slot), p);
    return m;
  });
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Sync if plans prop changes (z.B. nach manuellem Refresh)
  useEffect(() => {
    const m = new Map<SlotKey, MealPlanEntry>();
    for (const p of plans) m.set(k(p.date, p.slot), p);
    setEntries(m);
  }, [plans]);

  const recipesById = useMemo(() => {
    const m = new Map<string, RecipeMeta>();
    for (const r of recipes) m.set(r.id, r);
    return m;
  }, [recipes]);

  const nameById = useMemo(() => new Map(recipeNameById), [recipeNameById]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    })
  );

  const [activeKey, setActiveKey] = useState<SlotKey | null>(null);

  function fireServer(promise: Promise<unknown>, snapshot: typeof entries) {
    setError(null);
    startTransition(async () => {
      try {
        await promise;
      } catch (err) {
        setError((err as Error).message);
        setEntries(snapshot);
      }
    });
  }

  function assign(date: string, slot: Slot, recipeId: string) {
    const r = recipesById.get(recipeId);
    const servings = r?.servings ?? 2;
    const snapshot = new Map(entries);
    const next = new Map(entries);
    next.set(k(date, slot), {
      id: `optimistic-${Date.now()}`,
      date,
      slot,
      recipe_id: recipeId,
      servings,
    });
    setEntries(next);
    fireServer(
      setMealSlot({ date, slot, recipe_id: recipeId, servings }),
      snapshot
    );
  }

  function clear(date: string, slot: Slot) {
    const snapshot = new Map(entries);
    const next = new Map(entries);
    next.delete(k(date, slot));
    setEntries(next);
    fireServer(
      setMealSlot({ date, slot, recipe_id: null, servings: 0 }),
      snapshot
    );
  }

  function changeServings(date: string, slot: Slot, servings: number) {
    const cur = entries.get(k(date, slot));
    if (!cur) return;
    const snapshot = new Map(entries);
    const next = new Map(entries);
    next.set(k(date, slot), { ...cur, servings });
    setEntries(next);
    fireServer(
      setMealSlot({
        date,
        slot,
        recipe_id: cur.recipe_id,
        servings,
      }),
      snapshot
    );
  }

  function onDragStart(e: DragStartEvent) {
    setActiveKey(e.active.id as SlotKey);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveKey(null);
    if (!e.over || e.active.id === e.over.id) return;
    const src = String(e.active.id) as SlotKey;
    const dst = String(e.over.id) as SlotKey;
    const [srcDate, srcSlot] = src.split("__") as [string, Slot];
    const [dstDate, dstSlot] = dst.split("__") as [string, Slot];

    const srcEntry = entries.get(src);
    const dstEntry = entries.get(dst);
    if (!srcEntry) return;

    const snapshot = new Map(entries);
    const next = new Map(entries);
    const ops: Parameters<typeof applySlotOps>[0] = [];

    if (dstEntry) {
      // Swap
      next.set(src, { ...dstEntry, date: srcDate, slot: srcSlot });
      next.set(dst, { ...srcEntry, date: dstDate, slot: dstSlot });
      ops.push({
        type: "set",
        date: dstDate,
        slot: dstSlot,
        recipe_id: srcEntry.recipe_id,
        servings: srcEntry.servings,
      });
      ops.push({
        type: "set",
        date: srcDate,
        slot: srcSlot,
        recipe_id: dstEntry.recipe_id,
        servings: dstEntry.servings,
      });
    } else {
      // Move
      next.delete(src);
      next.set(dst, { ...srcEntry, date: dstDate, slot: dstSlot });
      ops.push({
        type: "set",
        date: dstDate,
        slot: dstSlot,
        recipe_id: srcEntry.recipe_id,
        servings: srcEntry.servings,
      });
      ops.push({ type: "clear", date: srcDate, slot: srcSlot });
    }

    setEntries(next);
    fireServer(applySlotOps(ops), snapshot);
  }

  const activeEntry = activeKey ? entries.get(activeKey) : null;
  const activeName = activeEntry
    ? nameById.get(activeEntry.recipe_id) ?? "—"
    : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveKey(null)}
    >
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded px-3 py-2 text-sm mb-3">
          {error}
        </div>
      )}
      <div className="bg-white border border-taupe-light rounded-lg overflow-visible shadow-sm">
        <div className="hidden md:grid grid-cols-[7rem_1fr_1fr] text-xs uppercase tracking-wider text-taupe-dark border-b border-taupe-light">
          <div className="px-4 py-2.5">Tag</div>
          <div className="px-4 py-2.5">Mittag</div>
          <div className="px-4 py-2.5">Abend</div>
        </div>
        <ul className="divide-y divide-taupe-light/60">
          {days.map((dateStr, i) => (
            <li
              key={dateStr}
              className="md:grid md:grid-cols-[7rem_1fr_1fr] px-3 py-3 md:px-0 md:py-0 space-y-2 md:space-y-0"
            >
              <div className="md:px-4 md:py-3 flex md:flex-col md:items-start items-baseline gap-2">
                <div className="font-serif text-base text-ink">
                  {weekdayLabels[i]}
                </div>
                <div className="text-xs text-taupe-dark">{dayLabels[i]}</div>
              </div>
              <div className="md:px-3 md:py-3 md:border-l md:border-taupe-light">
                <SlotLabel mobile>Mittag</SlotLabel>
                <SlotCell
                  date={dateStr}
                  slot="lunch"
                  entry={entries.get(k(dateStr, "lunch"))}
                  recipeName={
                    entries.get(k(dateStr, "lunch"))
                      ? nameById.get(entries.get(k(dateStr, "lunch"))!.recipe_id)
                      : undefined
                  }
                  recipes={recipes}
                  isDraggingFrom={activeKey === k(dateStr, "lunch")}
                  onAssign={(rid) => assign(dateStr, "lunch", rid)}
                  onClear={() => clear(dateStr, "lunch")}
                  onChangeServings={(v) => changeServings(dateStr, "lunch", v)}
                />
              </div>
              <div className="md:px-3 md:py-3 md:border-l md:border-taupe-light">
                <SlotLabel mobile>Abend</SlotLabel>
                <SlotCell
                  date={dateStr}
                  slot="dinner"
                  entry={entries.get(k(dateStr, "dinner"))}
                  recipeName={
                    entries.get(k(dateStr, "dinner"))
                      ? nameById.get(
                          entries.get(k(dateStr, "dinner"))!.recipe_id
                        )
                      : undefined
                  }
                  recipes={recipes}
                  isDraggingFrom={activeKey === k(dateStr, "dinner")}
                  onAssign={(rid) => assign(dateStr, "dinner", rid)}
                  onClear={() => clear(dateStr, "dinner")}
                  onChangeServings={(v) =>
                    changeServings(dateStr, "dinner", v)
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeKey && activeName ? (
          <div className="bg-white border border-forest rounded px-3 py-1.5 text-sm shadow-xl pointer-events-none">
            {activeName}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function SlotLabel({
  children,
  mobile,
}: {
  children: React.ReactNode;
  mobile?: boolean;
}) {
  return (
    <div
      className={`${mobile ? "md:hidden " : ""}text-[10px] uppercase tracking-wider text-taupe-dark mb-1`}
    >
      {children}
    </div>
  );
}

function SlotCell({
  date,
  slot,
  entry,
  recipeName,
  recipes,
  isDraggingFrom,
  onAssign,
  onClear,
  onChangeServings,
}: {
  date: string;
  slot: Slot;
  entry: MealPlanEntry | undefined;
  recipeName: string | undefined;
  recipes: RecipeMeta[];
  isDraggingFrom: boolean;
  onAssign: (recipeId: string) => void;
  onClear: () => void;
  onChangeServings: (n: number) => void;
}) {
  const id = k(date, slot);
  const filled = Boolean(entry && recipeName);
  const [pickerOpen, setPickerOpen] = useState(false);

  const { setNodeRef: setDropRef, isOver } = useDroppable({ id });
  const draggable = useDraggable({ id });

  return (
    <div
      ref={setDropRef}
      className={`relative rounded transition-all ${
        isOver ? "ring-2 ring-peach ring-offset-1 ring-offset-cream-100" : ""
      }`}
    >
      {filled ? (
        <div
          ref={draggable.setNodeRef}
          {...draggable.listeners}
          {...draggable.attributes}
          className={`flex items-center gap-2 bg-cream-50 border border-taupe-light rounded px-2.5 py-2 select-none touch-none ${
            isDraggingFrom
              ? "opacity-30"
              : "hover:border-forest hover:bg-white cursor-grab active:cursor-grabbing"
          }`}
        >
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setPickerOpen(true)}
            className="flex-1 text-left text-sm truncate text-ink"
            title="Klick zum Ändern"
          >
            {recipeName}
          </button>
          <input
            type="number"
            min={1}
            value={entry?.servings ?? 2}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => onChangeServings(Number(e.target.value))}
            className="w-12 border border-taupe-light rounded px-1 py-0.5 text-xs"
            title="Portionen"
            aria-label="Portionen"
          />
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onClear}
            className="text-taupe-dark hover:text-red-700 px-1 text-base leading-none"
            title="Entfernen"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="w-full bg-cream-50 border border-dashed border-taupe-light rounded px-2.5 py-2 text-sm text-taupe-dark hover:border-forest hover:text-forest text-left transition-colors"
        >
          + Rezept zuweisen
        </button>
      )}

      {pickerOpen && (
        <PickerPopover
          recipes={recipes}
          onPick={(id) => {
            onAssign(id);
            setPickerOpen(false);
          }}
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
      className="absolute z-30 mt-1 left-0 right-0 md:right-auto md:w-80 bg-white border border-taupe-light rounded-lg shadow-xl overflow-hidden"
    >
      <div className="p-2 border-b border-taupe-light">
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rezept, Tag oder Zutat suchen…"
          className="w-full border rounded px-2.5 py-1.5 text-sm"
        />
      </div>
      <div className="max-h-80 overflow-auto">
        {ranked.length === 0 ? (
          <div className="p-3 text-xs text-taupe-dark">
            {q ? "Keine Treffer." : "Tippe um zu suchen oder wähle direkt."}
          </div>
        ) : null}
        <ul className="divide-y divide-cream-200">
          {ranked.slice(0, 30).map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onPick(r.id)}
                className="w-full text-left px-3 py-2 hover:bg-cream-100 text-sm transition-colors"
              >
                <div className="font-medium text-ink">{r.name}</div>
                <div className="text-xs text-taupe-dark flex items-center gap-2 mt-0.5">
                  <span>{r.servings} P.</span>
                  {r.matchReason && (
                    <span className="text-peach-dark">{r.matchReason}</span>
                  )}
                  {r.tags.length > 0 && (
                    <span className="truncate">{r.tags.join(" · ")}</span>
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
