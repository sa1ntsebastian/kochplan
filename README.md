# Kochplan

Private Web-App für Wochenplanung, Rezeptverwaltung und Einkaufszettel. Single-user, deutsche UI.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres) · Vercel

## Features (MVP)

- **Rezepte** anlegen, bearbeiten, löschen — mit Zutaten, Portionen, Tags, Markdown-Zubereitung, Notizen.
- **Zutaten-Stammdaten** mit Autocomplete. Inline-Anlegen neuer Zutaten direkt im Rezept-Formular. Optionaler **Open-Food-Facts-Lookup** für Nährwerte (kcal, Protein, Kohlenhydrate, Fett pro 100 g/ml).
- **Wochenplan** mit Mittag- und Abend-Slot pro Tag, Portionen pro Slot anpassbar, Wochen-Navigation.
- **Einkaufszettel**:
  - aggregiert alle Zutaten der Woche (skaliert nach Portionen)
  - sortiert nach Supermarkt-Reihenfolge (Obst & Gemüse → … → Sonstiges)
  - manuelle Items hinzufügen (Klopapier etc.)
  - persistente Checkboxen pro Woche
  - Liste zurücksetzen

## Setup

### 1. Supabase-Projekt

1. Auf [supabase.com](https://supabase.com) ein kostenloses Projekt anlegen.
2. Im Dashboard unter **SQL Editor** beide Dateien nacheinander ausführen:
   - `supabase/migrations/0001_initial.sql`
   - `supabase/seed.sql`
3. Unter **Project Settings → API** die folgenden Werte holen:
   - Project URL
   - `anon public` Key
   - `service_role` Key (nur serverseitig nutzen!)

### 2. Lokale Entwicklung

```bash
cp .env.example .env.local
# .env.local mit Werten aus Supabase + eigenem Passwort + Random-AUTH_SECRET füllen
npm install
npm run dev
```

App läuft auf <http://localhost:3000>. Login mit dem `APP_PASSWORD`.

### 3. Deployment auf Vercel

1. Repo auf GitHub pushen.
2. Auf [vercel.com](https://vercel.com) Projekt importieren.
3. Environment Variables (alle aus `.env.example`) setzen — auch `SUPABASE_SERVICE_ROLE_KEY` und `APP_PASSWORD`.
4. Deploy.

## Architektur-Entscheidungen

- **Auth: einfaches Passwort in `APP_PASSWORD`** + signiertes httpOnly-Cookie via HMAC. Keine Supabase-Auth, kein Magic Link — single-user, privat. Middleware (`middleware.ts`) schützt alle Routen außer `/login` und `/api/auth/*`.
- **Service-Role-Key serverseitig**: Da Auth nicht über Supabase läuft, brauchen wir keinen Row-Level-Security-Aufwand. Alle DB-Zugriffe gehen über den Service-Role-Key in Server Components / API Routes / Server Actions. Niemals an den Client geben.
- **Einheiten**: pro Zutat eine feste Einheit (`g`, `ml`, `stk`). Rezepte erben diese Einheit. Keine Umrechnung im MVP.
- **`meal_plans.slot`** ist als `'lunch' | 'dinner'` modelliert, auch wenn die UI primär Abend nutzt — spart eine spätere Schema-Migration.
- **Einkaufszettel pro Woche** (`week_start` Spalte). Beim Regenerieren wird die Check-State der aggregierten Items über `ingredient_id` zurückgespielt; manuelle Items bleiben unangetastet.

## Roadmap (v2)

- Verkaufseinheiten pro Zutat (1kg-Sack vs. 500g-Pack)
- Frisch/Vorrat-Flag → Reste-Logik
- Reste-Check + Tausch-Vorschläge
- Nährwert-UI (Wochensumme im Plan; Daten liegen schon im Schema)
- Rezeptbilder
- Export/Backup als JSON
