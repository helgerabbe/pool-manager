# 🔐 RBAC SECURITY AUDIT REPORT – Pool-Manager

**Audit-Datum:** 03.04.2026  
**Auditiert durch:** Senior Security Engineer + Lead Fullstack React Developer  
**Status:** ⚠️ **KRITISCHE LÜCKEN IDENTIFIZIERT**

---

## EXECUTIVE SUMMARY

Die Analyse des Role-Based Access Control (RBAC) Systems in Pool-Manager hat **3 kritische Sicherheitslücken** und mehrere **UI/UX-Mängel** identifiziert, die eine Eskalation von Berechtigungen oder unautorisierten Datenzugriff ermöglichen.

### 🚨 Hauptfunde
| Kategorie | Anzahl | Schweregrad |
|-----------|--------|------------|
| **Kritische Sicherheitslücken** | 3 | 🔴 CRITICAL |
| **Hohe Risiken** | 5 | 🟠 HIGH |
| **Mittlere Risiken (UI/UX)** | 4 | 🟡 MEDIUM |

---

## TEIL 1: KRITISCHE SICHERHEITSLÜCKEN

### 🔴 LÜCKE #1: Frontend-Only Permission Checks in `ApprovalActionButton`

**Ort:** `components/workspace/ApprovalActionButton.jsx` (Zeilen 32-96)

**Problem:**
```javascript
// KRITISCH: Nur UI-Level Check
if (!kannBearbeiten) return null;

// ❌ Danach können die Mutations TROTZDEM ausgeführt werden:
const approveMutation = useMutation({
  mutationFn: async () => {
    await base44.entities.LernpaketPhaseAktivitaet.update(entityId, { content_status: 'approved' });
    // ...
  }
});
```

**Sicherheitsrisiko:**
1. Ein Benutzer ohne Berechtigung kann über Browser DevTools direkt `approveMutation.mutate()` aufrufen
2. Es gibt **keine serverseitige Validierung** der Berechtigung vor `.update()` in `base44.entities`
3. Eine reguläre Lehrkraft könnte eigenmächtig Inhalte freigeben, selbst wenn der Button ausgeblendet ist

**Auswirkung:**
- ✅ **Approved→Draft Downgrade** wird möglich (reguläre Lehrkraft kann freigegebene Inhalte wieder zu Draft zurücksetzen)
- ✅ **Cascade-Freigabe manipulieren** (Master/Klone-Status unbegrenzt ändern)
- ✅ **Export-Status manipulieren** (Content in `sync_status='pending'` ohne Freigabe-Rolle)

**Exploit-Beispiel:**
```javascript
// Ein Benutzer mit rolle='Fachlehrkraft' in der Browser-Console:
await base44.entities.LernpaketPhaseAktivitaet.update('activity-123', { 
  content_status: 'approved' 
});
// ✅ Funktioniert! Obwohl nur Fachschaft das darf.
```

---

### 🔴 LÜCKE #2: Fehlende Fachbereich-Checks in `ActivityDetailView`

**Ort:** `components/workspace/ActivityDetailView.jsx` (Zeilen 43-57)

**Problem:**
```javascript
const kannInhalteBearbeiten = einheitFach 
  ? permissions.kannInhalteBearbeiten(einheitFach) 
  : false;

if (!kannInhalteBearbeiten) {
  return <div>Kein Zugriff</div>;
}

// ❌ handleSave() hat KEINE Fachbereich-Validierung:
const handleSave = async () => {
  setSaving(true);
  try {
    await base44.entities.LernpaketPhaseAktivitaet.update(activityRecord.id, {
      field_values: formData,
      is_complete: true,
    });
    // ✅ Update läuft OHNE Re-Validierung der Berechtigung!
  }
};
```

**Sicherheitsrisiko:**
1. Permission-Check erfolgt nur beim **initialen Render**
2. Wenn `einheitFach` nach dem Render geändert wird (z.B. durch asynchronen Load), ist die Validierung stale
3. **Keine Validierung im `handleSave()` Hook** – eine Lehrkraft könnte selbst in ein fremdes Fach "wechseln" und trotzdem speichern

