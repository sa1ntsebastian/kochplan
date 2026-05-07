"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import IngredientPicker from "./IngredientPicker";
import type { Ingredient } from "@/lib/types";
import { UNIT_LABELS } from "@/lib/categories";
import { createRecipe, updateRecipe, deleteRecipe } from "./actions";

type Row = {
  key: string;
  ingredient: Ingredient | null;
  amount: string;
};

export default function RecipeForm({
  recipeId,
  initial,
}: {
  recipeId?: string;
  initial?: {
    name: string;
    servings: number;
    instructions: string;
    notes: string;
    tags: string[];
    rows: { ingredient: Ingredient; amount: number }[];
  };
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [servings, setServings] = useState(initial?.servings ?? 2);
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [tagsInput, setTagsInput] = useState(
    (initial?.tags ?? []).join(", ")
  );
  const [rows, setRows] = useState<Row[]>(
    initial?.rows.map((r, i) => ({
      key: `init-${i}`,
      ingredient: r.ingredient,
      amount: String(r.amount),
    })) ?? [
      { key: "new-0", ingredient: null, amount: "" },
    ]
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function addRow() {
    setRows((r) => [
      ...r,
      { key: `new-${Date.now()}`, ingredient: null, amount: "" },
    ]);
  }
  function removeRow(key: string) {
    setRows((r) => r.filter((row) => row.key !== key));
  }
  function updateRow(key: string, patch: Partial<Row>) {
    setRows((r) =>
      r.map((row) => (row.key === key ? { ...row, ...patch } : row))
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const ingredients = rows
      .filter((r) => r.ingredient && r.amount.trim())
      .map((r) => ({
        ingredient_id: r.ingredient!.id,
        amount: Number(r.amount),
      }))
      .filter((r) => Number.isFinite(r.amount) && r.amount > 0);

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (!name.trim()) {
      setError("Name fehlt.");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          name: name.trim(),
          servings: Number(servings) || 1,
          instructions,
          notes,
          tags,
          ingredients,
        };
        if (recipeId) {
          await updateRecipe(recipeId, payload);
          router.push(`/rezepte/${recipeId}`);
          router.refresh();
        } else {
          await createRecipe(payload);
        }
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  function onDelete() {
    if (!recipeId) return;
    if (!confirm("Wirklich löschen?")) return;
    startTransition(async () => {
      try {
        await deleteRecipe(recipeId);
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="text-sm">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Portionen
          <input
            type="number"
            min={1}
            value={servings}
            onChange={(e) => setServings(Number(e.target.value))}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Tags (Komma-getrennt)
          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="schnell, vegetarisch"
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </label>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-medium">Zutaten</h2>
          <button
            type="button"
            onClick={addRow}
            className="text-sm border rounded px-2 py-1 hover:bg-neutral-50"
          >
            + Zutat
          </button>
        </div>
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.key} className="flex gap-2 items-start">
              <div className="flex-1">
                <IngredientPicker
                  value={row.ingredient}
                  onChange={(ing) => updateRow(row.key, { ingredient: ing })}
                />
              </div>
              <div className="w-28">
                <div className="flex">
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    value={row.amount}
                    onChange={(e) =>
                      updateRow(row.key, { amount: e.target.value })
                    }
                    placeholder="Menge"
                    className="w-full border rounded-l px-2 py-2 text-sm"
                  />
                  <span className="inline-flex items-center px-2 border border-l-0 rounded-r bg-neutral-50 text-xs text-neutral-600">
                    {row.ingredient ? UNIT_LABELS[row.ingredient.unit] : "—"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeRow(row.key)}
                className="text-neutral-400 hover:text-red-600 px-2 py-2 text-lg leading-none"
                aria-label="Entfernen"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm">
          Zubereitung (Markdown)
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={8}
            className="mt-1 w-full border rounded px-3 py-2 font-mono text-sm"
          />
        </label>
      </div>
      <div>
        <label className="text-sm">
          Notizen
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1 w-full border rounded px-3 py-2 text-sm"
          />
        </label>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-accent hover:bg-accent-dark text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {pending ? "Speichert…" : "Speichern"}
        </button>
        {recipeId && (
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="text-red-600 hover:underline text-sm ml-auto"
          >
            Löschen
          </button>
        )}
      </div>
    </form>
  );
}
