import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronDown, ChevronRight, ExternalLink, Eye, Trash2, User, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import DeleteConfirmModal from '@/components/shared/DeleteConfirmModal';
import EinheitVeroeffentlichenButton from './EinheitVeroeffentlichenButton';
import EinheitAustauschToggleButton from './EinheitAustauschToggleButton';
import EinheitVorschauModal from './EinheitVorschauModal';
import EmptyState from '@/components/shared/EmptyState';

/**
 * Admin-Ansicht "Private Einheiten": kompakte, nach Besitzer gruppierte
 * Übersicht aller privaten Einheiten — statt einer unübersichtlichen
 * Kachel-Flut. Pro Besitzer eine aufklappbare Gruppe mit Titel, Fach,
 * Jahrgang, letzter Änderung und Aktionen (Öffnen / Veröffentlichen / Löschen).
 */
export default function PrivateEinheitenUebersicht({ einheiten = [] }) {
  const [openGroups, setOpenGroups] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [vorschauEinheit, setVorschauEinheit] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const gruppen = einheiten.reduce((acc, e) => {
    const key = e.besitzer_email || 'Ohne Besitzer';
    (acc[key] = acc[key] || []).push(e);
    return acc;
  }, {});
  const besitzerListe = Object.keys(gruppen).sort();

  const toggle = (key) => setOpenGroups((s) => ({ ...s, [key]: !s[key] }));

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await base44.functions.invoke('deleteEinheitSecure', { einheit_id: deleteTarget.id });
      if (res.data?.success) {
        toast.success('Private Einheit gelöscht.');
        setDeleteTarget(null);
        queryClient.invalidateQueries({ queryKey: ['einheiten'] });
      } else {
        toast.error(res.data?.error || 'Fehler beim Löschen.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Fehler beim Löschen.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (einheiten.length === 0) {
    return (
      <EmptyState
        icon={Lock}
        title="Keine privaten Einheiten"
        description="Momentan hat niemand private Einheiten im Privatbereich."
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {einheiten.length} private Einheit{einheiten.length !== 1 ? 'en' : ''} von {besitzerListe.length} Besitzer{besitzerListe.length !== 1 ? 'n' : ''}
      </p>
      {besitzerListe.map((besitzer) => {
        const items = gruppen[besitzer];
        const isOpen = !!openGroups[besitzer];
        return (
          <div key={besitzer} className="rounded-xl border bg-card overflow-hidden">
            <button
              onClick={() => toggle(besitzer)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
            >
              {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
              <User className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="font-medium text-sm text-foreground">{besitzer}</span>
              <Badge variant="secondary" className="ml-auto">{items.length} Einheit{items.length !== 1 ? 'en' : ''}</Badge>
            </button>
            {isOpen && (
              <div className="border-t divide-y">
                {items.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20">
                    <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate" title={e.titel_der_einheit}>
                          {e.titel_der_einheit}
                        </p>
                        {e.im_austausch === true && (
                          <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0 text-[10px] px-1.5 py-0">
                            Freigegeben
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {e.fach} · Jg. {e.jahrgangsstufe}
                        {e.updated_date && <> · zuletzt geändert {format(new Date(e.updated_date), 'dd. MMM yyyy', { locale: de })}</>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Link
                        to={`/workspace?einheit=${e.id}&tab=einheit`}
                        className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-primary hover:bg-blue-50 transition-all"
                        title="Einheit ansehen"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => setVorschauEinheit(e)}
                        className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-all"
                        title="Schüler-Vorschau: Einheit so ansehen und durcharbeiten, wie sie ein Schüler sieht"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <EinheitAustauschToggleButton einheit={e} />
                      <EinheitVeroeffentlichenButton einheit={e} />
                      <button
                        onClick={() => setDeleteTarget(e)}
                        className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-destructive hover:bg-red-50 transition-all"
                        title="Private Einheit löschen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {vorschauEinheit && (
        <EinheitVorschauModal
          open={!!vorschauEinheit}
          onOpenChange={(o) => !o && setVorschauEinheit(null)}
          einheit={vorschauEinheit}
        />
      )}

      <DeleteConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        titel={deleteTarget?.titel_der_einheit || ''}
        isLoading={isDeleting}
      />
    </div>
  );
}