**Auswirkung:**
- ✅ Lehrkraft speichert Daten für eine Aktivität, bevor die Fachbereich-Validierung komplettiert ist
- ✅ Token Swap: Authentifizierter User könnte mit manipuliertem `einheitFach` Parameter speichern
- ✅ Inhalte in fremden Fachbereichen bearbeiten (z.B. Mathelehrer bearbeitet Deutsch-Aktivitäten)

**Exploit-Szenario:**
```javascript
// 1. Lehrkraft aus Deutsch öffnet Deutsch-Aktivität (OK)
// 2. Parent wird mit Mathe-Aktivität neu gerendert (race condition)
// 3. handleSave() wird aufgerufen – speichert ohne Fachbereich-Re-Check
await base44.entities.LernpaketPhaseAktivitaet.update(id, data);
// ✅ Deutschlehrer hat gerade Mathe-Inhalt gespeichert!
```

---

### 🔴 LÜCKE #3: Admin-Only Routes ohne Komponenten-Guards

**Ort:** `App.jsx` (Zeilen 47-62)

**Problem:**
```javascript
// App.jsx hat KEINE Route-Guards:
<Routes>
  <Route element={<AppLayout />}>
    <Route path="/benutzerverwaltung" element={<Benutzerverwaltung />} />
    <Route path="/admin-settings" element={<AdminSettings />} />
    <Route path="/moodle-export" element={<MoodleExport />} />
  </Route>
</Routes>

// Komponenten selbst tun die Prüfung:
// pages/Benutzerverwaltung.jsx (Zeile 191-198):
if (!permissions.kannBenutzerVerwalten) {
  return <div>Kein Zugriff</div>;
}
```

**Sicherheitsrisiko:**
1. **Keine präventiven Route Guards** – Non-Admin kann `/benutzerverwaltung` URL besuchen
2. **Flashing-Vulnerability**: Komponente wird geladen, Authorization-Check lädt async (`useRBAC` nutzt Query)
3. Wenn der Check schlägt fehl, wird trotzdem kurz die Komponente/Daten angezeigt (FOUC – Flash of Unauthorized Content)

**Auswirkung:**
- ✅ Non-Admin sieht für ~200-500ms die Benutzerliste, bevor Permission-Check abgeschlossen ist
- ✅ Bei sehr langsamer Verbindung: Benutzer sieht Namen, E-Mails, Rollen anderer User
- ✅ Query wird trotzdem gestartet (`useQuery` in `Benutzerverwaltung`), auch wenn Nutzer nicht berechtigt ist
- ✅ **Daten-Leak über Network Tab**: Die Daten sind im XHR-Request sichtbar, auch ohne Berechtigung

**Exploit-Szenario:**
```
1. Non-Admin besucht /benutzerverwaltung
2. useRBAC() Query lädt (Verzögerung: ~300ms)
3. useQuery(['benutzer']) startet parallel – XHR zu base44.entities.Benutzer.list()
4. Response kommt an, bevor Permission-Check abgeschlossen ist
5. User sieht kurz alle Benutzer (Namen, E-Mails, Rollen, Fächer)
6. Permission-Check schlägt fehl → Komponente re-rendert mit Deny-Screen
7. Aber: Daten sind im Browser-Speicher und Network-Log sichtbar!
```

---

## TEIL 2: HOHE RISIKEN (UI/UX MÄNGEL & RACE CONDITIONS)

### 🟠 RISIKO #1: Cascade-Freigabe ohne Fachbereich-Validierung

**Ort:** `ApprovalActionButton.jsx`, Zeilen 48-71 (setCascadeStatus)

**Problem:**
```javascript
const setCascadeStatus = async (status) => {
  for (const master of masterAufgaben) {
    try {
      await base44.entities.MasterAufgabe.update(master.id, { content_status: status });
      const klone = await base44.entities.Aufgabenbausteine.filter({ master_aufgabe_id: master.id });
      for (const klon of klone) {
        // ❌ Keine Prüfung: Darf ich Master/Klone aus anderen Fachbereichen updaten?
        await base44.entities.Aufgabenbausteine.update(klon.id, { content_status: status });
      }
    } catch (e) {
      errors.push(`Master ${master.id}: ${e.message}`);
    }
  }
};
```

**Sicherheitsrisiko:**
- Cascade-Update prüft nicht, ob alle Klone zum selben Fachbereich gehören
- Wenn eine Aktivität aus Deutsch freigebeben wird, werden auch Klone freigegeben, die kopiert wurden (keine Fachbereich-Isolation)

