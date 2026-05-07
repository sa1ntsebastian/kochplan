"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import IngredientPicker from "./IngredientPicker";
import BulkImport, { type ParsedRecipeResult } from "./BulkImport";
import type { Ingredient } from "@/lib/types";
import { UNIT_LABELS } from "@/lib/categories";
import { createRecipe, updateRecipe, deleteRecipe } from "./actions";

type Row = {
  key: string;
  ingredient: Ingredient | null;
  amount: string;
  unitLabel: string; // "" = primäre Einheit
  pendingName?: string; // Vorausgefüllter Suchtext, wenn ingredient null ist (vom Parser)
};

const NEW_UNIT_TOKEN = "__NEW_UNIT__";

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
    rows: {
      ingredient: Ingredient;
      amount: number;
      display_amount: number | null;
      display_unit: string | null;
    }[];
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
      amount:
        r.display_amount != null ? String(r.display_amount) : String(r.amount),
      unitLabel: r.display_unit ?? "",
    })) ?? [
      { key: "new-0", ingredient: null, amount: "", unitLabel: "" },
    ]
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function addRow() {
    setRows((r) => [
      ...r,
      {
        key: `new-${Date.now()}-${Math.random()}`,
        ingredient: null,
        amount: "",
        unitLabel: "",
      },
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

  async function quickAddUnit(rowKey: string, ingredient: Ingredient) {
    const label = window.prompt("Neue Einheit (z.B. TL, EL, Stück):");
    if (!label) return;
    const factorStr = window.prompt(
      `Wie viele ${UNIT_LABELS[ingredient.unit]} sind 1 ${label}?`
    );
    if (!factorStr) return;
    const factor = Number(factorStr.replace(",", "."));
    if (!Number.isFinite(factor) || factor <= 0) {
      alert("Faktor ungültig.");
      return;
    }
    const res = await fetch(`/api/ingredients/${ingredient.id}/units`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: label.trim(), factor }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Fehler beim Anlegen");
      return;
    }
    const data = await res.json();
    const newUnit = data.unit;
    const updated: Ingredient = {
      ...ingredient,
      units: [...(ingredient.units ?? []), newUnit].sort(
        (a, b) => a.sort_order - b.sort_order
      ),
    };
    updateRow(rowKey, { ingredient: updated, unitLabel: newUnit.label });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const ingredients = rows
      .map((r) => {
        if (!r.ingredient || !r.amount.trim()) return null;
        const displayAmount = Number(r.amount.replace(",", "."));
        if (!Number.isFinite(displayAmount) || displayAmount <= 0) return null;
        const factor = factorFor(r.ingredient, r.unitLabel);
        const amount = displayAmount * factor;
        const isPrimary = !r.unitLabel;
        return {
          ingredient_id: r.ingredient.id,
          amount,
          display_amount: isPrimary ? null : displayAmount,
          display_unit: isPrimary ? null : r.unitLabel,
        };
      })
      .filter(
        (
          x
        ): x is {
          ingredient_id: string;
          amount: number;
          display_amount: number | null;
          display_unit: string | null;
        } => x !== null
      );

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
          router.push(`/rezepte/${recipeId}?saved=saved`);
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

  function applyParsed(parsed: ParsedRecipeResult) {
    setName(parsed.title);
    if (parsed.servings && parsed.servings > 0) setServings(parsed.servings);
    setInstructions(parsed.instructions);
    setTagsInput(parsed.tags.join(", "));
    setRows(
      parsed.ingredients.map((p, i) => {
        const amount = p.amount != null ? String(p.amount) : "";
        if (p.matched) {
          return {
            key: `parsed-${i}-${Date.now()}`,
            ingredient: p.matched,
            amount,
            unitLabel: p.suggested_unit_label ?? "",
          };
        }
        return {
          key: `parsed-${i}-${Date.now()}`,
          ingredient: null,
          amount,
          unitLabel: "",
          pendingName: p.name,
        };
      })
    );
  }

  const hasExistingData = Boolean(
    name || rows.some((r) => r.ingredient || r.amount) || instructions
  );

  return (
    <div className="space-y-4">
      {!recipeId && (
        <BulkImport
          hasExistingData={hasExistingData}
          onApply={applyParsed}
        />
      )}
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
            className="text-sm border rounded px-2 py-1 hover:bg-cream-50"
          >
            + Zutat
          </button>
        </div>
        <div className="space-y-2">
          {rows.map((row) => (
            <RowEditor
              key={row.key}
              row={row}
              onChange={(patch) => updateRow(row.key, patch)}
              onRemove={() => removeRow(row.key)}
              onAddUnit={(ing) => quickAddUnit(row.key, ing)}
            />
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
          className="bg-forest hover:bg-forest-dark text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
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
    </div>
  );
}

function RowEditor({
  row,
  onChange,
  onRemove,
  onAddUnit,
}: {
  row: Row;
  onChange: (patch: Partial<Row>) => void;
  onRemove: () => void;
  onAddUnit: (ing: Ingredient) => void;
}) {
  const ing = row.ingredient;
  const factor = useMemo(
    () => (ing ? factorFor(ing, row.unitLabel) : 1),
    [ing, row.unitLabel]
  );
  const displayAmount = Number((row.amount || "0").replace(",", "."));
  const primaryAmount =
    Number.isFinite(displayAmount) && row.unitLabel
      ? Math.round(displayAmount * factor * 10) / 10
      : null;

  return (
    <div className="space-y-1">
      <div className="flex gap-2 items-start">
        <div className="flex-1">
          <IngredientPicker
            value={ing}
            initialQuery={row.pendingName}
            onChange={(newIng) => {
              onChange({
                ingredient: newIng,
                unitLabel: "",
                pendingName: undefined,
              });
            }}
          />
          {row.pendingName && !ing && (
            <div className="text-xs text-amber-600 mt-0.5">
              ⚠ „{row.pendingName}" nicht gefunden — bitte aus Liste wählen
              oder neu anlegen.
            </div>
          )}
        </div>
        <div className="w-20">
          <input
            type="text"
            inputMode="decimal"
            value={row.amount}
            onChange={(e) => onChange({ amount: e.target.value })}
            placeholder="Menge"
            className="w-full border rounded px-2 py-2 text-sm"
          />
        </div>
        <div className="w-28">
          <select
            value={row.unitLabel}
            onChange={(e) => {
              const v = e.target.value;
              if (v === NEW_UNIT_TOKEN && ing) {
                onAddUnit(ing);
                return;
              }
              onChange({ unitLabel: v });
            }}
            disabled={!ing}
            className="w-full border rounded px-2 py-2 text-sm bg-white"
          >
            {ing ? (
              <>
                <option value="">{UNIT_LABELS[ing.unit]}</option>
                {(ing.units ?? []).map((u) => (
                  <option key={u.id} value={u.label}>
                    {u.label}
                  </option>
                ))}
                <option value={NEW_UNIT_TOKEN}>+ neue Einheit…</option>
              </>
            ) : (
              <option value="">—</option>
            )}
          </select>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-taupe hover:text-red-600 px-2 py-2 text-lg leading-none"
          aria-label="Entfernen"
        >
          ×
        </button>
      </div>
      {ing && row.unitLabel && primaryAmount != null && (
        <div className="text-xs text-taupe-dark pl-1">
          ≈ {formatNum(primaryAmount)} {UNIT_LABELS[ing.unit]}
        </div>
      )}
    </div>
  );
}

function factorFor(ing: Ingredient, unitLabel: string): number {
  if (!unitLabel) return 1;
  const u = (ing.units ?? []).find((x) => x.label === unitLabel);
  return u ? Number(u.factor) : 1;
}

function formatNum(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1).replace(".", ",");
}
