-- ============================================================================
-- Supabase-Schema für den migrierten Schülerbereich
-- ============================================================================
-- Anleitung: Supabase-Dashboard → SQL Editor → New Query → dieses Skript
-- komplett einfügen → "Run". Danach existieren alle Tabellen inkl.
-- Sicherheitsregeln (Row Level Security).
--
-- Architektur-Prinzip:
--   A) INHALTS-TABELLEN (Lesedaten): werden per Export aus dem Autoren-System
--      (Base44) befüllt – ausschließlich über den service_role-Key.
--      Schüler dürfen nur LESEN. Kern-Spalten für Abfragen + `daten` (jsonb)
--      mit dem vollständigen Original-Datensatz → der Export bleibt simpel
--      und das Schema muss bei Feld-Erweiterungen nicht angefasst werden.
--   B) SCHÜLER-TABELLEN (Schreibdaten): jeder Schüler sieht und bearbeitet
--      nur seine eigenen Zeilen (auth.uid()).
--   C) MBK-PROMPT-TABELLEN: enthalten die von der Lehrkraft kuratierten
--      KI-Bauanleitungen (MBKGlobalPrompt + ExportPrompts), damit ein
--      externer Entwickler (Malte) ohne Base44-Zugang alle Informationen
--      hat, um daraus Moodle-HTML-Seiten zu generieren.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- A) INHALTS-TABELLEN (read-only für Schüler, befüllt per Export)
-- ─────────────────────────────────────────────────────────────────────────
-- IDs sind text, weil sie 1:1 die Base44-IDs übernehmen (stabile Referenzen
-- zwischen Autoren-System und Schülerbereich).

create table if not exists einheiten (
  id                      text primary key,
  fach                    text not null,
  titel_der_einheit       text not null,
  jahrgangsstufe          text,
  lernpfade_konfiguration jsonb not null default '{}'::jsonb,
  onboarding_konfiguration jsonb not null default '{}'::jsonb,
  daten                   jsonb not null default '{}'::jsonb,
  exportiert_am           timestamptz not null default now()
);

create table if not exists themenfelder (
  id          text primary key,
  einheit_id  text not null references einheiten(id) on delete cascade,
  titel       text not null,
  beschreibung text,
  reihenfolge numeric,
  daten       jsonb not null default '{}'::jsonb
);

create table if not exists lernpakete (
  id                  text primary key,
  einheit_id          text not null references einheiten(id) on delete cascade,
  themenfeld_id       text,
  titel_des_pakets    text not null,
  reihenfolge_nummer  numeric,
  geschaetzte_dauer_minuten numeric,
  phasen_konfiguration jsonb not null default '{}'::jsonb,
  daten               jsonb not null default '{}'::jsonb
);

create table if not exists aktivitaeten_katalog (
  id            text primary key,
  name          text not null,
  phase         text not null,
  thumbnail_url text,
  supports_master boolean not null default false,
  form_schema   jsonb not null default '[]'::jsonb,
  daten         jsonb not null default '{}'::jsonb
);

create table if not exists lernpaket_aktivitaeten (
  id            text primary key,
  lernpaket_id  text not null references lernpakete(id) on delete cascade,
  aktivitaet_id text not null,
  phase         text not null,
  is_master     boolean not null default false,
  master_anzeige_modus text not null default 'shuffle',
  field_values  jsonb not null default '{}'::jsonb,
  daten         jsonb not null default '{}'::jsonb
);

create table if not exists master_aufgaben (
  id            text primary key,
  activity_id   text not null references lernpaket_aktivitaeten(id) on delete cascade,
  lernpaket_id  text not null,
  titel         text,
  reihenfolge   numeric,
  field_values  jsonb not null default '{}'::jsonb
);

create table if not exists lernziele (
  id                       text primary key,
  lernpaket_id             text not null references lernpakete(id) on delete cascade,
  formulierung_fachsprache text not null,
  schueler_uebersetzung    text,
  kategorie                text
);

create table if not exists allgemeine_aufgaben (
  id            text primary key,
  einheit_id    text not null references einheiten(id) on delete cascade,
  themenfeld_id text,
  titel         text,
  aufgaben_typ  text not null default 'inhalt',
  daten         jsonb not null default '{}'::jsonb
);

create table if not exists system_bausteine (
  id                 text primary key,
  baustein_id        text not null unique,
  titel              text not null,
  icon               text,
  typ                text not null default 'baustein',
  admin_beschreibung text,
  daten              jsonb not null default '{}'::jsonb
);

