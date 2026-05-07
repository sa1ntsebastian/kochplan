-- Mehrfach-Einheiten pro Zutat (Stück, TL, EL, Bund, …) und Anzeige-Spalten
-- für recipe_ingredients. Additiv, keine Bestandsdaten betroffen.

create table if not exists ingredient_units (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  label text not null,
  factor numeric not null check (factor > 0),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (ingredient_id, label)
);

create index if not exists ingredient_units_ingredient_idx
  on ingredient_units (ingredient_id);

alter table recipe_ingredients
  add column if not exists display_amount numeric,
  add column if not exists display_unit text;

-- Erlaubt dieselbe Zutat in einem Rezept mehrfach (z.B. „1 EL Öl zum
-- Anbraten" + „2 EL Öl fürs Dressing") mit unterschiedlichen Anzeige-Einheiten.
alter table recipe_ingredients
  drop constraint if exists recipe_ingredients_recipe_id_ingredient_id_key;
