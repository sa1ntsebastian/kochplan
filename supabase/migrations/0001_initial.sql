-- Kochplan: initial schema
-- Single-user app, kein RLS nötig (Auth läuft auf Anwendungsebene per Passwort).

create extension if not exists "pgcrypto";

create table if not exists ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  unit text not null check (unit in ('g', 'ml', 'stk')),
  category text not null check (category in (
    'obst_gemuese',
    'brot_backwaren',
    'milch_eier',
    'fleisch_fisch',
    'tiefkuehl',
    'trockenwaren',
    'gewuerze_oele',
    'getraenke',
    'sonstiges'
  )),
  kcal_per_100 numeric,
  protein_per_100 numeric,
  carbs_per_100 numeric,
  fat_per_100 numeric,
  created_at timestamptz not null default now()
);

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  servings int not null default 2 check (servings > 0),
  instructions text,
  notes text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete restrict,
  amount numeric not null check (amount > 0),
  unique (recipe_id, ingredient_id)
);

create table if not exists meal_plans (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  slot text not null check (slot in ('lunch', 'dinner')),
  recipe_id uuid not null references recipes(id) on delete cascade,
  servings int not null default 2 check (servings > 0),
  unique (date, slot)
);

create table if not exists shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  name text not null,
  amount numeric,
  unit text check (unit in ('g', 'ml', 'stk')),
  category text not null default 'sonstiges',
  source text not null check (source in ('manual', 'aggregated')),
  ingredient_id uuid references ingredients(id) on delete set null,
  checked boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists meal_plans_date_idx on meal_plans (date);
create index if not exists recipe_ingredients_recipe_idx on recipe_ingredients (recipe_id);
create index if not exists recipe_ingredients_ingredient_idx on recipe_ingredients (ingredient_id);
create index if not exists shopping_list_week_idx on shopping_list_items (week_start);

-- updated_at trigger
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists recipes_updated_at on recipes;
create trigger recipes_updated_at
  before update on recipes
  for each row execute function set_updated_at();
