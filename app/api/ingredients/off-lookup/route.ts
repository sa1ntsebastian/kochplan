import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Holt Median-Nährwerte aus den Top-Treffern bei Open Food Facts.
// Quelle: https://world.openfoodfacts.org (kostenlos, kein API-Key).
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Query fehlt" }, { status: 400 });
  }

  const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  url.searchParams.set("search_terms", q);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", "10");
  url.searchParams.set("countries_tags_de", "germany");
  url.searchParams.set(
    "fields",
    "product_name,product_name_de,nutriments,countries_tags"
  );

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: { "User-Agent": "Kochplan/0.1 (private use)" },
      next: { revalidate: 60 * 60 * 24 },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "OFF nicht erreichbar" },
      { status: 502 }
    );
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: `OFF antwortete mit ${res.status}` },
      { status: 502 }
    );
  }

  const data = await res.json();
  const products: Array<{
    product_name?: string;
    product_name_de?: string;
    nutriments?: Record<string, unknown>;
  }> = data.products ?? [];

  const kcals: number[] = [];
  const proteins: number[] = [];
  const carbs: number[] = [];
  const fats: number[] = [];

  for (const p of products) {
    const n = p.nutriments ?? {};
    pushNum(kcals, n["energy-kcal_100g"]);
    pushNum(proteins, n["proteins_100g"]);
    pushNum(carbs, n["carbohydrates_100g"]);
    pushNum(fats, n["fat_100g"]);
  }

  return NextResponse.json({
    matches: products.length,
    kcal_per_100: median(kcals),
    protein_per_100: median(proteins),
    carbs_per_100: median(carbs),
    fat_per_100: median(fats),
    sample_names: products
      .map((p) => p.product_name_de || p.product_name)
      .filter(Boolean)
      .slice(0, 5),
  });
}

function pushNum(arr: number[], v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isFinite(n) && n >= 0 && n < 1000) arr.push(n);
}

function median(arr: number[]): number | null {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const v =
    sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  return Math.round(v * 10) / 10;
}
