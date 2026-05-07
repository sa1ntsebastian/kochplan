"use client";

import { useEffect, useRef, useState } from "react";
import type { Category, Ingredient, Unit } from "@/lib/types";
import { CATEGORY_LABELS, UNIT_LABELS } from "@/lib/categories";

type AliasDraft = { label: string; factor: string };

type Props = {
  value: Ingredient | null;
  onChange: (i: Ingredient) => void;
  /** Wenn keine Zutat ausgewählt ist, kann hier ein vorausgefüllter Suchtext stehen. */
  initialQuery?: string;
};

export default function IngredientPicker({
  value,
  onChange,
  initialQuery,
}: Props) {
  const [q, setQ] = useState(value?.name ?? initialQuery ?? "");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) setQ(value.name);
  }, [value?.id, value?.name]);

  useEffect(() => {
    if (!value && initialQuery) setQ(initialQuery);
  }, [initialQuery, value]);

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
          {CATEGORY_LABELS[value.category]} · Speicher: {UNIT_LABELS[value.unit]}
        </div>
      )}

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-80 overflow-auto">
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
                    {r.units && r.units.length > 0 && (
                      <> · auch {r.units.map((u) => u.label).join(", ")}</>
                    )}
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

type OFFResult = {
  name: string;
  brand: string | null;
  quantity: string | null;
  kcal_per_100: number | null;
  protein_per_100: number | null;
  carbs_per_100: number | null;
  fat_per_100: number | null;
  image: string | null;
};

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
  const [gramsPerPiece, setGramsPerPiece] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [aliases, setAliases] = useState<AliasDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupNote, setLookupNote] = useState<string | null>(null);
  const [lookupResults, setLookupResults] = useState<OFFResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function lookupOFF() {
    setLookingUp(true);
    setLookupNote(null);
    setLookupResults(null);
    try {
      const res = await fetch(
        `/api/ingredients/off-lookup?q=${encodeURIComponent(name)}`
      );
      const data = await res.json();
      const results: OFFResult[] = data.results ?? [];
      if (results.length === 0) {
        setLookupNote("Keine Treffer mit Nährwertdaten gefunden.");
      } else {
        setLookupResults(results);
      }
    } catch {
      setLookupNote("Fehler beim Abruf.");
    } finally {
      setLookingUp(false);
    }
  }

  function applyResult(r: OFFResult) {
    if (r.kcal_per_100 != null) setKcal(String(r.kcal_per_100));
    if (r.protein_per_100 != null) setProtein(String(r.protein_per_100));
    if (r.carbs_per_100 != null) setCarbs(String(r.carbs_per_100));
    if (r.fat_per_100 != null) setFat(String(r.fat_per_100));
    setLookupResults(null);
    setLookupNote(`Werte übernommen aus „${r.name}".`);
  }

  async function save() {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const cleanAliases = aliases
        .map((a) => ({ label: a.label.trim(), factor: Number(a.factor) }))
        .filter((a) => a.label && Number.isFinite(a.factor) && a.factor > 0);
      const res = await fetch("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          unit,
          category,
          grams_per_piece: unit === "stk" ? gramsPerPiece : null,
          kcal_per_100: kcal,
          protein_per_100: protein,
          carbs_per_100: carbs,
          fat_per_100: fat,
          units: cleanAliases,
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

  function addAlias() {
    setAliases((a) => [...a, { label: "", factor: "" }]);
  }
  function updateAlias(i: number, patch: Partial<AliasDraft>) {
    setAliases((a) => a.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  }
  function removeAlias(i: number) {
    setAliases((a) => a.filter((_, j) => j !== i));
  }

  const primaryLabel = unit === "stk" ? "Stk" : unit;

  // Wichtig: KEIN <form>-Element verwenden! Diese Komponente wird innerhalb
  // des Rezept-Formulars gerendert. Verschachtelte Forms sind in HTML nicht
  // erlaubt — Browser flatten sie und Submit-Buttons triggern dann das
  // äußere Formular, was den Rezept-Speichern-Flow auslöst und alle Eingaben
  // verschluckt.
  return (
    <div
      className="p-3 space-y-2 text-sm"
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
          e.preventDefault();
        }
      }}
    >
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
          Speicher-Einheit
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

      {unit === "stk" && (
        <div className="border-t pt-2">
          <label className="text-xs block">
            Gewicht pro Stück (g){" "}
            <span className="text-neutral-400">(optional)</span>
            <input
              type="number"
              step="0.1"
              min={0}
              value={gramsPerPiece}
              onChange={(e) => setGramsPerPiece(e.target.value)}
              placeholder="z.B. 60 für ein Ei"
              className="mt-0.5 w-full border rounded px-2 py-1.5"
            />
          </label>
          <div className="text-xs text-neutral-400 mt-1">
            Brücke zwischen Stück und Gramm — nötig, damit Nährwerte
            (pro 100 g) ausgewertet werden können.
          </div>
        </div>
      )}

      {unit !== "stk" && (
        <div className="border-t pt-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-600">
              Alternative Einheiten (optional)
            </span>
            <button
              type="button"
              onClick={addAlias}
              className="text-xs px-2 py-0.5 border rounded hover:bg-neutral-50"
            >
              + Einheit
            </button>
          </div>
          {aliases.length === 0 ? (
            <div className="text-xs text-neutral-400">
              z.B. TL = 5, EL = 15, Stück = 80 …
            </div>
          ) : (
            <div className="space-y-1">
              {aliases.map((a, i) => (
                <div key={i} className="flex gap-1 items-center">
                  <input
                    value={a.label}
                    onChange={(e) =>
                      updateAlias(i, { label: e.target.value })
                    }
                    placeholder="Label (z.B. TL)"
                    className="flex-1 border rounded px-2 py-1 text-xs"
                  />
                  <span className="text-xs text-neutral-500">=</span>
                  <input
                    type="number"
                    step="0.1"
                    value={a.factor}
                    onChange={(e) =>
                      updateAlias(i, { factor: e.target.value })
                    }
                    placeholder="0"
                    className="w-20 border rounded px-2 py-1 text-xs"
                  />
                  <span className="text-xs text-neutral-500 w-6">
                    {primaryLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAlias(i)}
                    className="text-neutral-400 hover:text-red-600 text-base leading-none px-1"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="border-t pt-2 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-600">
            Nährwerte pro 100 {unit === "stk" ? "g" : unit}{" "}
            <span className="text-neutral-400">(optional)</span>
          </span>
          <button
            type="button"
            onClick={lookupOFF}
            disabled={lookingUp || !name.trim()}
            className="text-xs px-2 py-1 border rounded hover:bg-neutral-50 disabled:opacity-50"
          >
            {lookingUp ? "Suche…" : "Aus Open Food Facts laden"}
          </button>
        </div>

        {lookupResults && lookupResults.length > 0 && (
          <div className="border rounded bg-neutral-50 max-h-56 overflow-auto">
            <div className="px-2 py-1 text-xs text-neutral-500 border-b bg-white sticky top-0">
              Treffer auswählen — Werte werden in die Felder unten kopiert:
            </div>
            <ul className="divide-y">
              {lookupResults.map((r, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => applyResult(r)}
                    className="w-full text-left px-2 py-1.5 hover:bg-white text-xs"
                  >
                    <div className="font-medium">{r.name}</div>
                    <div className="text-neutral-500">
                      {r.brand && <span>{r.brand} · </span>}
                      {r.quantity && <span>{r.quantity} · </span>}
                      {r.kcal_per_100} kcal
                      {r.protein_per_100 != null &&
                        ` · ${r.protein_per_100} g E`}
                      {r.carbs_per_100 != null && ` · ${r.carbs_per_100} g K`}
                      {r.fat_per_100 != null && ` · ${r.fat_per_100} g F`}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {lookupNote && (
          <div className="text-xs text-neutral-500">{lookupNote}</div>
        )}

        <div className="grid grid-cols-2 gap-1.5">
          <NumInput
            label="Kalorien (kcal)"
            value={kcal}
            onChange={setKcal}
          />
          <NumInput label="Eiweiß (g)" value={protein} onChange={setProtein} />
          <NumInput
            label="Kohlenhydrate (g)"
            value={carbs}
            onChange={setCarbs}
          />
          <NumInput label="Fett (g)" value={fat} onChange={setFat} />
        </div>
      </div>

      {error && <div className="text-xs text-red-600">{error}</div>}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={save}
          disabled={saving || !name.trim()}
          className="bg-accent text-white rounded px-3 py-1.5 text-xs disabled:opacity-50"
        >
          {saving ? "Legt an…" : "Anlegen"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border rounded px-3 py-1.5 text-xs"
        >
          Abbrechen
        </button>
      </div>
    </div>
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
