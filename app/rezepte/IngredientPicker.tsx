"use client";

import { useEffect, useRef, useState } from "react";
import type { Category, Ingredient, Unit } from "@/lib/types";
import { CATEGORY_LABELS, UNIT_LABELS } from "@/lib/categories";

type Props = {
  value: Ingredient | null;
  onChange: (i: Ingredient) => void;
};

export default function IngredientPicker({ value, onChange }: Props) {
  const [q, setQ] = useState(value?.name ?? "");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQ(value?.name ?? "");
  }, [value?.id]);

  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    setLoading(true);
    fetch(`/api/ingredients?q=${encodeURIComponent(q)}`, {
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((d) => setResults(d.ingredients ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [q, open]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setShowNewForm(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const exactMatch = results.some(
    (r) => r.name.toLowerCase() === q.trim().toLowerCase()
  );

  return (
    <div className="relative" ref={wrapRef}>
      <input
        type="text"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setShowNewForm(false);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Zutat suchen…"
        className="w-full border rounded px-3 py-2 text-sm"
      />
      {value && (
        <div className="text-xs text-neutral-500 mt-0.5">
          Einheit: {UNIT_LABELS[value.unit]} · {CATEGORY_LABELS[value.category]}
        </div>
      )}

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-72 overflow-auto">
          {showNewForm ? (
            <NewIngredientForm
              initialName={q}
              onCreated={(ing) => {
                onChange(ing);
                setOpen(false);
                setShowNewForm(false);
              }}
              onCancel={() => setShowNewForm(false)}
            />
          ) : (
            <>
              {loading && (
                <div className="p-2 text-xs text-neutral-500">Suche…</div>
              )}
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    onChange(r);
                    setOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-neutral-50"
                >
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-neutral-500">
                    {UNIT_LABELS[r.unit]} · {CATEGORY_LABELS[r.category]}
                  </div>
                </button>
              ))}
              {!loading && q.trim() && !exactMatch && (
                <button
                  type="button"
                  onClick={() => setShowNewForm(true)}
                  className="block w-full text-left px-3 py-2 text-sm bg-neutral-50 hover:bg-neutral-100 border-t"
                >
                  + „{q}" als neue Zutat anlegen
                </button>
              )}
              {!loading && results.length === 0 && !q.trim() && (
                <div className="p-2 text-xs text-neutral-500">
                  Tippe um zu suchen…
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function NewIngredientForm({
  initialName,
  onCreated,
  onCancel,
}: {
  initialName: string;
  onCreated: (i: Ingredient) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [unit, setUnit] = useState<Unit>("g");
  const [category, setCategory] = useState<Category>("sonstiges");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [saving, setSaving] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupNote, setLookupNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function lookupOFF() {
    setLookingUp(true);
    setLookupNote(null);
    try {
      const res = await fetch(
        `/api/ingredients/off-lookup?q=${encodeURIComponent(name)}`
      );
      const data = await res.json();
      if (data.matches > 0) {
        if (data.kcal_per_100 != null) setKcal(String(data.kcal_per_100));
        if (data.protein_per_100 != null)
          setProtein(String(data.protein_per_100));
        if (data.carbs_per_100 != null) setCarbs(String(data.carbs_per_100));
        if (data.fat_per_100 != null) setFat(String(data.fat_per_100));
        setLookupNote(`Median aus ${data.matches} OFF-Treffern.`);
      } else {
        setLookupNote("Keine OFF-Treffer.");
      }
    } catch {
      setLookupNote("Fehler beim Abruf.");
    } finally {
      setLookingUp(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          unit,
          category,
          kcal_per_100: kcal,
          protein_per_100: protein,
          carbs_per_100: carbs,
          fat_per_100: fat,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      onCreated(data.ingredient);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="p-3 space-y-2 text-sm">
      <div className="font-medium">Neue Zutat anlegen</div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full border rounded px-2 py-1.5"
        placeholder="Name"
        required
      />
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs">
          Einheit
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as Unit)}
            className="mt-0.5 w-full border rounded px-2 py-1.5"
          >
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
            className="mt-0.5 w-full border rounded px-2 py-1.5"
          >
            {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-500">
          Nährwerte pro 100 {unit === "stk" ? "g" : unit} (optional)
        </span>
        <button
          type="button"
          onClick={lookupOFF}
          disabled={lookingUp || !name.trim()}
          className="text-xs px-2 py-1 border rounded hover:bg-neutral-50 disabled:opacity-50"
        >
          {lookingUp ? "Lädt…" : "OFF-Lookup"}
        </button>
      </div>
      {lookupNote && (
        <div className="text-xs text-neutral-500">{lookupNote}</div>
      )}
      <div className="grid grid-cols-4 gap-1.5">
        <NumInput label="kcal" value={kcal} onChange={setKcal} />
        <NumInput label="P (g)" value={protein} onChange={setProtein} />
        <NumInput label="K (g)" value={carbs} onChange={setCarbs} />
        <NumInput label="F (g)" value={fat} onChange={setFat} />
      </div>

      {error && <div className="text-xs text-red-600">{error}</div>}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="bg-accent text-white rounded px-3 py-1.5 text-xs disabled:opacity-50"
        >
          Anlegen
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border rounded px-3 py-1.5 text-xs"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}

function NumInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="text-xs">
      {label}
      <input
        type="number"
        step="0.1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full border rounded px-2 py-1"
      />
    </label>
  );
}
