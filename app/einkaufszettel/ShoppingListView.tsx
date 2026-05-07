"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Category, ShoppingListItem, Unit } from "@/lib/types";
import { CATEGORY_LABELS, UNIT_LABELS } from "@/lib/categories";
import {
  addManualItem,
  deleteItem,
  regenerateShoppingList,
  resetList,
  toggleItem,
} from "./actions";

type Group = {
  category: Category;
  label: string;
  items: ShoppingListItem[];
};

export default function ShoppingListView({
  weekStart,
  groups,
}: {
  weekStart: string;
  groups: Group[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const totalItems = groups.reduce((s, g) => s + g.items.length, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            startTransition(async () => {
              await regenerateShoppingList(weekStart);
              router.refresh();
            })
          }
          disabled={pending}
          className="bg-accent hover:bg-accent-dark text-white rounded px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          Aus Wochenplan generieren
        </button>
        <button
          type="button"
          onClick={() => {
            if (!confirm("Liste komplett zurücksetzen?")) return;
            startTransition(async () => {
              await resetList(weekStart);
              router.refresh();
            });
          }}
          disabled={pending || totalItems === 0}
          className="border rounded px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
        >
          Liste zurücksetzen
        </button>
      </div>

      <ManualItemForm weekStart={weekStart} onAdded={() => router.refresh()} />

      {totalItems === 0 ? (
        <p className="text-sm text-neutral-500 py-8 text-center">
          Liste ist leer. Klick „Aus Wochenplan generieren" oder füge manuell
          etwas hinzu.
        </p>
      ) : (
        <div className="space-y-3">
          {groups
            .filter((g) => g.items.length > 0)
            .map((g) => (
              <CategoryGroup
                key={g.category}
                group={g}
                pending={pending}
                onToggle={(id, c) =>
                  startTransition(async () => {
                    await toggleItem(id, c);
                    router.refresh();
                  })
                }
                onDelete={(id) =>
                  startTransition(async () => {
                    await deleteItem(id);
                    router.refresh();
                  })
                }
              />
            ))}
        </div>
      )}
    </div>
  );
}

function CategoryGroup({
  group,
  pending,
  onToggle,
  onDelete,
}: {
  group: Group;
  pending: boolean;
  onToggle: (id: string, checked: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section className="bg-white border rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-neutral-50 border-b text-xs font-medium uppercase tracking-wide text-neutral-500">
        {group.label}
      </div>
      <ul className="divide-y">
        {group.items.map((it) => (
          <li
            key={it.id}
            className={`flex items-center gap-3 px-3 py-2.5 ${
              it.checked ? "opacity-50" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={it.checked}
              onChange={(e) => onToggle(it.id, e.target.checked)}
              disabled={pending}
              className="w-5 h-5 accent-green-600"
            />
            <div className="flex-1 min-w-0">
              <div
                className={`text-sm ${it.checked ? "line-through" : ""}`}
              >
                {it.name}
              </div>
              {it.amount != null && (
                <div className="text-xs text-neutral-500">
                  {formatAmount(it.amount)} {it.unit ? UNIT_LABELS[it.unit] : ""}
                </div>
              )}
            </div>
            {it.source === "manual" && (
              <span className="text-[10px] uppercase tracking-wide text-neutral-400">
                manuell
              </span>
            )}
            <button
              type="button"
              onClick={() => onDelete(it.id)}
              disabled={pending}
              className="text-neutral-400 hover:text-red-600 px-2"
              aria-label="Entfernen"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ManualItemForm({
  weekStart,
  onAdded,
}: {
  weekStart: string;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<Unit | "">("");
  const [category, setCategory] = useState<Category>("sonstiges");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const a = amount.trim() === "" ? null : Number(amount);
    startTransition(async () => {
      await addManualItem({
        weekStart,
        name: name.trim(),
        amount: a !== null && Number.isFinite(a) ? a : null,
        unit: unit || null,
        category,
      });
      setName("");
      setAmount("");
      setUnit("");
      onAdded();
    });
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white border rounded-lg p-3 grid grid-cols-2 md:grid-cols-[1fr_5rem_5rem_10rem_auto] gap-2 items-end"
    >
      <label className="text-xs col-span-2 md:col-span-1">
        Manuelles Item
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z.B. Klopapier"
          className="mt-0.5 w-full border rounded px-2 py-1.5 text-sm"
        />
      </label>
      <label className="text-xs">
        Menge
        <input
          type="number"
          step="0.1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-0.5 w-full border rounded px-2 py-1.5 text-sm"
        />
      </label>
      <label className="text-xs">
        Einheit
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value as Unit | "")}
          className="mt-0.5 w-full border rounded px-2 py-1.5 text-sm"
        >
          <option value="">—</option>
          <option value="g">g</option>
          <option value="ml">ml</option>
          <option value="stk">Stück</option>
        </select>
      </label>
      <label className="text-xs">
        Kategorie
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
          className="mt-0.5 w-full border rounded px-2 py-1.5 text-sm"
        >
          {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending || !name.trim()}
        className="bg-accent hover:bg-accent-dark text-white rounded px-3 py-1.5 text-sm font-medium disabled:opacity-50"
      >
        +
      </button>
    </form>
  );
}

function formatAmount(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1).replace(".", ",");
}
