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
      if (q && !r.name.toLowerCase().includes(q.toLowerCase())) return false;
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
          <TagPill
            active={activeTag === null}
            onClick={() => setActiveTag(null)}
          >
            Alle
          </TagPill>
          {allTags.map((t) => (
            <TagPill
              key={t}
              active={activeTag === t}
              onClick={() => setActiveTag(t === activeTag ? null : t)}
            >
              {t}
            </TagPill>
          ))}
        </div>
      )}
      {filtered.length === 0 ? (
        <p className="text-taupe-dark text-sm py-12 text-center">
          Keine Rezepte gefunden.
        </p>
      ) : (
        <ul className="divide-y divide-taupe-light/60 bg-white border border-taupe-light rounded-lg shadow-sm overflow-hidden">
          {filtered.map((r) => (
            <li key={r.id}>
              <Link
                href={`/rezepte/${r.id}`}
                className="block px-4 py-3 hover:bg-cream-100 transition-colors"
              >
                <div className="flex items-baseline gap-2">
                  <div className="font-serif text-base text-ink">{r.name}</div>
                  <div className="text-xs text-taupe-dark">
                    {r.servings} P.
                  </div>
                </div>
                {r.tags && r.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {r.tags.map((t) => (
                      <span
                        key={t}
                        className="text-xs bg-cream-200 text-ink-soft rounded-full px-2 py-0.5"
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

function TagPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs rounded-full px-3 py-1 border transition-colors ${
        active
          ? "bg-forest text-cream-100 border-forest"
          : "bg-white border-taupe-light text-ink-soft hover:border-forest"
      }`}
    >
      {children}
    </button>
  );
}
