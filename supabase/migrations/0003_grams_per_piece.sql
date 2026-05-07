-- Stückgewicht: schließt die Lücke zwischen "Speicher-Einheit Stück"
-- und "Nährwerte pro 100 g". Ohne diesen Wert sind kcal-Berechnungen
-- für stk-Zutaten unmöglich.

alter table ingredients
  add column if not exists grams_per_piece numeric;

-- Backfill für die geseedeten Stück-Zutaten
update ingredients set grams_per_piece = 60  where name = 'Eier'        and grams_per_piece is null;
update ingredients set grams_per_piece = 60  where name = 'Zitrone'     and grams_per_piece is null;
update ingredients set grams_per_piece = 50  where name = 'Limette'     and grams_per_piece is null;
update ingredients set grams_per_piece = 180 where name = 'Apfel'       and grams_per_piece is null;
update ingredients set grams_per_piece = 120 where name = 'Banane'      and grams_per_piece is null;
update ingredients set grams_per_piece = 150 where name = 'Avocado'     and grams_per_piece is null;
update ingredients set grams_per_piece = 60  where name = 'Brötchen'    and grams_per_piece is null;
update ingredients set grams_per_piece = 40  where name = 'Tortilla Wraps' and grams_per_piece is null;
update ingredients set grams_per_piece = 80  where name = 'Pita Brot'   and grams_per_piece is null;
update ingredients set grams_per_piece = 70  where name = 'Burger Buns' and grams_per_piece is null;
update ingredients set grams_per_piece = 10  where name = 'Brühwürfel'  and grams_per_piece is null;