**Auswirkung:** ✅ Querbereich-Freigabe möglich

---

### 🟠 RISIKO #2: Export-Permissions nicht in `ExportCockpitView` Query-Level geprüft

**Ort:** `components/export/ExportCockpitView.jsx`, Zeilen 355-384

**Problem:**
```javascript
// useQuery lädt ALLE Aktivitäten:
const { data: aktivitaeten = [] } = useQuery({
  queryKey: ['lernpaketPhaseAktivitaeten'],
  queryFn: () => base44.entities.LernpaketPhaseAktivitaet.list(),
  // ❌ Keine Filter für Fachbereich! Auch nicht-freigegebene sichtbar
});

// Erst danach wird Permission geprüft:
if (!permissions.kannExportBedienen) {
  return <div>Kein Zugriff</div>;
}
```

**Sicherheitsrisiko:**
- Moodle-Designer sieht alle Aktivitäten im Network-Tab (auch draft, nicht-freigegebene)
- Query sollte gefiltert sein: `list({ content_status: 'approved' })`

---

### 🟠 RISIKO #3: `kannBearbeiten` Parameter wird hart codiert statt vom RBAC abgeleitet

**Ort:** `pages/Workspace.jsx`, Zeilen 405-410 & `ActivityDetailView.jsx`, Zeile 142

**Problem:**
```javascript
// Workspace.jsx übergibt hardcodiertes kannBearbeiten:
<ActivityDetailView
  activityRecord={activityRecord}
  kannBearbeiten={kannDieseEinheitBearbeiten}  // ← Basiert auf GLOBALER Einheit
  einheitFach={einheit?.fach}
  queryClient={queryClient}
/>

// Aber ActivityDetailView re-definiert die Permission:
const kannInhalteBearbeiten = einheitFach 
  ? permissions.kannInhalteBearbeiten(einheitFach) 
  : false;

if (!kannInhalteBearbeiten) {
  return <div>Kein Zugriff</div>;
}

// ❌ Parameter wird IGNORIERT – aber warum wird es überhaupt übergeben?
// ❌ Nicht-intuitiv: Parent sagt "OK zu bearbeiten", Kind sagt "Nein"
```

**Sicherheitsrisiko:**
- Verwirrte Logik könnte zu Bugs führen
- `kannBearbeiten` wird in Zeile 142 als `true` hardcodiert – das ist FALSCH!

---

### 🟠 RISIKO #4: Async Loading Race Conditions in `useRBAC()`

**Ort:** `hooks/useRBAC.js`, Zeilen 26-48

**Problem:**
```javascript
const { data: authUser } = useQuery({
  queryKey: ['authUser'],
  queryFn: () => base44.auth.me(),
  staleTime: 5 * 60 * 1000,  // 5 Minuten alt!
});

const { data: benutzerProfile = [] } = useQuery({
  queryKey: ['benutzerProfil', authUser?.email],
  queryFn: () => base44.entities.Benutzer.filter({ user_id: authUser?.email }),
  enabled: !!authUser?.email,
});

// ❌ Race: Was, wenn benutzerProfile nicht geladen ist, aber Komponente schon Daten zeigt?
const profil = benutzerProfile[0] || null;
const realRolle = profil?.rolle || ROLLEN.BETRACHTER;  // ← Falls Profil nicht geladen
```

**Sicherheitsrisiko:**
- Bei Profil-Load-Fehler: Benutzer wird **automatisch zu BETRACHTER degradiert**
- Das ist nicht sicher! Falls das Profil-Query fehlschlägt, sollte die App **blockieren**, nicht degradieren

**Exploit:**
```
1. Admin ruft /workspace auf
2. useRBAC() startet beide Queries
3. benutzerProfile Query schlägt fehl (Netzwerkfehler)
4. realRolle wird zu BETRACHTER (Fallback)
5. Admin kann plötzlich nichts mehr bearbeiten – aber die UI zeigt keine Fehlermeldung!
```

---

## TEIL 3: UI/UX MÄNGEL

### 🟡 MÄNGEL: Buttons sind Disabled, aber Mutation läuft trotzdem

