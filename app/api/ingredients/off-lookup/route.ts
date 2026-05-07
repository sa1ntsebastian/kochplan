import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Liefert Top-Treffer aus Open Food Facts mit Nährwerten zur Auswahl.
// Quelle: https://world.openfoodfacts.org (frei, ohne API-Key).
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
  url.searchParams.set("page_size", "20");
  url.searchParams.set("sort_by", "unique_scans_n");
  url.searchParams.set("countries_tags_de", "germany");
  url.searchParams.set("lc", "de");
  url.searchParams.set(
    "fields",
    "product_name,product_name_de,brands,quantity,nutriments,image_thumb_url"
  );

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: { "User-Agent": "Kochplan/0.1 (private use)" },
      next: { revalidate: 60 * 60 * 24 },
    });
  } catch {
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
  const raw: Array<{
    product_name?: string;
    product_name_de?: string;
    brands?: string;
    quantity?: string;
    nutriments?: Record<string, unknown>;
    image_thumb_url?: string;
  }> = data.products ?? [];

  const results = raw
    .map((p) => {
      const n = p.nutriments ?? {};
      const kcal = num(n["energy-kcal_100g"]);
      const protein = num(n["proteins_100g"]);
      const carbs = num(n["carbohydrates_100g"]);
      const fat = num(n["fat_100g"]);
      const name = (p.product_name_de || p.product_name || "").trim();
      if (!name) return null;
      // Mindestens kcal muss vorhanden sein, sonst ist der Treffer nutzlos.
      if (kcal == null) return null;
      return {
        name,
        brand: (p.brands || "").split(",")[0]?.trim() || null,
        quantity: p.quantity?.trim() || null,
        kcal_per_100: kcal,
        protein_per_100: protein,
        carbs_per_100: carbs,
        fat_per_100: fat,
        image: p.image_thumb_url || null,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .slice(0, 8);

  return NextResponse.json({ results });
}

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 1000) return null;
  return Math.round(n * 10) / 10;
}
