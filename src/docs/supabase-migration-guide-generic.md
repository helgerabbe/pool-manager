# Supabase-Migrations-Anleitung für eine zweite Base44-App

## Ziel

Diese App soll zweigleisig laufen:
- **Base44** (Entwicklungsumgebung, direkter Editor) – unverändert erhalten
- **Supabase + GitHub Pages** (statischer Build, operativer Betrieb)

Das Prinzip wurde hier in dieser App bereits umgesetzt. Der Bauplan ist
generalisiert – du musst ihn nur auf die zweite App anwenden.

---

## Architektur-Überblick

```
┌─────────────────────────────────────────┐
│          App-Code (React+Vite)          │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │     SchuelerDataService.js        │  │
│  │     (einheitliche Fassade)        │  │
│  ├───────────────┬───────────────────┤  │
│  │ base44Adapter │ supabaseAdapter   │  │
│  │ (Base44-SDK)  │ (@supabase/sup.  │  │
│  │               │  base-js)         │  │
│  └───────┬───────┴────────┬──────────┘  │
│          │                │             │
│   backend.js              │             │
│   (VITE_BACKEND)          │             │
└───────────────────────────┼─────────────┘
                            │
              ┌─────────────┴──────────────┐
              │   Supabase                 │
              │   ├── einheiten            │
              │   ├── themenfelder         │
              │   ├── lernpakete           │
              │   ├── aktivitaeten_katalog │
              │   ├── lernpaket_aktivit... │
              │   ├── master_aufgaben      │
              │   ├── lernziele            │
              │   ├── allgemeine_aufgaben  │
              │   ├── system_bausteine     │
              │   ├── inhalt_snapshots     │
              │   ├── mbk_global_prompts   │
              │   ├── export_prompts       │
              │   ├── einheit_fortschritt  │
              │   ├── aktivitaet_fort...   │
              │   ├── lernziel_einsch...   │
              │   ├── zeit_logs            │
              │   ├── einheit_notizen      │
              │   └── lerntagebuch_ein...  │
              └────────────────────────────┘
```

---

## Was du bauen musst (Schritt für Schritt)

### 1. Supabase-Schema anlegen

Erstelle ein SQL-Skript, das ALLE Tabellen deiner App abbildet. Das Schema
aus dieser App (`docs/migration/supabase-schema.sql`) dient als Vorlage.

**Prinzipien**:
- **Inhalts-Tabellen** (read-only): Kern-Spalten + `daten` (jsonb, voller Original-Datensatz)
- **Schüler-Tabellen** (read/write): mit Row Level Security, `user_id` = `auth.uid()`
- IDs sind `text` (nehmen 1:1 die Base44-IDs auf)
- Alle Tabellen mit `alter table ... enable row level security` absichern
- Inhalts-Tabellen: `using (true)` für eingeloggte Nutzer
- Schüler-Tabellen: `using (user_id = auth.uid())`

### 2. Plattform-Weiche (`backend.js`)

Eine Datei, die zur Build-Zeit entscheidet:

```js
const BACKEND = (import.meta.env?.VITE_BACKEND || 'base44').toLowerCase();
export function isSupabase() { return BACKEND === 'supabase'; }
export function isBase44() { return !isSupabase(); }
```

### 3. Supabase-Client (`supabaseClient.js`)

Singleton-Client, liest `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY`:

```js
import { createClient } from '@supabase/supabase-js';
let client = null;
export function getSupabase() {
  if (!client) {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    client = createClient(url, anonKey);
  }
  return client;
}
```

### 4. Adapter-Schicht

**Prinzip**: Beide Adapter implementieren EXAKT dieselbe Signatur. Keine
Seite, kein Hook, keine Komponente darf direkt `base44.entities.*` oder
`supabase.from().*` aufrufen – NUR der DataService.

#### 4a. `base44Adapter.js`

Wrappt alle bestehenden Datenzugriffe deiner App:
```js
export async function listMeineDaten() {
  return base44.entities.MeineEntity.list();
}
export async function createMeinEintrag(data) {
  return base44.entities.MeineEntity.create(data);
}
// ... für jede Entity, die deine App nutzt
```

#### 4b. `supabaseAdapter.js`

Implementiert dieselben Funktionen mit Supabase-Abfragen:

```js
export async function listMeineDaten() {
  const { data, error } = await getSupabase()
    .from('meine_tabelle').select('*');
  if (error) throw error;
  return (data || []).map(mergeContent);
}
export async function createMeinEintrag(data) {
  const { user_email: _, ...rest } = data;
  const { data: row, error } = await getSupabase()
    .from('meine_tabelle').insert(rest).select().single();
  if (error) throw error;
  return row;
}
```

