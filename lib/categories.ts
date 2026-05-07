import type { Category, Unit } from "./types";

export const CATEGORY_ORDER: Category[] = [
  "obst_gemuese",
  "brot_backwaren",
  "milch_eier",
  "fleisch_fisch",
  "tiefkuehl",
  "trockenwaren",
  "gewuerze_oele",
  "getraenke",
  "sonstiges",
];

export const CATEGORY_LABELS: Record<Category, string> = {
  obst_gemuese: "Obst & Gemüse",
  brot_backwaren: "Brot & Backwaren",
  milch_eier: "Milchprodukte & Eier",
  fleisch_fisch: "Fleisch & Fisch",
  tiefkuehl: "Tiefkühl",
  trockenwaren: "Trockenwaren",
  gewuerze_oele: "Gewürze & Öle",
  getraenke: "Getränke",
  sonstiges: "Sonstiges",
};

export const UNIT_LABELS: Record<Unit, string> = {
  g: "g",
  ml: "ml",
  stk: "Stück",
};

export function categoryRank(c: Category): number {
  const i = CATEGORY_ORDER.indexOf(c);
  return i === -1 ? CATEGORY_ORDER.length : i;
}
