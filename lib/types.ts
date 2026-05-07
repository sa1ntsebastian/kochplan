export type Unit = "g" | "ml" | "stk";

export type Category =
  | "obst_gemuese"
  | "brot_backwaren"
  | "milch_eier"
  | "fleisch_fisch"
  | "tiefkuehl"
  | "trockenwaren"
  | "gewuerze_oele"
  | "getraenke"
  | "sonstiges";

export type Slot = "lunch" | "dinner";

export interface IngredientUnit {
  id: string;
  ingredient_id: string;
  label: string;
  factor: number;
  sort_order: number;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: Unit;
  category: Category;
  kcal_per_100: number | null;
  protein_per_100: number | null;
  carbs_per_100: number | null;
  fat_per_100: number | null;
  grams_per_piece: number | null;
  created_at: string;
  units?: IngredientUnit[];
}

export interface Recipe {
  id: string;
  name: string;
  servings: number;
  instructions: string | null;
  notes: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  amount: number;
  display_amount: number | null;
  display_unit: string | null;
  ingredient?: Ingredient;
}

export interface MealPlanEntry {
  id: string;
  date: string;
  slot: Slot;
  recipe_id: string;
  servings: number;
  recipe?: Recipe;
}

export interface ShoppingListItem {
  id: string;
  week_start: string;
  name: string;
  amount: number | null;
  unit: Unit | null;
  category: Category;
  source: "manual" | "aggregated";
  ingredient_id: string | null;
  checked: boolean;
}
