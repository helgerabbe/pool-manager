/**
 * NomenklaturManagerView.jsx
 *
 * Tab-Wrapper für den Nomenklatur-Manager (AP2).
 * Pro Fach EIN Datensatz in `SchulNomenklatur`. Beim Fachwechsel:
 * UnsavedChangesModal, falls der Editor dirty ist (Datenverlust verhindern).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Languages, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useSchulNomenklatur } from '@/hooks/useSchulNomenklatur';
import NomenklaturFachEditor from './NomenklaturFachEditor';

export default function NomenklaturManagerView() {
  const { records, isLoading, isSaving, save, getByFach } = useSchulNomenklatur();

  const { data: faecher = [] } = useQuery({
    queryKey: ['lookupFaecher'],
    queryFn: () => base44.entities.LookupFaecher.list('reihenfolge', 200),
  });

  const aktiveFaecher = useMemo(
    () => faecher.filter((f) => f.ist_aktiv !== false).sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0)),
    [faecher]
  );

  const [selectedFach, setSelectedFach] = useState(null);
  const [pendingFach, setPendingFach] = useState(null); // angefragter Wechsel, der noch bestätigt werden muss
  const [isDirty, setIsDirty] = useState(false);
  const editorRef = useRef(null);

  // Default-Auswahl: erstes aktives Fach.
  useEffect(() => {
    if (!selectedFach && aktiveFaecher.length > 0) {
      setSelectedFach(aktiveFaecher[0].name);
    }
  }, [selectedFach, aktiveFaecher]);

  const currentRecord = selectedFach ? getByFach(selectedFach) : null;

  const handleFachChangeRequest = (newFach) => {
    if (newFach === selectedFach) return;
    if (isDirty) {
      setPendingFach(newFach);
      return;
    }
    setSelectedFach(newFach);
  };

  const handleConfirmDiscard = () => {
    editorRef.current?.discard?.();
    setSelectedFach(pendingFach);
    setPendingFach(null);
  };

  const handleSaveAndSwitch = async () => {
    try {
      await editorRef.current?.save?.();
      const target = pendingFach;
      setPendingFach(null);
      setSelectedFach(target);
      toast.success('Konventionen gespeichert.');
    } catch (err) {
      toast.error(err?.message || 'Speichern fehlgeschlagen.');
    }
  };

  const handleSave = async (payload) => {
    try {
      await save(payload);
      toast.success(`Konventionen für ${payload.fach} gespeichert.`);
    } catch (err) {
      const msg = err?.message || 'Speichern fehlgeschlagen.';
      toast.error(msg);
      throw err;
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Languages className="w-4 h-4 text-primary" />
          Nomenklatur-Manager
          {(isLoading || isSaving) && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
        </CardTitle>
        <CardDescription>
          Definiert die <strong>„Sprache der Schule"</strong> pro Fach: Notation, Begriffe und Stilregeln,
          die in jeder von der Moodle-Builder-KI erzeugten Aufgabe konsequent verwendet werden.
          Werden in jeden C-Global-Payload eingewoben.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Fach-Selektor */}
        <div className="flex items-end gap-3 max-w-sm">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs">Fach</Label>
            <Select
              value={selectedFach || undefined}
              onValueChange={handleFachChangeRequest}
              disabled={isLoading || aktiveFaecher.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Fach auswählen…" />
              </SelectTrigger>
              <SelectContent>
                {aktiveFaecher.map((f) => {
                  const hasRecord = !!getByFach(f.name);
                  return (
                    <SelectItem key={f.id} value={f.name}>
                      <span className="flex items-center gap-2">
                        {f.name}
                        {hasRecord && (
                          <span className="text-[10px] text-muted-foreground">· gepflegt</span>
                        )}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {aktiveFaecher.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Noch keine aktiven Fächer hinterlegt. Legen Sie zuerst im Tab „Fächer" Fächer an.
          </p>
        )}

        {/* Editor */}
        {selectedFach && (
          <NomenklaturFachEditor
            ref={editorRef}
            key={selectedFach /* erzwingt Reset bei Fachwechsel */}
            fach={selectedFach}
            record={currentRecord}
            onSave={handleSave}
            isSaving={isSaving}
            disabled={isLoading}
            onDirtyChange={setIsDirty}
          />
        )}
      </CardContent>

      {/* UnsavedChangesModal beim Fachwechsel */}
      <AlertDialog open={!!pendingFach} onOpenChange={(open) => !open && setPendingFach(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ungespeicherte Änderungen</AlertDialogTitle>
            <AlertDialogDescription>
              Sie haben Änderungen an den Konventionen für <strong>{selectedFach}</strong>,
              die noch nicht gespeichert sind. Was möchten Sie tun?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <AlertDialogCancel disabled={isSaving}>Im Fach bleiben</AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              onClick={handleConfirmDiscard}
              disabled={isSaving}
            >
              Verwerfen und wechseln
            </Button>
            <AlertDialogAction onClick={handleSaveAndSwitch} disabled={isSaving} className="gap-1.5">
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Speichern und wechseln
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}