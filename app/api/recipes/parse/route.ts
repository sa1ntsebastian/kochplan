import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseServer } from "@/lib/supabase";
import type { Ingredient, IngredientUnit } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

type ParsedIngredient = {
  amount: number | null;
  unit: string | null;
  name: string;
};

type ParsedRecipe = {
  title: string;
  servings: number | null;
  instructions: string;
  ingredients: ParsedIngredient[];
  tags: string[];
};

const SYSTEM_PROMPT = `Du extrahierst aus einem freien deutschen Rezept-Text strukturierte Daten.

Regeln:
- Zutatennamen im Singular Nominativ (z.B. "Karotte", nicht "2 Karotten" oder "Karotten").
- "amount" ist eine Zahl. Brüche umrechnen ("1/2 TL Salz" -> amount 0.5, unit "TL").
- "unit" ist die im Text genutzte Einheit (g, kg, ml, l, EL, TL, Stück, Bund, Dose, Päckchen, Prise, Hand voll, Zehe, Tasse, ...). Wenn keine Einheit angegeben ist und es sich um etwas Zählbares handelt (z.B. "2 Zwiebeln"), unit = "Stück".
- Wenn keine Menge angegeben ist (z.B. "Salz, Pfeffer"), amount = null und unit = null.
- "instructions" ist die Zubereitung als Markdown mit nummerierter Liste (1., 2., 3., ...).
- "tags" sind 0-3 kurze Schlagwörter wie "vegetarisch", "schnell", "asiatisch". Nur wenn aus dem Text deutlich erkennbar.
- "servings" ist die Portionenzahl (Zahl). null wenn nicht erwähnt.
- "title" ist der Rezeptname.

Rufe IMMER das Tool extract_recipe genau einmal auf.`;

const TOOL = {
  name: "extract_recipe",
  description: "Liefert das geparste Rezept als strukturiertes Objekt.",
  input_schema: {
    type: "object" as const,
    required: ["title", "instructions", "ingredients", "tags"],
    properties: {
      title: { type: "string" },
      servings: { type: ["integer", "null"] },
      instructions: {
        type: "string",
        description: "Zubereitung in Markdown",
      },
      ingredients: {
        type: "array",
        items: {
          type: "object",
          required: ["name"],
          properties: {
            amount: { type: ["number", "null"] },
            unit: { type: ["string", "null"] },
            name: { type: "string" },
          },
        },
      },
      tags: {
        type: "array",
        items: { type: "string" },
      },
    },
  },
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY nicht gesetzt." },
      { status: 503 }
    );
  }

  const { text } = await req.json();
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "Text fehlt" }, { status: 400 });
  }
  if (text.length > 20000) {
    return NextResponse.json(
      { error: "Text zu lang (max 20k Zeichen)" },
      { status: 400 }
    );
  }

  const anthropic = new Anthropic({ apiKey });

  let parsed: ParsedRecipe;
  try {
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: [TOOL],
      tool_choice: { type: "tool", name: TOOL.name },
      messages: [{ role: "user", content: text }],
    });

    const toolUse = res.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json(
        { error: "Modell hat kein Tool benutzt." },
        { status: 502 }
      );
    }
    parsed = toolUse.input as ParsedRecipe;
  } catch (err) {
    return NextResponse.json(
      { error: `Claude-Fehler: ${(err as Error).message}` },
      { status: 502 }
    );
  }

  // Match parsed ingredients to DB ingredients
  const sb = supabaseServer();
  const { data: allIng } = await sb
    .from("ingredients")
    .select(
      "*, units:ingredient_units(id, ingredient_id, label, factor, sort_order)"
    );
  const ingredients = (allIng ?? []) as (Ingredient & {
    units: IngredientUnit[];
  })[];

  const byLowerName = new Map<string, typeof ingredients[number]>();
  for (const i of ingredients) byLowerName.set(i.name.toLowerCase(), i);

  type MatchedIngredient = ParsedIngredient & {
    matched: (Ingredient & { units: IngredientUnit[] }) | null;
    suggested_unit_label: string | null;
  };

  const matched: MatchedIngredient[] = parsed.ingredients.map((p) => {
    const lower = p.name.toLowerCase();
    let m = byLowerName.get(lower) ?? null;
    if (!m) {
      // Fuzzy: try contains both directions
      m =
        ingredients.find(
          (ing) =>
            ing.name.toLowerCase().includes(lower) ||
            lower.includes(ing.name.toLowerCase())
        ) ?? null;
    }

    let suggested_unit_label: string | null = null;
    if (m && p.unit) {
      const u = p.unit.trim();
      const aliasMatch = (m.units ?? []).find(
        (a) => a.label.toLowerCase() === u.toLowerCase()
      );
      if (aliasMatch) {
        suggested_unit_label = aliasMatch.label;
      } else if (u.toLowerCase() === m.unit.toLowerCase()) {
        suggested_unit_label = "";
      }
    }

    return {
      ...p,
      matched: m
        ? {
            ...m,
            units: (m.units ?? [])
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order),
          }
        : null,
      suggested_unit_label,
    };
  });

  return NextResponse.json({
    title: parsed.title,
    servings: parsed.servings,
    instructions: parsed.instructions,
    tags: parsed.tags ?? [],
    ingredients: matched,
  });
}
