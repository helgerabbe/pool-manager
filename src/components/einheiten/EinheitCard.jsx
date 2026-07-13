import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Trash2, Lock, Copy, EyeOff } from 'lucide-react';
import EinheitVeroeffentlichenButton from '@/components/einheiten/EinheitVeroeffentlichenButton';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import DeleteConfirmModal from '@/components/shared/DeleteConfirmModal';
import { ROLLEN, kannStrukturBearbeiten } from '@/lib/rbac';
import { getFachFarbe, getFachBadgeStyle } from '@/lib/fachFarben';
import EinheitAccessBadge from '@/components/ui/EinheitAccessBadge';
import EinheitMetricsRow from '@/components/einheiten/EinheitMetricsRow';
import DashboardStatusBadges from '@/components/einheiten/DashboardStatusBadges';
import EinheitExportLifecycleBadge from '@/components/einheiten/EinheitExportLifecycleBadge';

export default function EinheitCard({
  einheit,
  rolle,
  benutzerFaecher = [],
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
  const [isCopying, setIsCopying] = useState(false);
  const queryClient = useQueryClient();
  // Löschen darf: Administrator immer, Fachschaftsleitung im eigenen Fach.
  // Das Backend (deleteEinheitSecure) prüft dieselbe Regel serverseitig.
  const darfLoeschen = kannStrukturBearbeiten(rolle, benutzerFaecher, einheit.fach);
  // Privat-Modus: Besitzer einer privaten Einheit darf sie veröffentlichen.
  const istPrivat = einheit.sichtbarkeit === 'privat';
  const istPrivatBesitzer = istPrivat && einheit.besitzer_email === currentUserEmail;

  const volume = metrics?.volume;
  const dashboardStatus = metrics?.dashboardStatus;

  const handleDelete = async () => {
    setIsDeleting(true);
    onDeleteStart?.();
    try {
      const res = await base44.functions.invoke('deleteEinheitSecure', { einheit_id: einheit.id });
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

  const handleDuplicate = async () => {
    setIsCopying(true);
    try {
      const res = await base44.functions.invoke('duplicateEinheitSecure', { einheit_id: einheit.id });
      if (res.data?.success) {
        toast.success(`Kopie erstellt: „${res.data.titel}"`);
        queryClient.invalidateQueries({ queryKey: ['einheiten'] });
      } else {
        toast.error(res.data?.error || 'Fehler beim Duplizieren.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Fehler beim Duplizieren.');
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <>
      <div className="relative group/card">
        <Card className="group hover:shadow-lg hover:border-primary/20 transition-all duration-300 overflow-hidden flex flex-col">
          <CardContent className="p-0 flex flex-col flex-1">
            {/* ── Kopfbereich: Standard-Klickzone → Tab 1 (Strukturboard) ── */}
            <Link
              to={`/workspace?einheit=${einheit.id}&tab=einheit`}
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
                  {istPrivat && (
                    <Badge className="bg-amber-100 text-amber-800 border border-amber-200 gap-1">
                      <EyeOff className="w-3 h-3" />
                      Privat
                    </Badge>
                  )}
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
              <h3
                className="text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 min-h-[2.75rem]"
                title={einheit.titel_der_einheit}
              >
                {einheit.titel_der_einheit}
              </h3>
              {/* Eigene Status-Zeile unter dem Titel: hält die Kopfzeile schmal
                  und die Kachelhöhe über alle Karten hinweg konsistent. */}
              <div className="mt-2 min-h-[1.5rem] flex items-center">
                <EinheitExportLifecycleBadge einheit={einheit} />
              </div>
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
              <DashboardStatusBadges einheitId={einheit.id} dashboardStatus={dashboardStatus} />
            </div>

            {/* ── Footer ── */}
            <div className="px-4 py-2 bg-muted/40 flex items-center justify-between border-t shrink-0 mt-auto">
              <span className="text-[11px] text-muted-foreground">
                {einheit.created_date && format(new Date(einheit.created_date), 'dd. MMM yyyy', { locale: de })}
              </span>
              <Link
                to={`/workspace?einheit=${einheit.id}&tab=einheit`}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Öffnen
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-all" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Aktionen: Veröffentlichen (privat) + Duplizieren/Löschen (Admin/Fachschaftsleitung) */}
        {(darfLoeschen || istPrivatBesitzer) && (
          <div className={`absolute top-3 right-3 z-10 flex items-center gap-1.5 transition-all ${istPrivat ? 'opacity-100' : 'opacity-0 group-hover/card:opacity-100'}`}>
            {istPrivat && (istPrivatBesitzer || darfLoeschen) && (
              <EinheitVeroeffentlichenButton einheit={einheit} />
            )}
            {darfLoeschen && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDuplicate(); }}
                disabled={isCopying}
                className="p-1.5 rounded-md bg-white/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-blue-50 transition-all disabled:opacity-60"
                title="Einheit als private Kopie duplizieren (landet in Ihrem Privatbereich)"
              >
                {isCopying
                  ? <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  : <Copy className="w-4 h-4" />
                }
              </button>
            )}
            {darfLoeschen && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowConfirm(true); }}
                className="p-1.5 rounded-md bg-white/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-red-50 transition-all"
                title="Einheit löschen"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
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