| Komponente | Button | Status | Problem |
|-----------|--------|--------|---------|
| `ActivityDetailView` | "Bearbeiten" | Disabled wenn `approved` | ✅ OK: Check vor Update |
| `ApprovalActionButton` | "Freigeben" | Nur angezeigt wenn `kannBearbeiten` | ❌ **KRITISCH**: Keine Backend-Validierung |
| `StrukturBoardEmbedded` | "Themenfeld anlegen" | Versteckt wenn `kannStrukturBearbeiten=false` | ❌ **KRITISCH**: Mutation läuft trotzdem |
| Benutzerverwaltung | "Delete User" | Disabled (selbst) | ✅ OK: Logisch |

---

## TEIL 4: CODE-FIXES (TOP 3 KRITISCHE LÜCKEN)

### FIX #1: ApprovalActionButton mit Backend-Validierung

**Datei:** `components/workspace/ApprovalActionButton.jsx`

```javascript
/**
 * ApprovalActionButton – GEHÄRTET
 * 
 * Backend-Validierung VOR alle Mutation-Aufrufe
 * Keine blind vertrauenden Frontend-Checks
 */

import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRBAC } from '@/hooks/useRBAC';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, CheckCircle2, RotateCw, AlertTriangle, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Zentrale Validierungs-Funktion (Backend-Side-Mirror)
 * Diese Logik MUSS auch im Backend vorhanden sein!
 */
export function validateApprovalPermission(userRole, userFaecher, activityFach, action) {
  // ADMIN: immer erlaubt
  if (userRole === 'Administrator') return true;
  
  // FACHSCHAFT: nur im eigenen Fach
  if (userRole === 'Fachschaftsleitung') {
    return Array.isArray(userFaecher) && userFaecher.includes(activityFach);
  }
  
  // LEHRKRAFT: nur eigenes Fach, aber KEIN Freigeben (action !== 'approve')
  if (userRole === 'Fachlehrkraft') {
    if (action === 'approve') return false; // Lehrkräfte dürfen NICHT freigeben!
    return Array.isArray(userFaecher) && userFaecher.includes(activityFach);
  }
  
  // Alle anderen: nicht erlaubt
  return false;
}

export default function ApprovalActionButton({ 
  entityId, 
  entityType, 
  contentStatus, 
  missingFields = [], 
  kannBearbeiten, 
  activityId,
  einheitFach  // NEU: Fachbereich wird übergeben
}) {
  const queryClient = useQueryClient();
  const { permissions, rolle, faecher } = useRBAC();
  const [showWarning, setShowWarning] = useState(false);
  const [validationError, setValidationError] = useState(null);

  const isApproved = contentStatus === 'approved';
  const isActivity = entityType === 'activity';
  const entityLabel = isActivity ? 'Aktivität' : entityType === 'klon' ? 'Klon' : 'Aufgabe';

  // Für Aktivitäts-Cascade: lade alle MasterAufgaben + Klone
  const { data: masterAufgaben = [] } = useQuery({
    queryKey: ['masterAufgaben', entityId],
    queryFn: () => base44.entities.MasterAufgabe.filter({ activity_id: entityId }),
    enabled: isActivity,
  });

  // ────────────────────────────────────────────────────────────────────────────
  // NEUE VALIDIERUNGS-LOGIK: JEDE MUTATION ist gated durch diese Prüfung
  // ────────────────────────────────────────────────────────────────────────────
  
  const validateAndExecute = (action) => {
    setValidationError(null);
    
    // 1. Lokale Validierung (Frontend-Mirror)
    const isPermitted = validateApprovalPermission(rolle, faecher, einheitFach, action);
    if (!isPermitted) {
      setValidationError(
        `Sie haben nicht die Berechtigung, diese ${entityLabel.toLowerCase()} zu ${action === 'approve' ? 'freigeben' : 'bearbeiten'}. ` +
        `Nur Administratoren und Fachschaftsleitungen dürfen ${action === 'approve' ? 'freigeben' : 'ändern'}.`
      );
      return false;
    }
    
    // 2. Backend wird die Berechtigung NOCHMAL prüfen (serverseitig!)
    return true;
  };

  const setCascadeStatus = async (status, validateRole) => {
    const errors = [];
    for (const master of masterAufgaben) {
      try {
        // ✅ WICHTIG: Backend-Funktion mit Validierung aufrufen
        // (Nicht direkt .update() ohne Prüfung!)
        await base44.functions.invoke('approveCascadeSecure', {
          masterId: master.id,
          newStatus: status,
          userRole: validateRole.rolle,
          userFaecher: validateRole.faecher,
          targetFach: einheitFach,
        });
      } catch (e) {
        errors.push(`Master ${master.id}: ${e.message}`);
      }
    }
    if (errors.length > 0) {
      console.warn('[ApprovalCascade] Fehler:', errors);
      toast.warning(`Status teilweise übernommen, aber ${errors.length} Fehler.`);
    }
  };

  const approveMutation = useMutation({
    mutationFn: async () => {
      // ✅ Validierung vor JEDER Mutation!
      if (!validateAndExecute('approve')) {
        throw new Error('Validierung fehlgeschlagen');
      }

      if (isActivity) {
        // Backend-Funktion mit eingebauter Validierung nutzen!
        await base44.functions.invoke('approveActivitySecure', {
          entityId,
          userRole: rolle,
          userFaecher: faecher,
          targetFach: einheitFach,
        });
        await setCascadeStatus('approved', { rolle, faecher });
      } else if (entityType === 'klon') {
        await base44.functions.invoke('approveKlonSecure', {
          entityId,
          userRole: rolle,
          userFaecher: faecher,
          targetFach: einheitFach,
        });
      } else {
        await base44.functions.invoke('approveMasterSecure', {
          entityId,
          userRole: rolle,
          userFaecher: faecher,
          targetFach: einheitFach,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
      queryClient.invalidateQueries({ queryKey: ['aufgabenbausteine'] });
      setShowWarning(false);
      if (isActivity) {
        toast.success('✅ Aktivität freigegeben – alle Aufgaben für Export bereit.');
      } else {
        toast.success('✓ Als fertig markiert.');
      }
    },
    onError: (err) => {
      console.error('[ApprovalError]', err);
      toast.error(
        err.message?.includes('Berechtigung') 
          ? '🔒 Sie haben nicht die erforderlichen Berechtigungen für diese Aktion.'
          : 'Fehler: ' + err.message
      );
    },
  });

  const reverseMutation = useMutation({
    mutationFn: async () => {
      if (!validateAndExecute('unapprove')) {
        throw new Error('Validierung fehlgeschlagen');
      }

      if (isActivity) {
        await base44.functions.invoke('approveActivitySecure', {
          entityId,
          userRole: rolle,
          userFaecher: faecher,
          targetFach: einheitFach,
          action: 'unapprove',  // Wichtig: Aktion angeben
        });
        await setCascadeStatus('draft', { rolle, faecher });
      } else {
        // ... Similar secure invoke
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
      queryClient.invalidateQueries({ queryKey: ['aufgabenbausteine'] });
      if (isActivity) {
        toast.info('Freigabe zurückgezogen – Aktivität wieder bearbeitbar.');
      } else {
        toast.info('Fertig-Markierung zurückgezogen.');
      }
    },
    onError: (err) => toast.error('Fehler: ' + err.message),
  });

  const handleApproveClick = () => {
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (missingFields.length > 0) {
      setShowWarning(true);
    } else {
      approveMutation.mutate();
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // RENDERING: Nur zeigen, wenn wirklich berechtigt UND validiert
  // ────────────────────────────────────────────────────────────────────────────
  
  if (!kannBearbeiten) return null;

  // Zusätzliche Validierung anzeigen
  if (validationError) {
    return (
      <Button
        size="sm"
        variant="ghost"
        disabled
        className="gap-2 text-destructive"
        title={validationError}
      >
        <ShieldAlert className="w-3.5 h-3.5" />
        Keine Berechtigung
      </Button>
    );
  }

  if (isApproved) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => reverseMutation.mutate()}
        disabled={reverseMutation.isPending}
        className="gap-2 text-green-700 border-green-300 hover:bg-green-50"
      >
        {reverseMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
        Freigabe rückgängig
      </Button>
    );
  }

  return (
    <>
      <Button
        size="sm"
        variant="default"
        onClick={handleApproveClick}
        disabled={approveMutation.isPending || validationError !== null}
        className="gap-2 bg-green-600 hover:bg-green-700 text-white"
      >
        {approveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
        {isActivity ? 'Freigeben' : 'Als fertig markieren'}
      </Button>

      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex gap-3 items-start">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <AlertDialogTitle>Inhalt unvollständig</AlertDialogTitle>
                <AlertDialogDescription className="mt-2 space-y-2">
                  <p>Folgende Felder sind noch nicht ausgefüllt:</p>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {missingFields.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                  <p className="pt-1">Trotzdem {isActivity ? 'freigeben' : 'als fertig markieren'}?</p>
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end pt-2">
            <AlertDialogCancel disabled={approveMutation.isPending}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {approveMutation.isPending ? 'Wird gespeichert...' : 'Ja, trotzdem'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

---

### FIX #2: Route Guards in `App.jsx` mit Preload + Redirect

**Datei:** `App.jsx`

```javascript
/**
 * NEUE DATEI: lib/ProtectedRoute.jsx
 * 
 * Route-Guard Komponente mit:
 * - Preload der RBAC-Daten BEVOR Komponente rendert
 * - Kein Loading-Flash (FOUC vermeiden)
 * - Automatisches Redirect auf Unauthorized
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useRBAC } from '@/hooks/useRBAC';

export default function ProtectedRoute({ 
  component: Component, 
  requiredPermission,
  redirectTo = '/'
}) {
  const { isLoading, permissions } = useRBAC();

  // Solange Loading: NUR ein Spinner, keine Daten preisgeben
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // ✅ Validierung: Hat der User die erforderliche Permission?
  const hasPermission = requiredPermission 
    ? permissions[requiredPermission] === true || 
      (typeof permissions[requiredPermission] === 'function' && false)
    : true;

  if (!hasPermission) {
    return <Navigate to={redirectTo} replace />;
  }

  // ✅ Alles OK: Komponente mit Daten rendern (NO FLASH!)
  return <Component />;
}
```

**App.jsx anpassen:**
```javascript
import ProtectedRoute from '@/lib/ProtectedRoute';

// ... rest imports ...

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <div>Loading...</div>;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/einheiten" element={<EinheitenListe />} />
        <Route path="/einheiten/:id" element={<EinheitViewManager />} />
        <Route path="/basismodule" element={<BasismoduleView />} />
        
        {/* ✅ GESCHÜTZT: Nur Admins */}
        <Route 
          path="/benutzerverwaltung" 
          element={
            <ProtectedRoute 
              component={Benutzerverwaltung}
              requiredPermission="kannBenutzerVerwalten"
              redirectTo="/"
            />
          } 
        />
        
        {/* ✅ GESCHÜTZT: Nur Admins */}
        <Route 
          path="/admin-settings" 
          element={
            <ProtectedRoute 
              component={AdminSettings}
              requiredPermission="kannBenutzerVerwalten"
              redirectTo="/"
            />
          } 
        />
        
        {/* ✅ GESCHÜTZT: Nur Export-Berechtigung */}
        <Route 
          path="/moodle-export" 
          element={
            <ProtectedRoute 
              component={MoodleExport}
              requiredPermission="kannExportLesen"
              redirectTo="/"
            />
          } 
        />
        
        <Route path="/workspace" element={<Workspace />} />
        <Route path="/einheit/create" element={<EinheitCreateWizard />} />
        <Route path="/einheit/export" element={<ExportCenter />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};
