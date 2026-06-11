# Phase 4: Probelauf auf Supabase – Schritt-für-Schritt-Anleitung

Diese Schritte führst du außerhalb von Base44 aus (GitHub + Supabase).
Der Code ist bereits vorbereitet: Workflow-Datei
`.github/workflows/deploy-schueler-supabase.yml` und Router-Anpassung
für den Unterpfad auf GitHub Pages.

---

## 1. GitHub-Sync prüfen

- In Base44: Dashboard → Code → GitHub-Sync aktivieren bzw. prüfen,
  dass das Repository den aktuellen Stand enthält (inkl. des Ordners
  `.github/workflows/`).

## 2. GitHub-Repo konfigurieren (einmalig)

1. **Settings → Pages** → Source: **„GitHub Actions"** auswählen.
2. **Settings → Secrets and variables → Actions → New repository secret:**
   - `VITE_SUPABASE_URL` = Project URL aus Supabase (Project Settings → API)
   - `VITE_SUPABASE_ANON_KEY` = **anon/public** Key (NICHT der service_role!)

## 3. Deploy starten

- Tab **Actions** → Workflow „Schüler-App (Supabase) auf GitHub Pages" →
  **Run workflow** (oder einfach auf `main` pushen/syncen).
- Nach ~2–3 Min steht die App unter
  `https://<dein-account>.github.io/<repo-name>/lernen`

## 4. Supabase-Auth konfigurieren

- Supabase → **Authentication → URL Configuration**:
  - Site URL: `https://<dein-account>.github.io/<repo-name>/`
  - Redirect URL ergänzen: `https://<dein-account>.github.io/<repo-name>/**`

## 5. Test-Schüler anlegen

- Supabase → **Authentication → Users → Add user** →
  E-Mail + Passwort vergeben (z. B. `testschueler@schule.de`).
- Optional „Auto Confirm User" aktivieren, damit keine Bestätigungs-Mail nötig ist.

## 6. End-to-End-Test

Unter `https://…/lernen` durchspielen:

1. Login mit dem Test-Schüler (Supabase-Login-Maske erscheint)
2. Fach öffnen → exportierte Einheit sichtbar? („Einführung in die Poolzeit")
3. Onboarding durchlaufen (Inhalte kommen aus den Snapshots)
4. Dashboard → Aktivität öffnen und „Habe ich erledigt"
5. Lernlandkarte: Selbsteinschätzung setzen
6. Merkheft: Notiz anlegen
7. Seite neu laden → Fortschritt/Notiz noch da? (= Supabase-Persistenz ok)
8. Gegenprobe im Supabase Table Editor: `aktivitaet_fortschritt`,
   `lernziel_einschaetzungen`, `einheit_notizen` enthalten Zeilen mit
   deiner Test-User-ID.

## 7. Fehler beheben

Gefundene Fehler hier in Base44 melden → Fix → GitHub-Sync → Workflow
läuft automatisch erneut → nochmal testen.

---

**Bekannte Einschränkungen im Supabase-Modus (gewollt):**
- Keine Live-KI (Brian-Chat, Spracheingabe) – freundlicher Hinweis erscheint.
- Inhalte kommen ausschließlich aus den exportierten Snapshots; fehlt etwas,
  in Base44 „Interne Inhalte erzeugen" + erneut nach Supabase exportieren.