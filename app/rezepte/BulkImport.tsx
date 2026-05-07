"use client";

import { useState } from "react";
import type { Ingredient, IngredientUnit } from "@/lib/types";

export type ParsedIngredientResult = {
  amount: number | null;
  unit: string | null;
  name: string;
  matched: (Ingredient & { units: IngredientUnit[] }) | null;
  suggested_unit_label: string | null;
};

export type ParsedRecipeResult = {
  title: string;
  servings: number | null;
  instructions: string;
  tags: string[];
  ingredients: ParsedIngredientResult[];
};

export default function BulkImport({
  hasExistingData,
  onApply,
}: {
  hasExistingData: boolean;
  onApply: (parsed: ParsedRecipeResult) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    if (!text.trim()) return;
    if (
      hasExistingData &&
      !confirm(
        "Aktuelle Eingaben werden durch das Ergebnis ersetzt. Fortfahren?"
      )
    ) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recipes/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      onApply(data as ParsedRecipeResult);
      setOpen(false);
      setText("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full border-2 border-dashed border-neutral-300 hover:border-accent rounded-lg px-3 py-3 text-sm text-neutral-600 hover:text-accent"
      >
        ✨ Rezept aus Text einlesen (mit KI)
      </button>
    );
  }

  return (
    <div className="border border-neutral-300 rounded-lg p-3 bg-white space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Rezept aus Text einlesen</div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-neutral-400 hover:text-neutral-700 text-lg leading-none px-1"
          aria-label="Schließen"
        >
          ×
        </button>
      </div>
      <p className="text-xs text-neutral-500">
        Kopier den vollständigen Rezept-Text rein (Titel, Portionen, Zutaten,
        Zubereitung). Claude analysiert ihn und füllt das Formular aus —
        Zutaten werden mit deinem Bestand gematcht.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        placeholder={`Beispiel:

Spaghetti Bolognese
4 Portionen

500 g Hackfleisch
2 Zwiebeln
3 Knoblauchzehen
1 Dose gehackte Tomaten
2 EL Tomatenmark
500 g Spaghetti
Salz, Pfeffer

Zubereitung:
1. Zwiebeln und Knoblauch klein hacken …`}
        className="w-full border rounded px-3 py-2 text-sm font-mono"
      />
      {error && <div className="text-xs text-red-600">{error}</div>}
      <div className="flex gap-2 items-center">
        <button
          type="button"
          onClick={analyze}
          disabled={loading || !text.trim()}
          className="bg-accent hover:bg-accent-dark text-white rounded px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Analysiert…" : "Analysieren"}
        </button>
        <span className="text-xs text-neutral-400">
          dauert ca. 3-5 Sekunden
        </span>
      </div>
    </div>
  );
}
