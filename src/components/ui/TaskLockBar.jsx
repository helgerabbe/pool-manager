/**
 * TaskLockBar.jsx
 *
 * Zeigt im Detail-Panel den Bearbeitungsmodus-Status an:
 * - Leseansicht + "Bearbeiten"-Button
 * - Aktiver Bearbeitungsmodus mit "Speichern"/"Abbrechen"
 * - Gesperrt-Hinweis, wenn ein anderer Nutzer bearbeitet
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Lock, Loader2, X, Save } from 'lucide-react';

export default function TaskLockBar({
  isEditMode,
  isLocking,
  isLockedByOther,
  lockedByEmail,
  onEdit,
  onSave,
  onCancel,
  isSaving = false,
  canEdit = true,
}) {
  if (!canEdit) return null;

  if (isLockedByOther) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border-b border-orange-200">
        <Lock className="w-4 h-4 text-orange-500 shrink-0" />
        <span className="text-xs text-orange-700 flex-1">
          Wird gerade bearbeitet von <strong>{lockedByEmail}</strong>
        </span>
        <Badge className="bg-orange-100 text-orange-700 border border-orange-300 text-[10px]">
          Schreibgeschützt
        </Badge>
      </div>
    );
  }

  if (isEditMode) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border-b border-primary/20">
        <Badge className="bg-primary/10 text-primary border border-primary/30 text-[10px]">
          Bearbeitungsmodus aktiv
        </Badge>
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="gap-1.5 h-7 text-xs"
          disabled={isSaving}
        >
          <X className="w-3.5 h-3.5" />
          Abbrechen
        </Button>
        {onSave && (
          <Button
            size="sm"
            onClick={onSave}
            className="gap-1.5 h-7 text-xs"
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Speichern & Schließen
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b border-border">
      <span className="text-xs text-muted-foreground flex-1">Leseansicht – keine Änderungen möglich</span>
      <Button
        size="sm"
        variant="outline"
        onClick={onEdit}
        disabled={isLocking}
        className="gap-1.5 h-7 text-xs"
      >
        {isLocking ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Edit className="w-3.5 h-3.5" />
        )}
        Aufgabe bearbeiten
      </Button>
    </div>
  );
}