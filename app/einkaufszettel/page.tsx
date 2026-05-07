import Link from "next/link";
import { supabaseServer } from "@/lib/supabase";
import {
  addDays,
  formatDateShort,
  mondayOf,
  parseISODate,
  toISODate,
} from "@/lib/dates";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  categoryRank,
} from "@/lib/categories";
import type { Category, ShoppingListItem } from "@/lib/types";
import ShoppingListView from "./ShoppingListView";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ week?: string }>;

export default async function EinkaufszettelPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const monday = sp.week ? mondayOf(parseISODate(sp.week)) : mondayOf(new Date());
  const sunday = addDays(monday, 6);
  const weekStart = toISODate(monday);
  const prev = toISODate(addDays(monday, -7));
  const next = toISODate(addDays(monday, 7));

  const sb = supabaseServer();
  const { data } = await sb
    .from("shopping_list_items")
    .select("*")
    .eq("week_start", weekStart);
  const items = ((data ?? []) as ShoppingListItem[]).slice().sort((a, b) => {
    const r = categoryRank(a.category) - categoryRank(b.category);
    if (r !== 0) return r;
    if (a.checked !== b.checked) return a.checked ? 1 : -1;
    return a.name.localeCompare(b.name, "de");
  });

  const grouped = new Map<Category, ShoppingListItem[]>();
  for (const i of items) {
    const arr = grouped.get(i.category) ?? [];
    arr.push(i);
    grouped.set(i.category, arr);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold">Einkaufszettel</h1>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={`/einkaufszettel?week=${prev}`}
            className="border rounded px-2 py-1 hover:bg-cream-50"
          >
            ←
          </Link>
          <span className="text-taupe-dark px-2">
            {formatDateShort(monday)} – {formatDateShort(sunday)}
          </span>
          <Link
            href={`/einkaufszettel?week=${next}`}
            className="border rounded px-2 py-1 hover:bg-cream-50"
          >
            →
          </Link>
        </div>
      </div>

      <ShoppingListView
        weekStart={weekStart}
        groups={CATEGORY_ORDER.map((cat) => ({
          category: cat,
          label: CATEGORY_LABELS[cat],
          items: grouped.get(cat) ?? [],
        }))}
      />
    </div>
  );
}
