import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRBAC } from '@/hooks/useRBAC';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Wand2, Trash2, Clock, BookOpen, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export default function EntwurfSektion() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { authUser } = useRBAC();
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete'],
    queryFn: () => base44.entities.Lernpakete.list(),
  });

  const { data: entwaerfe = [] } = useQuery({
    queryKey: ['einheiten-entwaerfe'],
    queryFn: async () => {
      const all = await base44.entities.Einheiten.list('-created_date');
      return all.filter(
        e => e.wizard_status === 'entwurf' && e.created_by === authUser?.email
      );
    },
    enabled: !!authUser?.email,
  });

  const handleDelete = async () => {
    setIsDeleting(true);
    await base44.functions.invoke('deleteEinheitSecure', { einheit_id: deleteId });
    queryClient.invalidateQueries({ queryKey: ['einheiten-entwaerfe'] });
    queryClient.invalidateQueries({ queryKey: ['einheiten'] });
    setDeleteId(null);
    setIsDeleting(false);
  };

  const handleWeiterbearbeiten = (entwurf) => {
    const hatLernpakete = lernpakete.some(lp => lp.einheit_id === entwurf.id);
    const startStep = hatLernpakete ? 3 : 2;
    navigate(`/einheit/create?draftId=${entwurf.id}&step=${startStep}`);
  };

  if (entwaerfe.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-amber-600" />
        <h2 className="text-sm font-semibold text-amber-700">
          Angefangene Entwürfe ({entwaerfe.length})
        </h2>
        <span className="text-xs text-muted-foreground">— nur für dich sichtbar</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {entwaerfe.map(entwurf => {
          const paketCount = lernpakete.filter(lp => lp.einheit_id === entwurf.id).length;
          return (
            <div
              key={entwurf.id}
              className="relative border-2 border-dashed border-amber-300 bg-amber-50/60 rounded-xl p-4 space-y-3"
            >
              {/* Entwurf-Badge */}
              <div className="flex items-start justify-between gap-2">
                <Badge className="text-[10px] bg-amber-100 text-amber-700 border border-amber-300">
                  Entwurf
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(entwurf.created_date), 'dd. MMM HH:mm', { locale: de })}
                </span>
              </div>

              {/* Titel + Meta */}
              <div>
                <p className="text-sm font-semibold text-foreground leading-tight">
                  {entwurf.titel_der_einheit || '(kein Titel)'}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> {entwurf.fach}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <GraduationCap className="w-3 h-3" /> Jg. {entwurf.jahrgangsstufe}
                  </span>
                  {paketCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {paketCount} Lernpaket{paketCount !== 1 ? 'e' : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Aktionen */}
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                  onClick={() => handleWeiterbearbeiten(entwurf)}
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  Weiterbearbeiten
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 px-2"
                  onClick={() => setDeleteId(entwurf.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Löschen-Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Entwurf verwerfen?</AlertDialogTitle>
            <AlertDialogDescription>
              Der Entwurf und alle zugehörigen Daten werden unwiderruflich gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Wird gelöscht...' : 'Verwerfen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}