-- KI-generierte, schülergerechte Inhalts-Snapshots (1:1 wie SchuelerInhaltSnapshot)
create table if not exists inhalt_snapshots (
  id              uuid primary key default gen_random_uuid(),
  einheit_id      text not null references einheiten(id) on delete cascade,
  geltungsbereich text not null default 'pfad_instanz' check (geltungsbereich in ('pfad_instanz','einheit')),
  lerntyp         text check (lerntyp in ('minimalist','pragmatiker','ehrgeizig','passioniert')),
  instance_id     text,
  baustein_id     text not null,
  themenfeld_id   text,
  inhalt          jsonb not null default '{}'::jsonb,
  generiert_am    timestamptz not null default now()
);
-- Eindeutigkeit wie im Autoren-System:
create unique index if not exists ux_snapshot_pfad
  on inhalt_snapshots (einheit_id, lerntyp, instance_id)
  where geltungsbereich = 'pfad_instanz';
create unique index if not exists ux_snapshot_einheit
  on inhalt_snapshots (einheit_id, baustein_id)
  where geltungsbereich = 'einheit';

-- ─────────────────────────────────────────────────────────────────────────
-- C) MBK-PROMPT-TABELLEN (global + pro Einheit)
-- ─────────────────────────────────────────────────────────────────────────
-- Diese Tabellen enthalten die gesamte KI-Bauanleitung, die im Export-Center
-- kuratiert und generiert wird. Ein externer Entwickler kann daraus komplett
-- eigenständig Moodle-HTML-Seiten bauen – ohne jemals Base44 zu berühren.

-- MBKGlobalPrompt: globale, einheits-übergreifende KI-Anweisungen.
-- Entspricht 1:1 der Base44-Entity MBKGlobalPrompt.
create table if not exists mbk_global_prompts (
  id            text primary key,
  kategorie     text not null,
  schluessel    text not null unique,
  anzeigename   text not null,
  prompt_text   text,
  ist_aktiv     boolean not null default true,
  sort_order    integer not null default 100
);

-- ExportPrompts: die generierten Air-Gap-Payloads (Payloads 0–5) pro Einheit.
-- Entspricht 1:1 der Base44-Entity ExportPrompts. Nur für die exportierte
-- Einheit relevant; wird beim Re-Export gelöscht + neu eingefügt.
create table if not exists export_prompts (
  id                              text primary key,
  einheit_id                      text not null references einheiten(id) on delete cascade,
  prompt_type                     text not null,
  reference_id                    text,
  content                         text,
  is_customized                   boolean not null default false,
  source_updated_at               timestamptz,
  template_version                text,
  system_context_hash_at_generation text,
  ui_config_hash_at_generation    text
);
create index if not exists ix_export_prompts_einheit on export_prompts (einheit_id, prompt_type);

-- ─────────────────────────────────────────────────────────────────────────
-- B) SCHÜLER-TABELLEN (read/write, pro Schüler isoliert)
-- ─────────────────────────────────────────────────────────────────────────
-- user_id verweist auf das eingebaute Supabase-Login (auth.users).

create table if not exists einheit_fortschritt (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null default auth.uid() references auth.users(id) on delete cascade,
  einheit_id            text not null,
  gewaehlter_lerntyp    text check (gewaehlter_lerntyp in ('minimalist','pragmatiker','ehrgeizig','passioniert')),
  onboarding_done       boolean not null default false,
  onboarding_empfehlung text,
  abgeschlossen         boolean not null default false,
  abgeschlossen_am      timestamptz,
  abgeschlossen_lerntyp text,
  unique (user_id, einheit_id)
);

create table if not exists aktivitaet_fortschritt (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  einheit_id    text not null,
  lerntyp       text not null,
  instance_id   text not null,
  sektor_id     text,
  item_type     text,
  ref_id        text,
  themenfeld_id text,
  status        text not null default 'offen' check (status in ('offen','in_bearbeitung','erledigt')),
  erfolgreich   boolean,
  prozent       numeric,
  versuche      numeric not null default 0,
  erste_bearbeitung_am  timestamptz,
  letzte_bearbeitung_am timestamptz,
  erledigt_am           timestamptz,
  unique (user_id, einheit_id, lerntyp, instance_id)
);

create table if not exists lernziel_einschaetzungen (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  einheit_id    text not null,
  lernziel_id   text not null,
  lernpaket_id  text,
  einschaetzung text not null check (einschaetzung in ('sicher','unsicher','schwierig')),
  unique (user_id, einheit_id, lernziel_id)
);

create table if not exists zeit_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  einheit_id text not null,
  datum      date not null,
  minuten    numeric not null default 0,
  unique (user_id, einheit_id, datum)
);

create table if not exists einheit_notizen (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  einheit_id text not null,
  text       text not null,
  created_at timestamptz not null default now()
);

create table if not exists lerntagebuch_eintraege (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  text       text not null,
  typ        text not null default 'frei' check (typ in ('reflexion','nachricht','zwischennotiz','frei')),
  fach_name  text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- D) ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────
