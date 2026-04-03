import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Puzzle, Lock, Unlock, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { useResourceLock, isLockedByOther as checkLockedByOther, isLockExpired } from '@/hooks/useResourceLock';

const bausteinColors = {
  'Pre-Test': 'bg-yellow-100 text-yellow-700',
  'Input': 'bg-blue-100 text-blue-700',
  'Ebene-1-Übung': 'bg-green-100 text-green-700',
  'Ebene-2-Aufgabe': 'bg-cyan-100 text-cyan-700',
  'Ebene-3-Projekt': 'bg-purple-100 text-purple-700',
  'Exit-Check': 'bg-orange-100 text-orange-700',
  'Prüfung Typ A': 'bg-red-100 text-red-700',
  'Prüfung Typ B': 'bg-red-100 text-red-700',
  'Prüfung Typ C': 'bg-red-100 text-red-700',
};

/**
 * Aufgabenbaustein-Karte mit integrierter Record-Lock-Logik.
 *
 * Props:
 *  aufgabe         — Datensatz
 *  userEmail       — E-Mail des aktuellen Users
 *  kannBearbeiten  — RBAC-Permission
 *  kannLoeschen    — RBAC-Permission
 *  istAdmin        — für Force-Release-Anzeige
 *  onDelete        — Callback
 *  onLockAcquired  — Callback wenn Lock erfolgreich gesetzt (Edit-Modus öffnen)
 */
export default function AufgabenbausteintCard({
  aufgabe,
  userEmail,
  kannBearbeiten,
  kannLoeschen,
  istAdmin,
  onDelete,
  onLockAcquired,
}) {
  const [lockError, setLockError] = useState(false);

  const handleLockDenied = (winnerEmail) => {
    setLockError(true);
    setTimeout(() => setLockError(false), 4000);
    // Sofort UI invalidieren damit der neue Sperrer angezeigt wird
  };

  // active=false: die Karte selbst hält keinen aktiven Edit-Mode –
  // Lock-Erwerb erfolgt manuell via handleEditClick
  const { acquireLock, releaseLock, forceReleaseLock } = useResourceLock(
    'Aufgabenbausteine',
    ['aufgaben', 'aufgabenbausteine', 'klone'],
    aufgabe.id,
    userEmail,
    false,
    handleLockDenied
  );

  const lockedByOther = checkLockedByOther(aufgabe, userEmail);
  const lockedByMe = aufgabe.lock_status && aufgabe.locked_by_user === userEmail && !isLockExpired(aufgabe.locked_at);

  const handleEditClick = async () => {
    setLockError(false);
    const success = await acquireLock();
    if (success) {
      onLockAcquired?.(aufgabe.id);
    }
    // Falls kein success: handleLockDenied wurde bereits vom Hook aufgerufen
  };

  const handleRelease = async () => {
    await releaseLock();
  };

  const handleForceRelease = async () => {
    await forceReleaseLock();
  };

  return (
    <div className={`relative flex items-start gap-2 p-3 rounded-lg border transition-all group ${
      lockedByOther
        ? 'bg-amber-50 border-amber-200'
        : lockedByMe
        ? 'bg-primary/5 border-primary/30'
        : 'bg-muted/40 border-transparent hover:border-border'
    }`}>
      <Puzzle className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />

      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Typ + Lock-Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={`text-[10px] ${bausteinColors[aufgabe.baustein_typ] || 'bg-muted text-muted-foreground'}`}>
            {aufgabe.baustein_typ}
          </Badge>

          {lockedByOther && (
            <span className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
              <Lock className="w-3 h-3" />
              Gesperrt von {aufgabe.locked_by_user}
            </span>
          )}
          {lockedByMe && (
            <span className="flex items-center gap-1 text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
              <Lock className="w-3 h-3" />
              Von mir bearbeitet
            </span>
          )}
        </div>

        {/* Inhalt */}
        {aufgabe.aufgabentext_inhalt && (
          <p className="text-sm text-muted-foreground line-clamp-2">{aufgabe.aufgabentext_inhalt}</p>
        )}

        {/* Lock-Error */}
        {lockError && (
          <p className="text-xs text-amber-700 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Kann nicht bearbeitet werden – aktuell von {aufgabe.locked_by_user} gesperrt.
          </p>
        )}
      </div>

      {/* Aktionen */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {kannBearbeiten && !lockedByOther && !lockedByMe && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleEditClick} title="Bearbeiten">
            <Edit className="w-3.5 h-3.5" />
          </Button>
        )}
        {lockedByMe && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={handleRelease} title="Bearbeitung abschließen">
            <Unlock className="w-3.5 h-3.5" />
          </Button>
        )}
        {istAdmin && lockedByOther && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" onClick={handleForceRelease} title="Lock als Admin aufheben">
            <Unlock className="w-3.5 h-3.5" />
          </Button>
        )}
        {kannLoeschen && !lockedByOther && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete?.(aufgabe.id)} title="Löschen">
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  );
}