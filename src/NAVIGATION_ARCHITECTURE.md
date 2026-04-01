# Navigation Architecture (Zwei-Ebenen-System)

## Übersicht

Die Navigation wurde in ein **striktes Zwei-Ebenen-System** refaktoriert:

### 1️⃣ **Globale TopBar** (`AppLayout.jsx`)
**Immer sichtbar** — Enthält nur app-weite, globale Elemente.

#### Links:
- Logo "PoolPlaner" + dynamischer Breadcrumb-Pfad
  - Format: `PoolPlaner > [Arbeitsbereich] > [Einheit-Titel]`
  
#### Rechts:
- **Home** (Startseite/Dashboard) — für alle Nutzer
- **Admin-Bereich** (nur für Admins mit `kannBenutzerVerwalten`):
  - Benutzerverwaltung (ShieldCheck-Icon)
  - Einstellungen (DatabaseZap-Icon)
- **Logout** (LogOut-Icon) — für alle Nutzer
- **Role Switcher** (Test-Modus) — für Admins

#### ❌ **ENTFERNT aus der TopBar**:
- ~~Plus-Button (Neue Einheit)~~
- ~~Layout-Umschalter (Struktur/Detail)~~
- ~~Moodle-Export-Button~~
- ~~Workspace-Link~~

---

### 2️⃣ **Lokaler Sub-Header** (`UnitToolbar.jsx`)
**Nur im Workspace-Kontext sichtbar** — Erscheint direkt unter der TopBar.

#### Styling:
- Leichter Grauton (`bg-muted/40`)
- Bottom-Border zum Trennen von der TopBar
- Schmale Höhe (h-10) für kompakte Werkzeugleiste

#### Layout (3 Bereiche):

**LINKS: Ansichts-Umschalter**
- Struktur-Button (LayoutGrid-Icon) — "Struktur-Ansicht"
- Inhalte-Button (SlidersHorizontal-Icon) — "Inhalts-Bearbeitung"
- Beide mit Tooltip

**MITTE: Live-Präsenz**
- `PresenceBadge` mit aktiven Nutzern
- Spacer für responsive Verteilung

**RECHTS: Werkzeuge**
- Einstellungen (Settings-Icon) → `onSettingsOpen()`
- Moodle-Export (Download-Icon) → Link zu `/einheit/export`
- Beide mit Tooltip

---

## Integration in der Workspace-Seite

```jsx
// pages/Workspace.jsx (vereinfacht)
export default function Workspace() {
  const [viewMode, setViewMode] = useState('detail');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedEinheitId, setSelectedEinheitId] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [structLocked, setStructLocked] = useState(false);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* UnitToolbar wird DIREKT unter der TopBar gerendert */}
      <UnitToolbar
        einheit={einheit}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onSettingsOpen={() => setSettingsOpen(true)}
        onlineUsers={onlineUsers}
        structLocked={structLocked}
        currentUserEmail={authUser?.email}
      />

      {/* Hauptinhalt */}
      <main className="flex-1 overflow-hidden">
        {viewMode === 'struktur' ? (
          <StrukturBoardEmbedded {...props} />
        ) : (
          <DetailWorkspace {...props} />
        )}
      </main>

      {/* Settings-Modal */}
      <EinheitSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        einheit={einheit}
        currentUserEmail={authUser?.email}
      />
    </div>
  );
}
```

---

## Tooltip-Implementierung

Alle Icons in **TopBar und UnitToolbar** verwenden die `NavigationTooltip`-Komponente:

```jsx
<NavigationTooltip label="Dein Tooltip-Text">
  <button onClick={handler}>
    <IconName className="w-5 h-5" />
  </button>
</NavigationTooltip>
```

**Eigenschaften:**
- ✅ Verzögerungsfreies On-Hover (sofort sichtbar)
- ✅ Positionierung über/unter dem Element
- ✅ Grauer Hintergrund mit Textkontrast
- ✅ Pfeil-Pointer zum Element

---

## Responsive Verhalten

### TopBar (alle Screen-Größen):
- Logo-Text versteckt auf Mobil (`hidden sm:inline`)
- Icons skaliert für Touch-Geräte (w-10 h-10)

### UnitToolbar (adaptive):
- **Mobil**: Nur Icons sichtbar, Text versteckt (`hidden sm:inline`)
- **Desktop**: Buttons mit Text für bessere Lesbarkeit
- Export-Text nur ab md (`hidden md:inline`)

---

## Migration bestehender Links

| Funktionalität | Alt | Neu |
|---|---|---|
| Neue Einheit | TopBar (Plus-Button) | → Über Workspace-Context oder separates Modal |
| Workspace-Link | TopBar | → Über TopBar oder Dashboard-Navigation |
| Moodle-Export | TopBar (Download) | ✅ UnitToolbar (rechts) |
| Struktur-Toggle | — | ✅ UnitToolbar (links) |
| Präsenz-Anzeige | — | ✅ UnitToolbar (mitte) |
| Einstellungen | — | ✅ UnitToolbar (rechts) |

---

## Technische Details

### `AppLayout.jsx`:
- Globale Navigation mit nur 3 Icon-Gruppen
- Breadcrumb-Logik bleibt erhalten
- `WartungsBanner` oberhalb der TopBar
- Main-Content ohne padding-limit (responsive)

### `UnitToolbar.jsx`:
- Props: `einheit`, `viewMode`, `onViewModeChange`, `onSettingsOpen`, `onlineUsers`, `structLocked`
- Guard: `if (!einheit) return null`
- Alle Icons mit Tooltip
- Navigation-Icons verwenden `NavigationTooltip`

### Höhen-Berechnung:
```
Gesamthöhe im Workspace:
┌─────────────────────────┐ ← WartungsBanner (variabel)
├─────────────────────────┤ ← TopBar (h-16 = 64px)
├─────────────────────────┤ ← UnitToolbar (h-10 = 40px)
└─────────────────────────┘
   ↓ Content (100vh - TopBar - UnitToolbar)
```

---

## Checkliste für Implementierung

- ✅ AppLayout refaktoriert (TopBar nur global)
- ✅ UnitToolbar.jsx neu geschrieben (Sub-Header)
- ✅ Alle Icons mit Tooltips
- ✅ Responsive Design validiert
- ⏳ Workspace-Seite angepasst (integrates UnitToolbar)
- ⏳ Tests auf allen Screen-Größen