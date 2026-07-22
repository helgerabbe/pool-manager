import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Trash2, Lock, Layers } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import DeleteConfirmModal from '@/components/shared/DeleteConfirmModal';
import BasismodulLoeschBlockiertDialog from '@/components/basismodule/BasismodulLoeschBlockiertDialog';
import { getBasismodulVerwendung } from '@/lib/basismodulVerknuepfung';
import { ROLLEN, kannStrukturBearbeiten } from '@/lib/rbac';
import { useRBAC } from '@/hooks/useRBAC';
import { getFachFarbe, getFachBadgeStyle } from '@/lib/fachFarben';
import EinheitMetricsRow from '@/components/einheiten/EinheitMetricsRow';
import EinheitAustauschToggleButton from '@/components/einheiten/EinheitAustauschToggleButton';

/**
 * BasismodulCard – Kachel in der Basismodul-Übersicht.
 *
 * Bewusst analog zu EinheitCard für hohen Wiedererkennungswert, aber OHNE
 * den Dashboard-Fortschrittsbereich und ohne Export-Lifecycle-Badge:
 * Basismodule sind Wissensspeicher, die nicht über Lernpfad-Dashboards laufen.
 * Klick öffnet die Basismodul-Ansicht (/basismodule/:id) mit der reduzierten
 * Tabulator-Struktur.
 */
export default function BasismodulCard({
  einheit,
  rolle,
  onDeleteStart,
  onDeleteEnd,
  metrics,
}) {
  const { data: faecher = [] } = useQuery({
    queryKey: ['lookupFaecher'],
    queryFn: () => base44.entities.LookupFaecher.list(),
    staleTime: 5 * 60 * 1000,
  });
  const fachHex = getFachFarbe(einheit.fach, faecher);
  const badgeStyle = getFachBadgeStyle(fachHex);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [blockiert, setBlockiert] = useState(null);
  const queryClient = useQueryClient();
  const isAdmin = rolle === ROLLEN.ADMIN;

  // Austausch-Freigabe: Admin, zuständige Fachschaftsleitung oder ernannte
  // Mitarbeiter (LEITUNG) dürfen ein Basismodul für das Kollegium freigeben.
  const { faecher: benutzerFaecher, authUser } = useRBAC();
  const norm = (s) => (s || '').trim().toLowerCase();
  const istLeitungMitglied = (einheit.members || []).some(
    (m) => norm(m.user_email) === norm(authUser?.email) && m.unit_role === 'LEITUNG'
  );
  const darfFreigeben = isAdmin || kannStrukturBearbeiten(rolle, benutzerFaecher, einheit.fach) || istLeitungMitglied;

  const volume = metrics?.volume;

  const handleDelete = async () => {
    setIsDeleting(true);
    onDeleteStart?.();
    try {
      // Lösch-Wächter: Blockieren, wenn Lernziele dieses Basismoduls noch
      // als Basis-Vorwissen in Einheiten verlinkt sind.
      const verwendungen = await getBasismodulVerwendung(einheit.id);
      if (verwendungen.length > 0) {
        setShowConfirm(false);
        setBlockiert(verwendungen);
        setIsDeleting(false);
        onDeleteEnd?.();
        return;
      }
      const res = await base44.functions.invoke('deleteEinheit', { einheitId: einheit.id });
      if (res.data?.success) {
        toast.success('Basismodul erfolgreich gelöscht.');
        setShowConfirm(false);
        onDeleteEnd?.();
        queryClient.invalidateQueries({ queryKey: ['basismodule'] });
      } else {
        toast.error(res.data?.error || 'Fehler beim Löschen des Basismoduls.');
        setIsDeleting(false);
        onDeleteEnd?.();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Fehler beim Löschen des Basismoduls.');
      setIsDeleting(false);
      onDeleteEnd?.();
    }
  };

  return (
    <>
      <div className="relative group/card w-full max-w-sm">
        <Card className="group hover:shadow-lg hover:border-primary/20 transition-all duration-300 overflow-hidden flex flex-col">
          <CardContent className="p-0 flex flex-col flex-1">
            <Link
              to={`/basismodule/${einheit.id}?tab=einheit`}
              className="block p-5 hover:bg-muted/30 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge className="font-medium border" style={badgeStyle}>
                    {einheit.fach}
                  </Badge>
                  <span className="text-xs text-muted-foreground">|</span>
                  <span className="text-xs font-medium text-muted-foreground">
                    Jg. {einheit.jahrgangsstufe}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge className="bg-amber-100 text-amber-800 border border-amber-200 gap-1">
                    <Layers className="w-3 h-3" />
                    Basismodul
                  </Badge>
                  {einheit.im_austausch === true && (
                    <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 gap-1">
                      Freigegeben
                    </Badge>
                  )}
                  {einheit.freigabe_status === 'Gesperrt' && (
                    <Badge className="bg-red-100 text-red-700 border border-red-200 gap-1">
                      <Lock className="w-3 h-3" />
                      Gesperrt
                    </Badge>
                  )}
                </div>
              </div>
              <h3
                className="text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 min-h-[2.75rem]"
                title={einheit.titel_der_einheit}
              >
                {einheit.titel_der_einheit}
              </h3>
            </Link>

            {/* Volumen-Metriken (ohne Dashboard-Bereich) */}
            <div className="px-4 pt-3 pb-3 border-t border-border/60">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
                Inhalte
              </p>
              <EinheitMetricsRow
                einheitId={einheit.id}
                volume={volume}
                indicatorKeys={['themenfelder', 'lernpakete', 'aktivitaeten']}
                basePath="/basismodule"
              />
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-muted/40 flex items-center justify-between border-t shrink-0 mt-auto">
              <span className="text-[11px] text-muted-foreground">
                {einheit.created_date && format(new Date(einheit.created_date), 'dd. MMM yyyy', { locale: de })}
              </span>
              <div className="flex items-center gap-2">
                {/* Für Kollegium freigeben → erscheint in der Austausch-Bibliothek,
                    Kolleg:innen ziehen sich eine private Kopie (inkl. Umwandlung). */}
                {darfFreigeben && <EinheitAustauschToggleButton einheit={einheit} />}
                <Link
                  to={`/basismodule/${einheit.id}?tab=einheit`}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Öffnen
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-all" />
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowConfirm(true); }}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-md bg-white/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-red-50 transition-all opacity-0 group-hover/card:opacity-100"
            title="Basismodul löschen"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <DeleteConfirmModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        titel={einheit.titel_der_einheit}
        isLoading={isDeleting}
      />

      <BasismodulLoeschBlockiertDialog
        open={!!blockiert}
        onClose={() => setBlockiert(null)}
        titel={einheit.titel_der_einheit}
        verwendungen={blockiert || []}
      />
    </>
  );
}