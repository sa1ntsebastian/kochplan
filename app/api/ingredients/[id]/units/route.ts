import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const label = String(body.label ?? "").trim();
  const factor = Number(body.factor);

  if (!label) {
    return NextResponse.json({ error: "Label fehlt" }, { status: 400 });
  }
  if (!Number.isFinite(factor) || factor <= 0) {
    return NextResponse.json({ error: "Faktor ungültig" }, { status: 400 });
  }

  const sb = supabaseServer();

  const { data: existing } = await sb
    .from("ingredient_units")
    .select("sort_order")
    .eq("ingredient_id", id)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1;

  const { data, error } = await sb
    .from("ingredient_units")
    .insert({ ingredient_id: id, label, factor, sort_order: nextOrder })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ unit: data });
}
