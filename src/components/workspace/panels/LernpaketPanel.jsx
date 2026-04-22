import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { getLernpaketStatus } from '@/lib/statusLogic';
import { cn } from '@/lib/utils';
import { useLernpaketLock } from '@/hooks/useLocks';
import { StatusBadge, kategorieColors } from './SharedUI';
import PhaseContent from './PhaseContent';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Lock, Plus, Edit, Trash2, Clock, AlertTriangle, PenLine, Loader2, ChevronRight, Menu, Target
} from 'lucide-react';

export default function LernpaketPanel({
  paket,
  lernziele,
  aufgaben,
  kannBearbeiten,
  userEmail,
  istAdmin,
  onNavigate: onNavigateRaw,
  onNewLernziel,
  onDelete,
}) {
  const onNavigate = onNavigateRaw;
  const paketZiele = lernziele.filter(lz => lz.lernpaket_id === paket.id);
  const pStatus = getLernpaketStatus(paket, paketZiele, aufgaben, userEmail);
  const [editLernzielId, setEditLernzielId] = useState(null);
  const [editLernzielData, setEditLernzielData] = useState(null);
  const [expandedPhase, setExpandedPhase] = useState(null);
  const [localTitel, setLocalTitel] = useState(paket.titel_des_pakets || '');
  const [localPhasenConfig, setLocalPhasenConfig] = useState(paket.phasen_konfiguration || {});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: lernpaketAktivitaeten = [] } = useQuery({
    queryKey: ['lernpaketPhaseAktivitaeten'],
    queryFn: () => base44.entities.LernpaketPhaseAktivitaet.list(),
  });

  const { canEdit, isLockedByOther, lockedByEmail, lockErrorMessage, isLoading: isLockLoading, acquireLock, releaseLock } = useLernpaketLock(paket.id);
  const [isAcquiringLock, setIsAcquiringLock] = useState(false);

  const handleOpenEditDialog = async () => {
    setIsAcquiringLock(true);
    try {
      const ok = await acquireLock();
      if (!ok) {
        toast.error(`🔒 Dieses Lernpaket wird aktuell von ${lockedByEmail} bearbeitet.`);
        setIsAcquiringLock(false);
        return;
      }
      setEditDialogOpen(true);
    } catch (err) {
      toast.error('Fehler beim Sperren des Lernpakets.');
      setIsAcquiringLock(false);
    }
  };

  const handleCloseEditDialog = async () => {
    setEditDialogOpen(false);
    setIsAcquiringLock(false);
    await releaseLock();
  };

  React.useEffect(() => {
    setLocalTitel(paket.titel_des_pakets || '');
    setLocalPhasenConfig(paket.phasen_konfiguration || {});
  }, [paket.titel_des_pakets, paket.phasen_konfiguration]);

  const PHASES = [
    { key: 'Input', label: 'Input (Erarbeitung)', icon: '📚', defaultDisabled: false },
    { key: 'Übung', label: 'Übung', icon: '✏️', defaultDisabled: false },
    { key: 'Abschluss', label: 'Abschluss', icon: '🎯', defaultDisabled: false },
  ];

  const handlePhaseToggle = (phaseKey) => {
    const phaseConfig = localPhasenConfig[phaseKey] || {};
    const newDisabledState = !phaseConfig.disabled;
    const updatedPhaseConfig = {
      ...phaseConfig,
      disabled: newDisabledState,
    };
    const newConfig = {
      ...localPhasenConfig,
      [phaseKey]: updatedPhaseConfig,
    };
    setLocalPhasenConfig(newConfig);
    base44.entities.Lernpakete.update(paket.id, { phasen_konfiguration: newConfig }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
    }).catch(() => {
      setLocalPhasenConfig(localPhasenConfig);
      toast.error('Fehler beim Speichern der Phasenkonfiguration.');
    });
  };

  const handleEditLernziel = (lz) => {
    setEditLernzielId(lz.id);
    setEditLernzielData({
      formulierung_fachsprache: lz.formulierung_fachsprache,
      kategorie: lz.kategorie,
      schueler_uebersetzung: lz.schueler_uebersetzung,
    });
  };

  const handleEnterEditMode = async () => {
    const ok = await acquireLock();
    if (!ok) {
      const errMsg = lockErrorMessage || (lockedByEmail
        ? `🔒 Dieses Lernpaket wird aktuell von ${lockedByEmail} bearbeitet.`
        : 'Lock konnte nicht erworben werden.');
      toast.error(errMsg);
    }
  };

  const handleExitEditMode = async () => {
    await releaseLock();
  };

  return (
    <div className="space-y-6">
      {isLockedByOther && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-900">
          <Lock className="w-4 h-4 shrink-0" />
          <span className="text-sm">
            🔒 Dieses Lernpaket wird aktuell bearbeitet von <strong>{lockedByEmail}</strong>.
          </span>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
              {paket.reihenfolge_nummer}
            </div>
            <h2 className="text-xl font-bold">{paket.titel_des_pakets}</h2>
            <StatusBadge status={pStatus} />
            {isLockedByOther && (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-xs font-medium">
                <Lock className="w-3 h-3" />
                Gesperrt von {paket.locked_by_email}
              </div>
            )}
            {canEdit && (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 border border-blue-200 text-blue-700 text-xs font-medium">
                <PenLine className="w-3 h-3" />
                In Bearbeitung
              </div>
            )}
            {(() => {
              const phasenConfig = paket.phasen_konfiguration || {};
              const hasIncomplete = Object.values(phasenConfig).some(
                phase => phase && phase.selected_aktivitaet_id && !phase.is_complete
              );
              return hasIncomplete ? (
                <span title="Aktivität-Inhalte unvollständig" className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Inhalt unvollständig
                </span>
              ) : null;
            })()}
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />{paket.geschaetzte_dauer_minuten} Minuten
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {kannBearbeiten && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleOpenEditDialog}
              disabled={isAcquiringLock || canEdit || isLockedByOther}
              title={isLockedByOther ? `🔒 Wird gerade von ${paket.locked_by_email} bearbeitet` : ''}
              className="gap-2"
            >
              {isAcquiringLock ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Öffne...
                </>
              ) : (
                <>
                  <PenLine className="w-3.5 h-3.5" />
                  Bearbeiten
                </>
              )}
            </Button>
          )}
          {kannBearbeiten && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onDelete} 
              disabled={isLockedByOther}
              title={isLockedByOther ? `🔒 Wird gerade von ${paket.locked_by_email} bearbeitet` : 'Lernpaket löschen'}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          )}
          {isLockedByOther && (
            <span className="text-xs px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 font-medium">
              🔒 Gesperrt
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground">Zugeordnete Lernziele</h3>
          {canEdit && kannBearbeiten && !isLockedByOther && paketZiele.length > 0 && (
            <button
              onClick={onNewLernziel}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Plus className="w-3 h-3" /> Hinzufügen
            </button>
          )}
        </div>
        <div className="space-y-2">
          {paketZiele.length === 0 ? (
            <button
              onClick={canEdit && kannBearbeiten ? onNewLernziel : undefined}
              disabled={!canEdit || !kannBearbeiten}
              className={`w-full flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed transition-colors text-center
                ${canEdit && kannBearbeiten
                  ? 'border-primary/30 hover:border-primary hover:bg-primary/5 cursor-pointer'
                  : 'border-border cursor-default opacity-60'
                }`}
            >
              <Target className="w-6 h-6 text-muted-foreground/40" />
              <span className="text-sm text-muted-foreground">
                {canEdit && kannBearbeiten
                  ? 'Noch kein Lernziel zugeordnet. Hier klicken, um ein Lernziel hinzuzufügen.'
                  : 'Noch kein Lernziel zugeordnet.'}
              </span>
              {canEdit && kannBearbeiten && (
                <span className="text-xs text-primary font-medium">+ Lernziel hinzufügen</span>
              )}
            </button>
          ) : (
            <>
              {paketZiele.map(lz => (
                <div
                  key={lz.id}
                  className="w-full flex items-start gap-3 p-3 rounded-lg border bg-card text-left"
                >
                  <Target className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{lz.formulierung_fachsprache}</p>
                    {lz.schueler_uebersetzung && (
                      <p className="text-xs text-muted-foreground italic mt-0.5">„{lz.schueler_uebersetzung}"</p>
                    )}
                    {lz.kategorie && (
                      <Badge className={`text-[10px] mt-1 ${kategorieColors[lz.kategorie] || ''}`}>
                        {lz.kategorie}
                      </Badge>
                    )}
                  </div>
                  {canEdit && kannBearbeiten && !isLockedByOther && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleEditLernziel(lz)}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Bearbeiten"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Dieses Lernziel wirklich löschen?')) {
                            base44.entities.Lernziele.delete(lz.id).then(() => {
                              queryClient.invalidateQueries({ queryKey: ['lernziele'] });
                              toast.success('Lernziel gelöscht.');
                            }).catch(() => toast.error('Fehler beim Löschen.'));
                          }
                        }}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Löschen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Zugeordnete Aktivitäten (informativ, nur lesend) */}
      <div className="space-y-2 border-t pt-6">
        <h3 className="text-sm font-semibold text-muted-foreground">Zugeordnete Aktivitäten</h3>
        {(() => {
          const paketAktivitaeten = lernpaketAktivitaeten.filter(a => a.lernpaket_id === paket.id);
          if (paketAktivitaeten.length === 0) {
            return (
              <div className="p-4 rounded-lg border border-dashed text-center text-sm text-muted-foreground">
                Noch keine Aktivitäten zugeordnet.
              </div>
            );
          }
          
          // Gruppiere nach Phase
          const byPhase = {};
          paketAktivitaeten.forEach(a => {
            if (!byPhase[a.phase]) byPhase[a.phase] = [];
            byPhase[a.phase].push(a);
          });
          
          return (
            <div className="space-y-3">
              {['Input', 'Übung', 'Abschluss'].map(phase => {
                const activities = byPhase[phase] || [];
                if (activities.length === 0) return null;
                
                return (
                  <div key={phase} className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">{phase}</p>
                    <div className="space-y-1.5">
                      {activities.map(activity => (
                        <div key={activity.id} className="flex items-start gap-2 p-2 rounded border border-border/50 bg-muted/40 text-xs">
                          <span className="text-primary font-semibold shrink-0 mt-0.5">▸</span>
                          <span className="flex-1 text-foreground">{activity.aktivitaet_id || 'Aktivität'}</span>
                          {activity.is_complete && (
                            <Badge className="shrink-0 text-[10px]" variant="secondary">
                              Vollständig
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      <Dialog open={editDialogOpen} onOpenChange={handleCloseEditDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>📦 {paket.titel_des_pakets} bearbeiten</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Lernphasen</h3>
              {PHASES.map(phase => {
                const phaseConfig = localPhasenConfig[phase.key] || {};
                const isDisabled = phaseConfig.disabled === true;
                const isExpanded = expandedPhase === phase.key;
                const phaseActivities = lernpaketAktivitaeten.filter(a => a.lernpaket_id === paket.id && a.phase === phase.key);

                return (
                  <div key={phase.key} className="space-y-0">
                    <div className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border bg-card transition-all',
                      isDisabled
                        ? 'opacity-60'
                        : 'hover:bg-muted hover:border-primary/30'
                    )}>
                      <button
                        onClick={() => !isDisabled && setExpandedPhase(isExpanded ? null : phase.key)}
                        disabled={isDisabled}
                        className="flex items-center gap-3 flex-1 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ChevronRight
                          className={cn(
                            'w-5 h-5 text-muted-foreground transition-transform shrink-0',
                            isExpanded && 'rotate-90'
                          )}
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-lg">{phase.icon}</span>
                          <p className={cn('font-medium text-sm', isDisabled && 'opacity-60')}>
                            {phase.label}
                          </p>
                        </div>
                        {!isDisabled && phaseActivities.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {phaseActivities.length}
                          </Badge>
                        )}
                      </button>

                      {kannBearbeiten && (
                        <Switch
                          checked={!isDisabled}
                          onCheckedChange={() => handlePhaseToggle(phase.key)}
                          onClick={e => e.stopPropagation()}
                          className="shrink-0"
                        />
                      )}
                    </div>

                    {isExpanded && !isDisabled && (
                      <div className="mt-2">
                        <PhaseContent
                          paket={paket}
                          phaseKey={phase.key}
                          phaseLabel={phase.label}
                          kannBearbeiten={kannBearbeiten}
                          userEmail={userEmail}
                          queryClient={queryClient}
                          inEditMode={true}
                          onNavigate={(data) => {
                            onNavigate(data);
                          }}
                          onGoToTaskWorkshop={(activityId) => {
                            onNavigate({ type: 'goto-task-workshop', activityId });
                            handleCloseEditDialog();
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEditDialog}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editLernzielId} onOpenChange={(open) => { if (!open) setEditLernzielId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lernziel bearbeiten</DialogTitle>
          </DialogHeader>
          {editLernzielData && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Formulierung (Fachsprache)</Label>
                <input
                  type="text"
                  value={editLernzielData.formulierung_fachsprache || ''}
                  onChange={(e) => setEditLernzielData({ ...editLernzielData, formulierung_fachsprache: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input"
                  placeholder="Ich kann..."
                />
              </div>
              <div className="space-y-2">
                <Label>Kategorie</Label>
                <div className="flex gap-2">
                  {['Fachwissen', 'Fähigkeit/Fertigkeit'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setEditLernzielData({ ...editLernzielData, kategorie: cat })}
                      className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        editLernzielData.kategorie === cat
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Schüler-Übersetzung (optional)</Label>
                <input
                  type="text"
                  value={editLernzielData.schueler_uebersetzung || ''}
                  onChange={(e) => setEditLernzielData({ ...editLernzielData, schueler_uebersetzung: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input"
                  placeholder="Schülergerechte Formulierung..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditLernzielId(null)}>Abbrechen</Button>
            <Button
              onClick={async () => {
                if (!editLernzielId || !editLernzielData) return;
                try {
                  await base44.entities.Lernziele.update(editLernzielId, editLernzielData);
                  queryClient.invalidateQueries({ queryKey: ['lernziele'] });
                  setEditLernzielId(null);
                  setEditLernzielData(null);
                  toast.success('Lernziel gespeichert.');
                } catch (error) {
                  console.error('Fehler beim Speichern des Lernziels:', error);
                  toast.error('Fehler beim Speichern des Lernziels.');
                }
              }}
            >
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}