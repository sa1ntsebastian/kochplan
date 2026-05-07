import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const sb = supabaseServer();
  let query = sb
    .from("ingredients")
    .select("*, units:ingredient_units(id, ingredient_id, label, factor, sort_order)")
    .order("name", { ascending: true })
    .limit(20);
  if (q) query = query.ilike("name", `%${q}%`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const ingredients = (data ?? []).map((row) => ({
    ...row,
    units: ((row as { units?: { sort_order: number }[] }).units ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order),
  }));
  return NextResponse.json({ ingredients });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = String(body.name ?? "").trim();
  const unit = String(body.unit ?? "g");
  const category = String(body.category ?? "sonstiges");
  const kcal_per_100 = numOrNull(body.kcal_per_100);
  const protein_per_100 = numOrNull(body.protein_per_100);
  const carbs_per_100 = numOrNull(body.carbs_per_100);
  const fat_per_100 = numOrNull(body.fat_per_100);
  const grams_per_piece = unit === "stk" ? numOrNull(body.grams_per_piece) : null;
  const aliases = Array.isArray(body.units)
    ? (body.units as { label: string; factor: number | string }[])
        .map((u, i) => ({
          label: String(u.label ?? "").trim(),
          factor: Number(u.factor),
          sort_order: i + 1,
        }))
        .filter((u) => u.label && Number.isFinite(u.factor) && u.factor > 0)
    : [];

  if (!name) {
    return NextResponse.json({ error: "Name erforderlich" }, { status: 400 });
  }
  if (!["g", "ml", "stk"].includes(unit)) {
    return NextResponse.json({ error: "Ungültige Einheit" }, { status: 400 });
  }

  const sb = supabaseServer();
  const { data: ing, error } = await sb
    .from("ingredients")
    .insert({
      name,
      unit,
      category,
      kcal_per_100,
      protein_per_100,
      carbs_per_100,
      fat_per_100,
      grams_per_piece,
    })
    .select("*")
    .single();
  if (error || !ing) {
    return NextResponse.json(
      { error: error?.message ?? "insert failed" },
      { status: 500 }
    );
  }

  let unitsRows: { id: string; ingredient_id: string; label: string; factor: number; sort_order: number }[] = [];
  if (aliases.length > 0) {
    const { data: u, error: e2 } = await sb
      .from("ingredient_units")
      .insert(
        aliases.map((a) => ({
          ingredient_id: ing.id,
          label: a.label,
          factor: a.factor,
          sort_order: a.sort_order,
        }))
      )
      .select("*");
    if (e2) {
      return NextResponse.json({ error: e2.message }, { status: 500 });
    }
    unitsRows = u ?? [];
  }

  return NextResponse.json({ ingredient: { ...ing, units: unitsRows } });
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
