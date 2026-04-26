import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Trash2, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import DeleteConfirmModal from '@/components/shared/DeleteConfirmModal';
import { ROLLEN } from '@/lib/rbac';
import { getFachFarbe, getFachBadgeStyle } from '@/lib/fachFarben';
import EinheitAccessBadge from '@/components/ui/EinheitAccessBadge';
import EinheitMetricsRow from '@/components/einheiten/EinheitMetricsRow';
import DashboardProgressBar from '@/components/einheiten/DashboardProgressBar';

export default function EinheitCard({
  einheit,
  rolle,
  onDeleteStart,
  onDeleteEnd,
  currentUserEmail,
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
  const queryClient = useQueryClient();
  const isAdmin = rolle === ROLLEN.ADMIN;

  const volume = metrics?.volume;
  const progress = metrics?.progress;

  const handleDelete = async () => {
    setIsDeleting(true);
    onDeleteStart?.();
    try {
      const res = await base44.functions.invoke('deleteEinheit', { einheitId: einheit.id });
      if (res.data?.success) {
        toast.success('Einheit erfolgreich gelöscht.');
        setShowConfirm(false);
        onDeleteEnd?.();
        queryClient.invalidateQueries({ queryKey: ['einheiten'] });
      } else {
        const errorMsg = res.data?.error || 'Fehler beim Löschen der Einheit.';
        toast.error(errorMsg);
        setIsDeleting(false);
        onDeleteEnd?.();
      }
    } catch (err) {
      let errorMessage = 'Fehler beim Löschen der Einheit.';
      if (err.response?.data?.error) errorMessage = err.response.data.error;
      else if (err.message) errorMessage = err.message;
      toast.error(errorMessage);
      console.error('Delete error:', err);
      setIsDeleting(false);
      onDeleteEnd?.();
    }
  };

  return (
    <>
      <div className="relative group/card">
        <Card className="group hover:shadow-lg hover:border-primary/20 transition-all duration-300 overflow-hidden flex flex-col">
          <CardContent className="p-0 flex flex-col flex-1">
            {/* ── Kopfbereich: Standard-Klickzone → Tab 1 (Strukturboard) ── */}
            <Link
              to={`/workspace?einheit=${einheit.id}&tab=struktur`}
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
                  {einheit.freigabe_status === 'Gesperrt' && (
                    <Badge className="bg-red-100 text-red-700 border border-red-200 gap-1">
                      <Lock className="w-3 h-3" />
                      Gesperrt
                    </Badge>
                  )}
                  <EinheitAccessBadge
                    currentUserEmail={currentUserEmail}
                    members={einheit.members}
                  />
                </div>
              </div>
              <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                {einheit.titel_der_einheit}
              </h3>
            </Link>

            {/* ── Mittlerer Bereich: Volumen-Metriken (eigene Klick-Zonen) ── */}
            <div className="px-4 pt-3 pb-3 border-t border-border/60">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
                Inhalte
              </p>
              <EinheitMetricsRow einheitId={einheit.id} volume={volume} />
            </div>

            {/* ── Unterer Bereich: Dashboard-Fortschritt (eigene Klick-Zonen) ── */}
            <div className="px-4 pb-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
                Dashboards
              </p>
              <DashboardProgressBar einheitId={einheit.id} progress={progress} />
            </div>

            {/* ── Footer ── */}
            <div className="px-4 py-2 bg-muted/40 flex items-center justify-between border-t shrink-0 mt-auto">
              <span className="text-[11px] text-muted-foreground">
                {einheit.created_date && format(new Date(einheit.created_date), 'dd. MMM yyyy', { locale: de })}
              </span>
              <Link
                to={`/workspace?einheit=${einheit.id}&tab=struktur`}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Öffnen
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-all" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Löschen-Button — nur für Administratoren */}
        {isAdmin && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowConfirm(true); }}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-md bg-white/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-red-50 transition-all opacity-0 group-hover/card:opacity-100"
            title="Einheit löschen"
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
    </>
  );
}