**Wichtige Konventionen**:
- Inhalts-Daten: `mergeContent(row)` mergt `{ ...daten, ...kernSpalten }`
- Schüler-Schreibdaten: `user_email` wird vor dem Schreiben entfernt (RLS setzt `user_id`)
- Schüler-Lesedaten: `created_at` → `created_date` spiegeln, `user_email` aus dem Aufruf ergänzen

#### 4c. `SchuelerDataService.js`

Re-exportiert alle Adapter-Funktionen, delegiert über `backend.js`:

```js
import * as base44Adapter from './adapters/base44Adapter';
import * as supabaseAdapter from './adapters/supabaseAdapter';
const adapter = isSupabase() ? supabaseAdapter : base44Adapter;
export const getCurrentUser = adapter.getCurrentUser;
export const listMeineDaten = adapter.listMeineDaten;
// ...
```

### 5. App.jsx anpassen

Zwei getrennte Routing-Pfade:

**Base44-Modus** (Default):
```
<Route element={<AppLayout />}>
  <Route path="/" element={<Dashboard />} />
  {/* alle Admin-/Lehrer-Routen */}
</Route>
```

**Supabase-Modus**:
```
<Route element={<SchuelerOnlyLayout />}>
  <Route element={<SupabaseLoginGate />}>
    {/* alle Schüler-/Nutzer-Routen */}
  </Route>
</Route>
```

Die Weiche steuert `isSupabase()`.

**SupabaseLoginGate**: Prüft `auth.getSession()`. Ohne Session → Login-Formular.
Mit Session → `Outlet`. Im Base44-Modus: transparent, rendert direkt das `Outlet`.

**SchuelerOnlyLayout**: Einfacher Fullscreen-Container OHNE Base44-Abhängigkeiten
(Presence, SSE, RBAC, Wartungsbanner).

### 6. Export-Funktion (Base44 → Supabase)

Eine Backend-Funktion, die per Service-Role-Key Daten aus Base44 liest und in
Supabase schreibt. Muster: `exportEinheitToSupabase` in dieser App.

**Ablauf**:
1. Berechtigung prüfen (Admin oder bestimmte Rolle)
2. Daten aus Base44 laden (alle Entities, die exportiert werden sollen)
3. In Supabase: Kind-Daten löschen, dann frisch einfügen (keine Leichen)
4. Globale Referenzdaten (Kataloge) per Upsert
5. Tombstones (`sync_status='to_delete'`) werden NICHT exportiert

### 7. GitHub CI/CD

Ein Workflow (`.github/workflows/deploy.yml`), der bei jedem Push:
1. `npm ci && npm run build` mit `VITE_BACKEND=supabase` und den Supabase-Env-Variablen
2. Das Build-Ergebnis auf GitHub Pages deployt

Die Secrets `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` in den
GitHub-Repo-Settings hinterlegen.

### 8. Supabase Auth + Test-User

- Supabase → Authentication → URL Configuration: Site-URL und Redirect-URL setzen
- Authentication → Users → Test-User anlegen (mit "Auto Confirm")
- End-to-End-Test: App öffnen → Login → Daten sehen und schreiben

---

## Checkliste

- [ ] Supabase-Schema erstellt und per SQL Editor ausgeführt
- [ ] `backend.js` mit Plattform-Weiche erstellt
- [ ] `supabaseClient.js` mit Singleton-Client erstellt
- [ ] `base44Adapter.js`: ALLE Datenzugriffe der App gekapselt
- [ ] `supabaseAdapter.js`: dieselbe Schnittstelle mit Supabase-Abfragen
- [ ] `SchuelerDataService.js`: zentrale Fassade
- [ ] ALLE Komponenten auf SchuelerDataService umgestellt (kein direktes `base44.*`)
- [ ] `App.jsx`: Routing-Weiche für `isSupabase()`
- [ ] `SupabaseLoginGate` + Login-Form
- [ ] `SchuelerOnlyLayout` (ohne Base44-Abhängigkeiten)
- [ ] Export-Funktion für Datenfluss Base44 → Supabase
- [ ] GitHub Workflow für statischen Build + Pages-Deploy
- [ ] Supabase-Auth konfiguriert + Test-User angelegt
- [ ] End-to-End-Test: Login → Daten sehen → Schreiben → Persistenz
- [ ] Installierte Packages: `@supabase/supabase-js` (via `npm install`)