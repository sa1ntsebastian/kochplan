"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Recipe } from "@/lib/types";

export default function RecipeFilter({
  recipes,
  allTags,
}: {
  recipes: Recipe[];
  allTags: string[];
}) {
  const [q, setQ] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return recipes.filter((r) => {
      if (
        q &&
        !r.name.toLowerCase().includes(q.toLowerCase())
      )
        return false;
      if (activeTag && !(r.tags ?? []).includes(activeTag)) return false;
      return true;
    });
  }, [recipes, q, activeTag]);

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Suchen…"
        className="w-full border rounded px-3 py-2"
      />
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTag(null)}
            className={`text-xs rounded-full px-2.5 py-1 border ${
              activeTag === null
                ? "bg-accent text-white border-accent"
                : "bg-white"
            }`}
          >
            Alle
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTag(t === activeTag ? null : t)}
              className={`text-xs rounded-full px-2.5 py-1 border ${
                activeTag === t
                  ? "bg-accent text-white border-accent"
                  : "bg-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}
      {filtered.length === 0 ? (
        <p className="text-neutral-500 text-sm py-8 text-center">
          Keine Rezepte gefunden.
        </p>
      ) : (
        <ul className="divide-y bg-white border rounded-lg">
          {filtered.map((r) => (
            <li key={r.id}>
              <Link
                href={`/rezepte/${r.id}`}
                className="block p-3 hover:bg-neutral-50"
              >
                <div className="flex items-baseline gap-2">
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-neutral-500">
                    {r.servings} Portionen
                  </div>
                </div>
                {r.tags && r.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {r.tags.map((t) => (
                      <span
                        key={t}
                        className="text-xs bg-neutral-100 rounded-full px-2 py-0.5"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