-- Inhalts-Tabellen: Schüler (eingeloggt) dürfen lesen. Schreiben ist NICHT
-- erlaubt – der Export aus dem Autoren-System nutzt den service_role-Key,
-- der RLS umgeht.

alter table einheiten              enable row level security;
alter table themenfelder           enable row level security;
alter table lernpakete             enable row level security;
alter table aktivitaeten_katalog   enable row level security;
alter table lernpaket_aktivitaeten enable row level security;
alter table master_aufgaben        enable row level security;
alter table lernziele              enable row level security;
alter table allgemeine_aufgaben    enable row level security;
alter table system_bausteine       enable row level security;
alter table inhalt_snapshots       enable row level security;
alter table mbk_global_prompts     enable row level security;
alter table export_prompts         enable row level security;

drop policy if exists "Inhalte lesen" on einheiten;
drop policy if exists "Inhalte lesen" on themenfelder;
drop policy if exists "Inhalte lesen" on lernpakete;
drop policy if exists "Inhalte lesen" on aktivitaeten_katalog;
drop policy if exists "Inhalte lesen" on lernpaket_aktivitaeten;
drop policy if exists "Inhalte lesen" on master_aufgaben;
drop policy if exists "Inhalte lesen" on lernziele;
drop policy if exists "Inhalte lesen" on allgemeine_aufgaben;
drop policy if exists "Inhalte lesen" on system_bausteine;
drop policy if exists "Inhalte lesen" on inhalt_snapshots;
drop policy if exists "Inhalte lesen" on mbk_global_prompts;
drop policy if exists "Inhalte lesen" on export_prompts;

create policy "Inhalte lesen" on einheiten              for select to authenticated using (true);
create policy "Inhalte lesen" on themenfelder           for select to authenticated using (true);
create policy "Inhalte lesen" on lernpakete             for select to authenticated using (true);
create policy "Inhalte lesen" on aktivitaeten_katalog   for select to authenticated using (true);
create policy "Inhalte lesen" on lernpaket_aktivitaeten for select to authenticated using (true);
create policy "Inhalte lesen" on master_aufgaben        for select to authenticated using (true);
create policy "Inhalte lesen" on lernziele              for select to authenticated using (true);
create policy "Inhalte lesen" on allgemeine_aufgaben    for select to authenticated using (true);
create policy "Inhalte lesen" on system_bausteine       for select to authenticated using (true);
create policy "Inhalte lesen" on inhalt_snapshots       for select to authenticated using (true);
create policy "Inhalte lesen" on mbk_global_prompts     for select to authenticated using (true);
create policy "Inhalte lesen" on export_prompts         for select to authenticated using (true);

-- Schüler-Tabellen: jeder nur seine eigenen Zeilen (lesen + schreiben).

alter table einheit_fortschritt      enable row level security;
alter table aktivitaet_fortschritt   enable row level security;
alter table lernziel_einschaetzungen enable row level security;
alter table zeit_logs                enable row level security;
alter table einheit_notizen          enable row level security;
alter table lerntagebuch_eintraege   enable row level security;

drop policy if exists "Eigene Daten" on einheit_fortschritt;
drop policy if exists "Eigene Daten" on aktivitaet_fortschritt;
drop policy if exists "Eigene Daten" on lernziel_einschaetzungen;
drop policy if exists "Eigene Daten" on zeit_logs;
drop policy if exists "Eigene Daten" on einheit_notizen;
drop policy if exists "Eigene Daten" on lerntagebuch_eintraege;

create policy "Eigene Daten" on einheit_fortschritt      for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Eigene Daten" on aktivitaet_fortschritt   for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Eigene Daten" on lernziel_einschaetzungen for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Eigene Daten" on zeit_logs                for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Eigene Daten" on einheit_notizen          for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Eigene Daten" on lerntagebuch_eintraege   for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────
-- E) Hilfreiche Indizes für die typischen Abfragen des Schülerbereichs
-- ─────────────────────────────────────────────────────────────────────────

create index if not exists ix_themenfelder_einheit   on themenfelder (einheit_id);
create index if not exists ix_lernpakete_einheit     on lernpakete (einheit_id);
create index if not exists ix_lp_akt_lernpaket       on lernpaket_aktivitaeten (lernpaket_id);
create index if not exists ix_master_activity        on master_aufgaben (activity_id);
create index if not exists ix_lernziele_lernpaket    on lernziele (lernpaket_id);
create index if not exists ix_aufgaben_einheit       on allgemeine_aufgaben (einheit_id);
create index if not exists ix_snapshots_einheit      on inhalt_snapshots (einheit_id);
create index if not exists ix_fortschritt_user       on aktivitaet_fortschritt (user_id, einheit_id, lerntyp);