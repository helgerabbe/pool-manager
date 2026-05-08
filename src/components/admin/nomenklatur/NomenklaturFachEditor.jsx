/**
 * NomenklaturFachEditor.jsx
 *
 * Editor für ein einzelnes Fach: Definitionen-Grid + globaler Stil-Editor.
 * Hält den lokalen Draft-State und liefert über `onDirtyChange` Bescheid,
 * sobald sich etwas vom gespeicherten Stand unterscheidet — der Parent
 * (NomenklaturManagerView) braucht das für das UnsavedChangesModal beim
 * Fachwechsel.
 */
import React, { useEffect, useMemo, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Save, Loader2, Info } from 'lucide-react';
import NomenklaturDefinitionRow from './NomenklaturDefinitionRow';

const MAX_STYLE_LEN = 2000;
const MAX_CONVENTIONS = 100;

function emptyDef() {
  return { key: '', value: '' };
}

function normalizeForCompare(state) {
  // Vergleichbare Form: trim + leere Defs raus + nach key sortiert.
  return {
    conventions: (state.conventions || [])
      .map((c) => ({ key: (c.key || '').trim(), value: (c.value || '').trim() }))
      .filter((c) => c.key || c.value)
      .sort((a, b) => a.key.localeCompare(b.key)),
    global_style: (state.global_style || '').trim(),
    ist_aktiv: state.ist_aktiv !== false,
  };
}

function statesEqual(a, b) {
  return JSON.stringify(normalizeForCompare(a)) === JSON.stringify(normalizeForCompare(b));
}

const NomenklaturFachEditor = forwardRef(function NomenklaturFachEditor(
  { fach, record, onSave, isSaving, disabled, onDirtyChange },
  ref
) {
  const initialState = useMemo(() => ({
    conventions: record?.conventions?.length ? record.conventions.map((c) => ({ ...c })) : [],
    global_style: record?.global_style || '',
    ist_aktiv: record?.ist_aktiv !== false,
  }), [record]);

  const [draft, setDraft] = useState(initialState);
  const [autoFocusIdx, setAutoFocusIdx] = useState(-1);

  // Wenn der Record (z. B. nach Save oder Fach-Wechsel) wechselt, Draft resetten.
  useEffect(() => {
    setDraft(initialState);
    setAutoFocusIdx(-1);
  }, [initialState]);

  const isDirty = useMemo(() => !statesEqual(draft, initialState), [draft, initialState]);

  useEffect(() => {
    if (onDirtyChange) onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleRowChange = (idx, next) => {
    setDraft((d) => {
      const arr = [...d.conventions];
      arr[idx] = next;
      return { ...d, conventions: arr };
    });
  };

  const handleRowRemove = (idx) => {
    setDraft((d) => {
      const arr = [...d.conventions];
      arr.splice(idx, 1);
      return { ...d, conventions: arr };
    });
  };

  const handleAdd = () => {
    if (draft.conventions.length >= MAX_CONVENTIONS) return;
    setDraft((d) => ({ ...d, conventions: [...d.conventions, emptyDef()] }));
    setAutoFocusIdx(draft.conventions.length);
  };

  const handleSave = useCallback(async () => {
    // Leere Defs werden serverseitig gefiltert — wir senden den Draft 1:1.
    await onSave({
      fach,
      conventions: draft.conventions,
      global_style: draft.global_style,
      ist_aktiv: draft.ist_aktiv,
    });
  }, [draft, fach, onSave]);

  // Parent-Hook: damit der Manager das UnsavedChangesModal mit "Speichern und wechseln"
  // unterstützen kann.
  useImperativeHandle(ref, () => ({
    isDirty: () => isDirty,
    save: handleSave,
    discard: () => setDraft(initialState),
  }), [isDirty, handleSave, initialState]);

  return (
    <div className="space-y-6">
      {/* Definitionen */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Definitionen</Label>
          <span className="text-xs text-muted-foreground">
            {draft.conventions.length} / {MAX_CONVENTIONS}
          </span>
        </div>

        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-1 text-xs font-medium text-muted-foreground">
          <span>Begriff / Variable</span>
          <span>Konvention / Schreibweise</span>
          <span className="w-9" />
        </div>

        <div className="space-y-2">
          {draft.conventions.length === 0 ? (
            <div className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
              Noch keine Konventionen für dieses Fach hinterlegt.
            </div>
          ) : (
            draft.conventions.map((def, idx) => (
              <NomenklaturDefinitionRow
                key={idx}
                definition={def}
                index={idx}
                onChange={handleRowChange}
                onRemove={handleRowRemove}
                disabled={disabled}
                autoFocusKey={idx === autoFocusIdx}
              />
            ))
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={disabled || draft.conventions.length >= MAX_CONVENTIONS}
          className="gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Eintrag hinzufügen
        </Button>
      </div>

      {/* Globaler Stil */}
      <div className="space-y-2">
        <Label htmlFor={`global_style_${fach}`} className="text-sm font-semibold">
          Globaler Stil ({fach})
        </Label>
        <Textarea
          id={`global_style_${fach}`}
          value={draft.global_style}
          onChange={(e) => setDraft((d) => ({ ...d, global_style: e.target.value }))}
          placeholder='z.B. "Ergebnisse immer auf zwei Nachkommastellen runden. Bei Brüchen immer die gekürzte Form verwenden."'
          rows={4}
          maxLength={MAX_STYLE_LEN}
          disabled={disabled}
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Info className="w-3 h-3" />
            Übergreifende Regeln, die in allen Aufgaben dieses Fachs gelten.
          </span>
          <span>{draft.global_style.length} / {MAX_STYLE_LEN}</span>
        </div>
      </div>

      {/* Speichern */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t">
        {isDirty && (
          <span className="text-xs text-amber-600 mr-auto">Ungespeicherte Änderungen</span>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => setDraft(initialState)}
          disabled={!isDirty || isSaving || disabled}
        >
          Verwerfen
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || isSaving || disabled}
          className="gap-1.5"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Speichern
        </Button>
      </div>
    </div>
  );
});

export default NomenklaturFachEditor;