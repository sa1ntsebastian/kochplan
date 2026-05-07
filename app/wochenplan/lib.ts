export type RecipeMeta = {
  id: string;
  name: string;
  servings: number;
  tags: string[];
  ingredient_names: string[];
};

export type RankedRecipe = RecipeMeta & {
  score: number;
  matchReason: string | null;
};

const T_NAME_EXACT = 100;
const T_NAME_START = 80;
const T_NAME_CONTAINS = 60;
const T_TAG_EXACT = 40;
const T_TAG_CONTAINS = 30;
const T_ING_EXACT = 15;
const T_ING_CONTAINS = 10;

export function rankRecipes(
  recipes: RecipeMeta[],
  q: string
): RankedRecipe[] {
  const Q = q.trim().toLowerCase();
  if (!Q) {
    return recipes.map((r) => ({ ...r, score: 0, matchReason: null }));
  }

  const out: RankedRecipe[] = [];
  for (const r of recipes) {
    const name = r.name.toLowerCase();
    let best = 0;
    let reason: string | null = null;

    if (name === Q) {
      best = T_NAME_EXACT;
      reason = null;
    } else if (name.startsWith(Q)) {
      best = T_NAME_START;
      reason = null;
    } else if (name.includes(Q)) {
      best = T_NAME_CONTAINS;
      reason = null;
    }

    for (const t of r.tags) {
      const tl = t.toLowerCase();
      if (tl === Q) {
        if (T_TAG_EXACT > best) {
          best = T_TAG_EXACT;
          reason = `Tag: ${t}`;
        }
      } else if (tl.includes(Q)) {
        if (T_TAG_CONTAINS > best) {
          best = T_TAG_CONTAINS;
          reason = `Tag: ${t}`;
        }
      }
    }

    for (const ing of r.ingredient_names) {
      const il = ing.toLowerCase();
      if (il === Q) {
        if (T_ING_EXACT > best) {
          best = T_ING_EXACT;
          reason = `Zutat: ${ing}`;
        }
      } else if (il.includes(Q)) {
        if (T_ING_CONTAINS > best) {
          best = T_ING_CONTAINS;
          reason = `Zutat: ${ing}`;
        }
      }
    }

    if (best > 0) {
      out.push({ ...r, score: best, matchReason: reason });
    }
  }

  out.sort((a, b) =>
    b.score !== a.score ? b.score - a.score : a.name.localeCompare(b.name, "de")
  );
  return out;
}
