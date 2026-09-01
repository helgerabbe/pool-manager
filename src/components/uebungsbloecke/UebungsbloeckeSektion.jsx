import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Boxes, ChevronRight, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import UebungsblockErstellenModal from './UebungsblockErstellenModal';
import { istUebungsblock } from '@/lib/einheitFormat';

/**
 * UebungsbloeckeSektion
 * ─────────────────────
 * Der Bereich „Meine Übungsblöcke" in der privaten Bibliothek — getrennt von
 * Einheiten und Unterrichtsstunden, weil es ein eigenes Arbeitsformat ist.
 *
 * Technisch sind Übungsblöcke private Einheiten mit `format: 'uebungsblock'`.
 * Sie kommen deshalb aus derselben Abfrage wie die Einheiten und werden hier
 * nur herausgefiltert — eine zweite Abfrage wäre unnötig.
 *
 * Aus demselben Grund muss die Einheiten-Liste sie AUSSCHLIESSEN, sonst
 * stünden sie doppelt da. Das erledigt der Aufrufer.
 */
export default function UebungsbloeckeSektion({ einheiten = [], besitzerEmail }) {
  const [erstellenOffen, setErstellenOffen] = useState(false);
  const [loeschZiel, setLoeschZiel] = useState(null);
  const queryClient = useQueryClient();

  // Löschen über dieselbe Serverfunktion wie bei Einheiten — sie räumt auch
  // Themenfelder, Lernpakete und Aufgaben mit ab.
  const loeschen = useMutation({
    mutationFn: async (id) => {
      const res = await base44.functions.invoke('deleteEinheitSecure', { einheit_id: id });
      if (res?.data?.error) throw new Error(res.data.error);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['einheiten'] });
      setLoeschZiel(null);
      toast.success('Übungsblock gelöscht.');
    },
    onError: (err) => toast.error(err?.message || 'Löschen fehlgeschlagen.'),
  });

  const bloecke = useMemo(
    () => einheiten.filter(istUebungsblock),
    [einheiten],
  );

  // Nach Fach gruppiert — bei kleinen Formaten sammeln sich schnell viele an.
  const nachFach = useMemo(() => {
    const map = {};
    bloecke.forEach((b) => {
      const fach = b.fach || 'Ohne Fach';
      (map[fach] = map[fach] || []).push(b);
    });
    return map;
  }, [bloecke]);
  const faecher = Object.keys(nachFach).sort((a, b) => a.localeCompare(b, 'de'));

  return (
    <div className="rounded-xl border-2 border-violet-300 bg-violet-50/60 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Boxes className="w-4 h-4 text-violet-600" />
            Meine Übungsblöcke
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Kleines Format für die Poolzeit: ein Thema, ein paar Lernpakete und Aufgaben — schnell
            gebaut und direkt für die Schüler:innen freischaltbar.
          </p>
        </div>
        <Button size="sm" onClick={() => setErstellenOffen(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          Neuer Übungsblock
        </Button>
      </div>

      {bloecke.length === 0 ? (
        <p className="text-sm text-muted-foreground italic px-1 py-3">
          Noch keine Übungsblöcke. Legen Sie den ersten an — das dauert keine zwei Minuten.
        </p>
      ) : (
        <div className="space-y-4">
          {faecher.map((fach) => (
            <div key={fach} className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                {fach}
              </p>
              {/* Raster statt voller Breite: Ein Übungsblock trägt wenig
                  Information — eine bildschirmbreite Zeile pro Stück wirkt
                  aufgeblasen und macht die Liste unnötig lang. */}
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {nachFach[fach].map((b) => (
                  <div
                    key={b.id}
                    className="group relative flex items-center gap-2 rounded-lg border border-border bg-card pl-3 pr-1 py-2 hover:bg-muted/50 transition-colors"
                  >
                    <Link to={`/workspace?einheit=${b.id}`} className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {b.titel_der_einheit || 'Ohne Titel'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Jahrgang {b.jahrgangsstufe && b.jahrgangsstufe !== 'undefined' ? b.jahrgangsstufe : '—'}
                        {b.last_exported_at ? ' · in Moodle' : ' · Entwurf'}
                      </p>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setLoeschZiel(b)}
                      title="Übungsblock löschen"
                      className="p-1.5 rounded text-muted-foreground hover:bg-red-100 hover:text-red-600 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mr-1" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!loeschZiel} onOpenChange={(o) => { if (!o) setLoeschZiel(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Übungsblock löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              „{loeschZiel?.titel_der_einheit}" wird mit allem Inhalt gelöscht — Themenfeld,
              Lernpakete und Aufgaben. Das lässt sich nicht rückgängig machen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); loeschen.mutate(loeschZiel.id); }}
              disabled={loeschen.isPending}
              className="bg-red-600 hover:bg-red-700 gap-2"
            >
              {loeschen.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Ja, löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UebungsblockErstellenModal
        open={erstellenOffen}
        onOpenChange={setErstellenOffen}
        besitzerEmail={besitzerEmail}
      />
    </div>
  );
}