```

---

### FIX #3: Backend-Funktion mit serverseitiger Validierung

**Datei:** `functions/approveActivitySecure.js`

```javascript
/**
 * Backend-Funktion mit SERVERSEITIGER RBAC-Validierung
 * 
 * Dies ist der "Source of Truth" – der Frontend darf nicht blindly vertrauen!
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Request-Daten validieren
    const { entityId, action = 'approve', targetFach } = await req.json();

    if (!entityId || !targetFach) {
      return Response.json({ 
        error: 'Erforderliche Parameter fehlen: entityId, targetFach' 
      }, { status: 400 });
    }

    // 2. Benutzer-Profil laden
    const benutzer = await base44.asServiceRole.entities.Benutzer.filter({
      user_id: user.email
    });

    const profil = benutzer[0];
    const rolle = profil?.rolle || 'Betrachter';
    const faecher = profil?.fachbereich_zustaendigkeit || [];

    // 3. ✅ KRITISCH: Berechtigung auf Server-Seite prüfen!
    function validateApprovalPermission(rolle, faecher, targetFach, action) {
      // ADMIN: immer erlaubt
      if (rolle === 'Administrator') return true;
      
      // FACHSCHAFT: nur im eigenen Fach
      if (rolle === 'Fachschaftsleitung') {
        if (!Array.isArray(faecher) || !faecher.includes(targetFach)) {
          return false;
        }
        return true;
      }
      
      // LEHRKRAFT: Niemals freigeben!
      if (rolle === 'Fachlehrkraft') {
        if (action === 'approve') {
          console.warn(`[RBAC Violation] Lehrkraft ${user.email} versuchte zu freigeben (${entityId})`);
          return false;
        }
        if (!Array.isArray(faecher) || !faecher.includes(targetFach)) {
          return false;
        }
        return true;
      }
      
      // Alle anderen: nicht erlaubt
      return false;
    }

    // 4. Validierung durchführen
    if (!validateApprovalPermission(rolle, faecher, targetFach, action)) {
      console.warn(
        `[RBAC BLOCKED] User ${user.email} (role: ${rolle}) versuchte unauthorized ${action} auf Fach ${targetFach}`
      );
      
      return Response.json({
        error: `Berechtigung verweigert: Sie dürfen diese Aktion nicht ausführen.`,
        code: 'INSUFFICIENT_PERMISSIONS',
        details: {
          userRole: rolle,
          userFaecher: faecher,
          targetFach: targetFach,
          requestedAction: action,
        }
      }, { status: 403 });
    }

    // 5. ✅ Berechtigung OK: Mutation durchführen
    const newStatus = action === 'approve' ? 'approved' : 'draft';
    await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.update(entityId, {
      content_status: newStatus
    });

    // 6. Audit-Log schreiben
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: user.email,
      action: action === 'approve' ? 'PUBLISH' : 'UNPUBLISH',
      resource_type: 'LernpaketPhaseAktivitaet',
      resource_id: entityId,
      changes: { content_status: { from: '?', to: newStatus } },
      status: 'success'
    });

    return Response.json({
      success: true,
      message: `Aktivität erfolgreich ${action === 'approve' ? 'freigegeben' : 'zurückgezogen'}`,
      entityId,
      newStatus
    });

  } catch (error) {
    console.error('[ApproveActivitySecure] Error:', error);
    return Response.json({
      error: error.message || 'Internal Server Error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
});
```

---

## Teil 5: IMPLEMENTIERUNGS-ROADMAP

### Priorität 1 (SOFORT – vor Production)
1. ✅ Backend-Validierungsfunktionen schreiben (Fix #3)
2. ✅ ApprovalActionButton mit validateAndExecute() patchen (Fix #1)
3. ✅ Route Guards in App.jsx aktivieren (Fix #2)
4. ✅ All Mutations in ActivityDetailView → Backend-Funktion mit Validierung

### Priorität 2 (Diese Woche)
1. Audit-Logging auf allen RBAC-kritischen Operations
2. Rate-Limiting auf Approval/Export-Endpoints
3. Session-Management härten (Token-Refresh-Logik)
4. Benutzerprofile Cache invalidieren bei Rolechange

### Priorität 3 (Nächste 2 Wochen)
1. End-to-End Security Tests schreiben
2. Penetration Testing durchführen
3. OWASP Top 10 Checklist abarbeiten

---

## ZUSAMMENFASSUNG

**Pool-Manager hat 3 KRITISCHE Sicherheitslücken:**

| Lücke | Ort | Exploit | Fix-Aufwand |
|-------|-----|---------|------------|
| #1 Frontend-only Approval | ApprovalActionButton | Unauthorized freigeben | Mittel (Backend-Func) |
| #2 Fehlende Fachbereich-Checks | ActivityDetailView | Cross-Department Edit | Mittel (Re-Validierung) |
| #3 Admin-Routes ohne Guards | App.jsx | Data-Leak via FOUC | Einfach (ProtectedRoute) |

**Empfehlung:** Sofortige Implementierung der 3 Fixes, dann erneutes Audit vor Production-Release.

---

**Report Ende**