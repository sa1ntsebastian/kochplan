import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const sb = supabaseServer();
  let query = sb
    .from("ingredients")
    .select("*")
    .order("name", { ascending: true })
    .limit(20);
  if (q) query = query.ilike("name", `%${q}%`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ingredients: data ?? [] });
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

  if (!name) {
    return NextResponse.json({ error: "Name erforderlich" }, { status: 400 });
  }
  if (!["g", "ml", "stk"].includes(unit)) {
    return NextResponse.json({ error: "Ungültige Einheit" }, { status: 400 });
  }

  const sb = supabaseServer();
  const { data, error } = await sb
    .from("ingredients")
    .insert({
      name,
      unit,
      category,
      kcal_per_100,
      protein_per_100,
      carbs_per_100,
      fat_per_100,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ingredient: data });
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
