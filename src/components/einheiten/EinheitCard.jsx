import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Lock, Copy, EyeOff, ChevronDown, Eye, Layers } from 'lucide-react';
import EinheitVeroeffentlichenButton from '@/components/einheiten/EinheitVeroeffentlichenButton';
import EinheitAustauschToggleButton from '@/components/einheiten/EinheitAustauschToggleButton';
import EinheitWeitergebenButton from '@/components/einheiten/EinheitWeitergebenButton';
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
import EinheitVorschauModal from '@/components/einheiten/EinheitVorschauModal';
import MoodleParameterButton from '@/components/einheiten/MoodleParameterButton';

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
  // Akkordeon: Inhalte/Dashboards sind standardmäßig eingeklappt (platzsparend).
  const [expanded, setExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [showVorschau, setShowVorschau] = useState(false);
  const queryClient = useQueryClient();
  const istPrivat = einheit.sichtbarkeit === 'privat';
  const istPrivatBesitzer = istPrivat && einheit.besitzer_email === currentUserEmail;
  // Struktur-Rechte: Administrator immer, Fachschaftsleitung im eigenen Fach.
  const darfStruktur = kannStrukturBearbeiten(rolle, benutzerFaecher, einheit.fach);
  // Löschen darf: darfStruktur — bei PRIVATEN Einheiten zusätzlich der Besitzer.
  // Das Backend (deleteEinheitSecure) prüft dieselben Regeln serverseitig.
  const darfLoeschen = darfStruktur || istPrivatBesitzer;

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
                <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                  <EinheitExportLifecycleBadge einheit={einheit} />
                  {istPrivat && (
                    <Badge className="bg-amber-100 text-amber-800 border border-amber-200 gap-1">
                      <EyeOff className="w-3 h-3" />
                      Privat
                    </Badge>
                  )}
                  {istPrivat && einheit.erhalten_von && (
                    <Badge
                      className="bg-violet-100 text-violet-800 border border-violet-200 gap-1"
                      title={`Diese Einheit wurde ursprünglich von ${einheit.erhalten_von} erstellt und von Ihnen als Kopie übernommen.`}
                    >
                      <Copy className="w-3 h-3" />
                      Kopie
                    </Badge>
                  )}
                  {istPrivat && einheit.aus_basismodul === true && (
                    <Badge
                      className="bg-amber-100 text-amber-800 border border-amber-200 gap-1"
                      title="Diese Einheit ist aus einem Basismodul hervorgegangen und wurde beim Kopieren in eine normale private Einheit umgewandelt."
                    >
                      <Layers className="w-3 h-3" />
                      Aus Basismodul
                    </Badge>
                  )}
                  {istPrivat && einheit.im_austausch === true && (
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
                  <EinheitAccessBadge
                    currentUserEmail={currentUserEmail}
                    members={einheit.members}
                  />
                </div>
              </div>
              <h3
                className="text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2"
                title={einheit.titel_der_einheit}
              >
                {einheit.titel_der_einheit}
              </h3>
              {istPrivat && einheit.erhalten_von && (
                <p className="mt-1 text-[11px] text-violet-700 truncate" title={`Original von ${einheit.erhalten_von}`}>
                  Original von {einheit.erhalten_von}
                </p>
              )}
            </Link>

            {/* ── Akkordeon: Inhalte + Dashboards (standardmäßig eingeklappt) ── */}
            {expanded && (
              <>
                <div className="px-4 pt-3 pb-3 border-t border-border/60">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
                    Inhalte
                  </p>
                  <EinheitMetricsRow einheitId={einheit.id} volume={volume} />
                </div>
                <div className="px-4 pb-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
                    Dashboards
                  </p>
                  <DashboardStatusBadges einheitId={einheit.id} dashboardStatus={dashboardStatus} />
                </div>
              </>
            )}

            {/* ── Footer: Datum + fest integrierte Aktionen ── */}
            <div className="px-4 py-2 bg-muted/40 flex items-center justify-between gap-2 border-t shrink-0 mt-auto">
              <span className="text-[11px] text-muted-foreground shrink-0">
                {(einheit.updated_date || einheit.created_date) &&
                  format(new Date(einheit.updated_date || einheit.created_date), 'dd. MMM yyyy', { locale: de })}
              </span>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {istPrivat && (istPrivatBesitzer || darfStruktur) && (
                  <>
                    {/* Poolzeit-Übernahme: nur Fachschaftsleitung/Admin */}
                    {darfStruktur && <EinheitVeroeffentlichenButton einheit={einheit} />}
                    {/* Austausch-Bibliothek: Besitzer/Admin geben frei */}
                    <EinheitAustauschToggleButton einheit={einheit} />
                    <EinheitWeitergebenButton einheit={einheit} />
                    <MoodleParameterButton einheit={einheit} />
                  </>
                )}
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowVorschau(true); }}
                  className="p-1 rounded-md border border-border bg-card text-muted-foreground hover:text-primary hover:border-primary/40 transition-all"
                  title="Vorschau aus Schülersicht: Einheit im aktuellen Zustand durcharbeiten"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                {darfLoeschen && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDuplicate(); }}
                    disabled={isCopying}
                    className="p-1 rounded-md border border-border bg-card text-muted-foreground hover:text-primary hover:border-primary/40 transition-all disabled:opacity-60"
                    title="Einheit als private Kopie duplizieren (landet in Ihrem Privatbereich)"
                  >
                    {isCopying
                      ? <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      : <Copy className="w-3.5 h-3.5" />
                    }
                  </button>
                )}
                {darfLoeschen && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowConfirm(true); }}
                    className="p-1 rounded-md border border-border bg-card text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-all"
                    title="Einheit löschen"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                  title={expanded ? 'Details einklappen' : 'Inhalte und Dashboards anzeigen'}
                >
                  Details
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <EinheitVorschauModal
        open={showVorschau}
        onOpenChange={setShowVorschau}
        einheit={einheit}
      />

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