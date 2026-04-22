import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { getLernzielStatus, getLernpaketStatus, getEinheitFortschritt } from '@/lib/statusLogic';
import { cn } from '@/lib/utils';
import { useLernpaketLock } from '@/hooks/useLernpaketLock';
import { useEinheitLock } from '@/hooks/useEinheitLock';
import EinheitLockBanner from '@/components/workspace/EinheitLockBanner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import LernpaketForm from '@/components/lernpakete/LernpaketForm';
import LernzielForm from '@/components/lernziele/LernzielForm';
import AufgabenbausteinForm from '@/components/aufgaben/AufgabenbausteintForm';
import EinheitForm from '@/components/einheiten/EinheitForm';
import Ebene2MappingView from '@/components/aufgaben/Ebene2MappingView';
import ActivityContentForm from '@/components/workspace/ActivityContentForm';
import PhaseActivitiesSidebar from '@/components/workspace/PhaseActivitiesSidebar';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  BookOpen, Layers, Target, Puzzle, Plus, Edit, Trash2,
  Clock, Lock, Unlock, AlertCircle, CheckCircle2, ArrowDown,
  TrendingUp, AlertTriangle, PenLine, Save, X, Loader2, ChevronRight, Menu
} from 'lucide-react';
import SyncWarningBanner from '@/components/sync/SyncWarningBanner';

const kategorieColors = {
  'Fachwissen':          'bg-blue-100 text-blue-700',
  'Fähigkeit/Fertigkeit': 'bg-amber-100 text-amber-700',
};

const bausteinColors = {
  'Pre-Test':        'bg-yellow-100 text-yellow-700',
  'Input':           'bg-blue-100 text-blue-700',
  'Ebene-1-Übung':   'bg-green-100 text-green-700',
  'Ebene-2-Aufgabe': 'bg-cyan-100 text-cyan-700',
  'Ebene-3-Projekt': 'bg-purple-100 text-purple-700',
  'Exit-Check':      'bg-orange-100 text-orange-700',
  'Prüfung Typ A':   'bg-red-100 text-red-700',
  'Prüfung Typ B':   'bg-red-100 text-red-700',
  'Prüfung Typ C':   'bg-red-100 text-red-700',
};

// ── Ampel-Banner ──────────────────────────────────────────────────────────────
// Farbiger Hinweis-Banner passend zum Status einer Ebene.

function AmpelBanner({ status, message }) {
  if (!status || status === 'green') return null;
  const cfg = status === 'yellow'
    ? { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', Icon: AlertCircle }
    : { bg: 'bg-red-50 border-red-200',     text: 'text-red-600',   Icon: AlertTriangle };
  const { bg, text, Icon } = cfg;
  return (
    <div className={`flex items-start gap-2 p-3 rounded-lg border text-sm mb-4 ${bg} ${text}`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

// ── Status-Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  if (!status) return null;
  const cfg = {
    green:  'bg-green-100 text-green-700',
    yellow: 'bg-amber-100 text-amber-700',
    red:    'bg-red-100 text-red-600',
  };
  const label = { green: 'Vollständig', yellow: 'In Bearbeitung', red: 'Unvollständig' };
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${cfg[status] || ''}`}>
      {label[status]}
    </span>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function StepEmptyState({ icon: Icon, title, description, actionLabel, onAction, status = 'red' }) {
  const ringColor = status === 'red' ? 'bg-red-50 ring-2 ring-red-100' : 'bg-muted';
  const iconColor = status === 'red' ? 'text-red-300' : 'text-muted-foreground/50';
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${ringColor}`}>
        <Icon className={`w-8 h-8 ${iconColor}`} />
      </div>
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="gap-2">
          <Plus className="w-4 h-4" />{actionLabel}
        </Button>
      )}
    </div>
  );
}

// ── Panel: Themenfeld-Übersicht ───────────────────────────────────────────────

function ThemenfeldPanel({ themenfeld, lernpakete, kannBearbeiten, queryClient }) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    titel: themenfeld?.titel || '',
    beschreibung: themenfeld?.beschreibung || '',
    bearbeitungsmodus: themenfeld?.bearbeitungsmodus || 'offen',
  });

  const updateThemenfeld = useMutation({
    mutationFn: (data) => base44.entities.Themenfeld.update(themenfeld.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['themenfelder'] });
      setIsEditing(false);
    },
    onError: () => toast.error('Fehler beim Speichern des Themenfelds.'),
  });

  const paketeFuerThemenfeld = lernpakete.filter(p => p.themenfeld_id === themenfeld?.id);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold">{themenfeld?.titel}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {paketeFuerThemenfeld.length} Lernpaket{paketeFuerThemenfeld.length !== 1 ? 'e' : ''}
          </p>
        </div>
        {kannBearbeiten && (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)} className="gap-2">
            <Edit className="w-4 h-4" /> {isEditing ? 'Abbrechen' : 'Bearbeiten'}
          </Button>
        )}
      </div>

      {!isEditing ? (
        <div className="space-y-4 p-4 rounded-lg border bg-card">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Beschreibung</p>
            <p className="text-sm">{themenfeld?.beschreibung || <span className="text-muted-foreground italic">Keine Beschreibung</span>}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Bearbeitungsmodus</p>
            <Badge variant={themenfeld?.bearbeitungsmodus === 'sequenziell' ? 'default' : 'secondary'}>
              {themenfeld?.bearbeitungsmodus === 'sequenziell' ? 'Sequenziell' : 'Offen'}
            </Badge>
          </div>
        </div>
      ) : (
        <div className="space-y-4 p-4 rounded-lg border bg-card">
          <div className="space-y-2">
            <Label>Titel</Label>
            <input
              type="text"
              value={form.titel}
              onChange={(e) => setForm({ ...form, titel: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-input"
              placeholder="Themenfeld-Titel"
            />
          </div>
          <div className="space-y-2">
            <Label>Beschreibung</Label>
            <textarea
              value={form.beschreibung}
              onChange={(e) => setForm({ ...form, beschreibung: e.target.value })}
              className="w-full max-w-full px-3 py-2 rounded-lg border border-input min-h-20 resize-none"
              placeholder="Kurzbeschreibung des Themenfelds"
            />
          </div>
          <div className="space-y-2">
            <Label>Bearbeitungsmodus</Label>
            <select
              value={form.bearbeitungsmodus}
              onChange={(e) => setForm({ ...form, bearbeitungsmodus: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-input"
            >
              <option value="offen">Offen</option>
              <option value="sequenziell">Sequenziell</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
              className="flex-1"
            >
              Abbrechen
            </Button>
            <Button
              onClick={() => updateThemenfeld.mutate(form)}
              disabled={updateThemenfeld.isPending}
              className="flex-1 gap-2"
            >
              {updateThemenfeld.isPending && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Speichern
            </Button>
          </div>
        </div>
      )}

      {paketeFuerThemenfeld.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Lernpakete in diesem Themenfeld</h3>
          <div className="space-y-2">
            {paketeFuerThemenfeld.map(paket => (
              <div key={paket.id} className="p-3 rounded-lg border bg-card flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{paket.titel_des_pakets}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />{paket.geschaetzte_dauer_minuten} Min.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Panel: Einheit-Übersicht ──────────────────────────────────────────────────

function EinheitPanel({ einheit, lernpakete, lernziele, aufgaben, themenfelder = [], kannBearbeiten, userEmail, onNavigate, onEdit }) {
  const { data: lernpaketPhaseAktivitaeten = [] } = useQuery({
    queryKey: ['lernpaketPhaseAktivitaeten'],
    queryFn: () => base44.entities.LernpaketPhaseAktivitaet.list(),
  });
  
  const { prozent, gruen, gesamt } = getEinheitFortschritt(lernpakete, lernziele, aufgaben, userEmail, [], lernpaketPhaseAktivitaeten);
  const barColor =
    prozent === 100 ? 'bg-green-500' :
    prozent > 50    ? 'bg-amber-400' : 'bg-red-400';

  return (
    <div className="space-y-6">
      {/* Warn-Banner: Nach Export erneut geändert */}
      <SyncWarningBanner item={einheit} isBasismodul={false} />

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold">{einheit.titel_der_einheit}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {einheit.fach} · Jahrgang {einheit.jahrgangsstufe}
          </p>
        </div>
        {kannBearbeiten && (
          <Button variant="outline" size="sm" onClick={onEdit} className="gap-2">
            <Edit className="w-4 h-4" /> Bearbeiten
          </Button>
        )}
      </div>

      {/* Fortschrittsbalken */}
      <div className="p-5 rounded-xl border bg-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Gesamtfortschritt</span>
          </div>
          <StatusBadge status={prozent === 100 ? 'green' : prozent > 0 ? 'yellow' : 'red'} />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${barColor}`}
              style={{ width: `${prozent}%` }}
            />
          </div>
          <span className="text-sm font-bold tabular-nums w-10 text-right">{prozent} %</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {gruen} von {gesamt} Lernpaketen vollständig ausgearbeitet
        </p>
      </div>

      {lernpakete.length === 0 && (
        <AmpelBanner status="red" message="Legen Sie zunächst ein Lernpaket an, um mit der Planung zu beginnen." />
      )}

      {/* Pakete-Liste mit Themenfeldern */}
      <div className="space-y-3">
        {themenfelder.length > 0 ? (
          themenfelder.map(tf => {
            const paketeFuerThemenfeld = lernpakete.filter(p => p.themenfeld_id === tf.id).sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0));
            if (paketeFuerThemenfeld.length === 0) return null;
            const isSequenziellThemenfeld = tf.bearbeitungsmodus === 'sequenziell';
            return (
              <div key={tf.id} className="space-y-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">{tf.titel}</p>
                <div className="space-y-2">
                  {paketeFuerThemenfeld.map(paket => {
                    const pStatus = getLernpaketStatus(paket, lernziele, aufgaben, userEmail, [], lernpaketPhaseAktivitaeten);
                    const dotColor = pStatus === 'green' ? 'bg-green-500' : pStatus === 'yellow' ? 'bg-amber-400' : 'bg-red-500';
                    return (
                      <button
                        key={paket.id}
                        onClick={() => onNavigate({ type: 'lernpaket', id: paket.id, data: paket })}
                        className="w-full flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-muted transition-colors text-left"
                      >
                        {isSequenziellThemenfeld ? (
                          <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {paket.reihenfolge_nummer}
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-sm text-slate-500">◉</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{paket.titel_des_pakets}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />{paket.geschaetzte_dauer_minuten} Min.
                          </p>
                        </div>
                        <span className={`w-2.5 h-2.5 rounded-full ring-2 ring-offset-1 shrink-0 ${dotColor}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          lernpakete.map(paket => {
            const pStatus = getLernpaketStatus(paket, lernziele, aufgaben, userEmail, [], lernpaketPhaseAktivitaeten);
            const dotColor = pStatus === 'green' ? 'bg-green-500' : pStatus === 'yellow' ? 'bg-amber-400' : 'bg-red-500';
            return (
              <button
                key={paket.id}
                onClick={() => onNavigate({ type: 'lernpaket', id: paket.id, data: paket })}
                className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors text-left"
              >
                <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {paket.reihenfolge_nummer}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{paket.titel_des_pakets}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />{paket.geschaetzte_dauer_minuten} Min.
                  </p>
                </div>
                <span className={`w-2.5 h-2.5 rounded-full ring-2 ring-offset-1 shrink-0 ${dotColor}`} />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Panel: Lernpaket mit Phasen ───────────────────────────────────────────────

function LernpaketPanel({ paket, lernziele, aufgaben, kannBearbeiten, userEmail, istAdmin, onNavigate: onNavigateRaw, onNewLernziel, onDelete }) {
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

  // Lade Aktivitäten für diese Phase
  const { data: lernpaketAktivitaeten = [] } = useQuery({
    queryKey: ['lernpaketPhaseAktivitaeten'],
    queryFn: () => base44.entities.LernpaketPhaseAktivitaet.list(),
  });

  // Lock-Management: Nur während Dialog offen ist
  const { canEdit, isLockedByOther, lockedByEmail, isLoading: isLockLoading, acquireLock, releaseLock } = useLernpaketLock(paket.id);
  const [isAcquiringLock, setIsAcquiringLock] = useState(false);

  // Dialog öffnen = Lock erwerben
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

  // Dialog schließen = Lock freigeben (immer, egal ob Speichern oder Abbrechen)
  const handleCloseEditDialog = async () => {
    setEditDialogOpen(false);
    setIsAcquiringLock(false);
    await releaseLock();
  };

  // Sync localTitel und Phasen-Config wenn Paket von außen aktualisiert wird
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
    // Optimistisch aktualisieren
    setLocalPhasenConfig(newConfig);
    // Mit Backend synchronisieren
    base44.entities.Lernpakete.update(paket.id, { phasen_konfiguration: newConfig }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
    }).catch(() => {
      // Fehler: Revert auf alten State und Nutzer informieren
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

  // Handler für Bearbeitungsmodus
  const handleEnterEditMode = async () => {
    try {
      const ok = await acquireLock();
      if (!ok) {
        toast.error(`🔒 Dieses Lernpaket wird aktuell von ${lockedByEmail} bearbeitet.`);
      }
    } catch (err) {
      toast.error('Fehler beim Sperren des Lernpakets.');
    }
  };

  const handleExitEditMode = async () => {
    await releaseLock();
  };

  return (
    <div className="space-y-6">
      {/* Lock-Status Banner */}
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
          {kannBearbeiten && !isLockedByOther && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleOpenEditDialog}
              disabled={isAcquiringLock}
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
          {kannBearbeiten && !isLockedByOther && (
            <Button variant="ghost" size="icon" onClick={onDelete} title="Lernpaket löschen">
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




      {/* Lernziele-Anzeige */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground">Zugeordnete Lernziele</h3>
          {canEdit && kannBearbeiten && paketZiele.length > 0 && (
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
                  {canEdit && kannBearbeiten && (
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

      {/* Edit Dialog für Lernpaket */}
      <Dialog open={editDialogOpen} onOpenChange={handleCloseEditDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>📦 {paket.titel_des_pakets} bearbeiten</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Phasen als Accordions */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Lernphasen</h3>
              {PHASES.map(phase => {
                const phaseConfig = localPhasenConfig[phase.key] || {};
                const isDisabled = phaseConfig.disabled === true;
                const isExpanded = expandedPhase === phase.key;
                const phaseActivities = lernpaketAktivitaeten.filter(a => a.lernpaket_id === paket.id && a.phase === phase.key);

                return (
                  <div key={phase.key} className="space-y-0">
                    {/* Accordion Header */}
                    <div className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border bg-card transition-all',
                      isDisabled
                        ? 'opacity-60'
                        : 'hover:bg-muted hover:border-primary/30'
                    )}>
                      {/* Chevron + Click-Area */}
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

                      {/* Phase-Toggle Switch */}
                      {kannBearbeiten && (
                        <Switch
                          checked={!isDisabled}
                          onCheckedChange={() => handlePhaseToggle(phase.key)}
                          onClick={e => e.stopPropagation()}
                          className="shrink-0"
                        />
                      )}
                    </div>

                    {/* Phase Content */}
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

      {/* Phasen als Accordions – NUR im Lesemodus außerhalb des Dialogs (VERSTECKT) */}
      {false && <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">Lernphasen</h3>
        {PHASES.map(phase => {
          const phaseConfig = localPhasenConfig[phase.key] || {};
          const isDisabled = phaseConfig.disabled === true;
          const isExpanded = expandedPhase === phase.key;
          const phaseActivities = lernpaketAktivitaeten.filter(a => a.lernpaket_id === paket.id && a.phase === phase.key);

          return (
            <div key={phase.key} className="space-y-0">
              {/* Accordion Header mit Chevron, Badge, Toggle und Hover-Effekt */}
              <div className={cn(
                'flex items-center gap-3 p-3 rounded-lg border bg-card transition-all',
                isDisabled
                  ? 'opacity-60'
                  : 'hover:bg-muted hover:border-primary/30'
              )}>
                {/* Chevron + Click-Area */}
                <button
                  onClick={() => !isDisabled && setExpandedPhase(isExpanded ? null : phase.key)}
                  disabled={isDisabled}
                  className="flex items-center gap-3 flex-1 cursor-pointer disabled:cursor-not-allowed"
                  title={isExpanded ? 'Einklappen' : 'Ausklappen'}
                >
                  <ChevronRight
                    className={cn(
                      'w-5 h-5 text-muted-foreground transition-transform shrink-0',
                      isExpanded && 'rotate-90'
                    )}
                  />

                  {/* Phase Icon + Label */}
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-lg">{phase.icon}</span>
                    <p className={cn('font-medium text-sm', isDisabled && 'opacity-60')}>
                      {phase.label}
                    </p>
                  </div>

                  {/* Aktivitäts-Count Badge */}
                  {!isDisabled && phaseActivities.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {phaseActivities.length} {phaseActivities.length === 1 ? 'Aktivität' : 'Aktivitäten'}
                    </Badge>
                  )}

                  {/* Deaktiviert-Info */}
                  {isDisabled && (
                    <span className="text-xs text-muted-foreground/60">Deaktiviert</span>
                  )}
                </button>

                {/* Burger-Menü Button (lg-breaker) */}
                {!isDisabled && (
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
                    title="Aktivitäten auswählen"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>}

      {/* Edit Lernziel Dialog */}
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

// ── Panel: Lernziel ───────────────────────────────────────────────────────────

function LernzielPanel({ lernziel, paketId, aufgaben, userEmail, kannBearbeiten, istAdmin, onNewAufgabe, onDelete }) {
  const queryClient = useQueryClient();
  const [editAufgabe, setEditAufgabe] = useState(null);
  const [editLernzielMode, setEditLernzielMode] = useState(false);
  const [editLernzielData, setEditLernzielData] = useState(null);

  const lzAufgaben = aufgaben.filter(a => a.lernpaket_id === paketId && a.lernziel_id === lernziel.id);
  const lzStatus   = getLernzielStatus(lernziel, aufgaben, paketId, userEmail);

  const updateAufgabe = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Aufgabenbausteine.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['aufgaben'] }); setEditAufgabe(null); },
    onError: () => toast.error('Fehler beim Speichern des Aufgabenbausteins.'),
  });
  const deleteAufgabe = useMutation({
    mutationFn: (id) => base44.entities.Aufgabenbausteine.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['aufgaben'] }),
    onError: () => toast.error('Fehler beim Löschen des Aufgabenbausteins.'),
  });

  const handleEdit = (aufgabe) => {
    setEditAufgabe(aufgabe);
  };

  const handleEditClose = async (data) => {
    if (data && editAufgabe) await updateAufgabe.mutateAsync({ id: editAufgabe.id, data });
    setEditAufgabe(null);
  };

  const ampelMsg = {
    red:    'Dieses Lernziel hat noch keine Aufgabenbausteine. Fügen Sie jetzt den ersten Baustein hinzu.',
    yellow: 'Das Constructive Alignment ist noch unvollständig – es fehlen Bausteine für einzelne Anforderungsebenen oder ein Baustein ist gesperrt.',
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
         <div>
           <div className="flex items-center gap-2 mb-2 flex-wrap">
             {lernziel.kategorie && (
               <Badge className={kategorieColors[lernziel.kategorie] || ''}>{lernziel.kategorie}</Badge>
             )}
             <StatusBadge status={lzStatus} />
             {editLernzielMode && (
               <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 border border-blue-200 text-blue-700 text-xs font-medium">
                 <PenLine className="w-3 h-3" />
                 In Bearbeitung
               </div>
             )}
           </div>
           {!editLernzielMode ? (
             <>
               <h2 className="text-xl font-bold leading-snug">{lernziel.formulierung_fachsprache}</h2>
               {lernziel.schueler_uebersetzung && (
                 <p className="text-sm text-muted-foreground mt-2 italic">„{lernziel.schueler_uebersetzung}"</p>
               )}
             </>
           ) : (
             <div className="space-y-3 mt-3">
               <div className="space-y-1">
                 <label className="text-xs font-semibold">Formulierung (Fachsprache)</label>
                 <input
                   type="text"
                   value={editLernzielData?.formulierung_fachsprache || ''}
                   onChange={(e) => setEditLernzielData({ ...editLernzielData, formulierung_fachsprache: e.target.value })}
                   className="w-full px-3 py-2 rounded-lg border border-input text-sm"
                   placeholder="Ich kann..."
                 />
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-semibold">Kategorie</label>
                 <div className="flex gap-2">
                   {['Fachwissen', 'Fähigkeit/Fertigkeit'].map(cat => (
                     <button
                       key={cat}
                       onClick={() => setEditLernzielData({ ...editLernzielData, kategorie: cat })}
                       className={`flex-1 py-1.5 px-2 rounded-lg border-2 text-xs font-medium transition-all ${
                         editLernzielData?.kategorie === cat
                           ? 'border-primary bg-primary/10 text-primary'
                           : 'border-border hover:border-primary/40'
                       }`}
                     >
                       {cat}
                     </button>
                   ))}
                 </div>
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-semibold">Schüler-Übersetzung (optional)</label>
                 <input
                   type="text"
                   value={editLernzielData?.schueler_uebersetzung || ''}
                   onChange={(e) => setEditLernzielData({ ...editLernzielData, schueler_uebersetzung: e.target.value })}
                   className="w-full px-3 py-2 rounded-lg border border-input text-sm"
                   placeholder="Schülergerechte Formulierung..."
                 />
               </div>
             </div>
           )}
         </div>
         <div className="flex items-center gap-2 shrink-0">
           {!editLernzielMode && kannBearbeiten && (
             <Button variant="outline" size="sm" onClick={() => {
               setEditLernzielMode(true);
               setEditLernzielData({
                 formulierung_fachsprache: lernziel.formulierung_fachsprache,
                 kategorie: lernziel.kategorie,
                 schueler_uebersetzung: lernziel.schueler_uebersetzung,
               });
             }} className="gap-2">
               <PenLine className="w-3.5 h-3.5" />
               Bearbeiten
             </Button>
           )}
           {editLernzielMode && (
             <>
               <Button variant="default" size="sm" onClick={async () => {
                 try {
                   await base44.entities.Lernziele.update(lernziel.id, editLernzielData);
                   queryClient.invalidateQueries({ queryKey: ['lernziele'] });
                   setEditLernzielMode(false);
                   setEditLernzielData(null);
                   toast.success('Lernziel gespeichert.');
                 } catch (error) {
                   console.error('Fehler:', error);
                   toast.error('Fehler beim Speichern des Lernziels.');
                 }
               }} className="gap-2">
                 <Save className="w-3.5 h-3.5" />
                 Speichern
               </Button>
               <Button variant="outline" size="sm" onClick={() => {
                 setEditLernzielMode(false);
                 setEditLernzielData(null);
               }} className="gap-2">
                 <X className="w-3.5 h-3.5" />
                 Abbrechen
               </Button>
             </>
           )}
           {!editLernzielMode && kannBearbeiten && (
             <Button variant="ghost" size="icon" onClick={onDelete}>
               <Trash2 className="w-4 h-4 text-destructive" />
             </Button>
           )}
         </div>
       </div>

      <AmpelBanner status={lzStatus} message={ampelMsg[lzStatus]} />

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowDown className="w-4 h-4" />
        <span>Aufgabenbausteine</span>
        <span className="text-xs">({lzAufgaben.length})</span>
      </div>

      {lzAufgaben.length === 0 ? (
        <StepEmptyState
          icon={Puzzle}
          title="Noch keine Aufgabenbausteine"
          description={kannBearbeiten
            ? "Erstellen Sie jetzt den ersten Baustein – z. B. einen Pre-Test oder Input."
            : "Für dieses Lernziel gibt es noch keine Aufgabenbausteine."}
          actionLabel={kannBearbeiten ? "Jetzt ersten Baustein anlegen" : undefined}
          onAction={kannBearbeiten ? onNewAufgabe : undefined}
          status="red"
        />
      ) : (
        <div className="space-y-3">
          {kannBearbeiten && (
            <Button onClick={onNewAufgabe} size="sm" variant="outline" className="gap-2">
              <Plus className="w-4 h-4" /> Baustein hinzufügen
            </Button>
          )}
          {lzAufgaben.map(aufgabe => (
            <div
              key={aufgabe.id}
              className="p-4 rounded-xl border transition-all bg-card border-border hover:border-primary/30"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge className={`text-[10px] ${bausteinColors[aufgabe.baustein_typ] || ''}`}>
                        {aufgabe.baustein_typ}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {kannBearbeiten && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
                        onClick={() => handleEdit(aufgabe)}>
                        <Edit className="w-3 h-3" />
                        Bearbeiten
                      </Button>
                    )}
                    {kannBearbeiten && (
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => deleteAufgabe.mutate(aufgabe.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
                {aufgabe.aufgabentext_inhalt && (
                  <p className="text-sm text-muted-foreground">{aufgabe.aufgabentext_inhalt}</p>
                )}
                {aufgabe.erwartungshorizont_ki_prompt && (
                  <p className="text-xs text-muted-foreground/60 mt-2 italic line-clamp-1">
                    KI: {aufgabe.erwartungshorizont_ki_prompt}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AufgabenbausteinForm
        open={!!editAufgabe}
        onOpenChange={(open) => { if (!open) handleEditClose(null); }}
        onSubmit={handleEditClose}
        initialData={editAufgabe}
        lernziele={[lernziel]}
        isEdit
      />
    </div>
  );
}

// ── AktivitaetEditPanel: Direkt-Bearbeitungsansicht aus dem Baum ──────────────

function AktivitaetEditPanel({ paket, phaseKey, phaseLabel, kannBearbeiten, queryClient, activityRecordId }) {
  const [contentFormOpen, setContentFormOpen] = useState(false);

  const { data: aktivitaeten = [] } = useQuery({
    queryKey: ['aktivitaeten'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list(),
  });

  const phasenConfig = paket.phasen_konfiguration || {};
  const phaseConfig = phasenConfig[phaseKey] || {};
  const aktivitaet = aktivitaeten.find(a => a.id === phaseConfig.selected_aktivitaet_id);

  // Öffne die ContentForm automatisch beim Mounten
  React.useEffect(() => {
    if (aktivitaet) setContentFormOpen(true);
  }, [aktivitaet?.id]);

  if (!aktivitaet) {
    return (
      <StepEmptyState
        icon={Puzzle}
        title="Aktivität nicht gefunden"
        description="Die dieser Phase zugeordnete Aktivität konnte nicht geladen werden."
        status="yellow"
      />
    );
  }

  return (
    <>
      <div className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground">{phaseLabel}</p>
          <h2 className="text-lg font-bold">{aktivitaet.name}</h2>
        </div>
        {kannBearbeiten && (
          <Button onClick={() => setContentFormOpen(true)} className="gap-2">
            <Edit className="w-4 h-4" /> Inhalt bearbeiten
          </Button>
        )}
      </div>

      <ActivityContentForm
        open={contentFormOpen}
        onOpenChange={setContentFormOpen}
        aktivitaet={aktivitaet}
        initialData={phaseConfig.field_values || {}}
        onSave={async ({ content_data, is_complete }) => {
          const newConfig = {
            ...phasenConfig,
            [phaseKey]: {
              ...phaseConfig,
              field_values: content_data,
              is_complete,
            },
          };
          try {
            // Schreibe in beide Datenstrukturen für Konsistenz
            await base44.entities.Lernpakete.update(paket.id, { phasen_konfiguration: newConfig });
            // Aktualisiere auch den LernpaketPhaseAktivitaet-Record (neue Architektur)
            if (activityRecordId) {
              await base44.entities.LernpaketPhaseAktivitaet.update(activityRecordId, {
                field_values: content_data,
                is_complete,
              });
            }
            queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
            queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
            setContentFormOpen(false);
          } catch (err) {
            const { toast: showToast } = await import('sonner');
            showToast.error('Fehler beim Speichern: ' + (err.message || 'Unbekannter Fehler'));
          }
        }}
      />
    </>
  );
}

// ── PhaseContent: Aktivitäten-Anzeige und -Verwaltung ─────────────────────────

import UnsavedChangesExitModal from '@/components/workspace/UnsavedChangesExitModal';

function PhaseContent({ paket, phaseKey, phaseLabel, kannBearbeiten, userEmail, queryClient, onNavigate, onGoToTaskWorkshop, inEditMode, sidebarOpen, setSidebarOpen }) {
  return (
    <PhaseActivitiesSidebar
      paket={paket}
      phase={phaseKey}
      phaseLabel={phaseLabel}
      kannBearbeiten={kannBearbeiten}
      userEmail={userEmail}
      inEditMode={inEditMode}
      onSelectActivity={(data) => onNavigate({
        type: 'aktivitaet-edit',
        id: data.activityId,
        phase: data.phaseKey,
        paketId: data.paketId,
        activityRecordId: data.activityId,
      })}
      onGoToTaskWorkshop={onGoToTaskWorkshop}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
    />
  );
}

// ── Haupt-Export ──────────────────────────────────────────────────────────────

export default function WorkspaceDetailPanel({
  selectedNode, einheit, lernpakete, lernziele, aufgaben,
  userEmail, kannBearbeiten, istAdmin,
  onNavigate, onDeleteLernpaket, onDeleteLernziel,
}) {
  // Makro-Lock prüfen
  const { isUnitLocked, lockedByEmail } = useEinheitLock(einheit?.id);

  // Prüfen ob eine Ebene-2-Aufgabe ausgewählt ist
  const selectedAufgabe = selectedNode?.type === 'aufgabe'
    ? aufgaben.find(a => a.id === selectedNode.id)
    : null;
  const isEbene2Aufgabe = selectedAufgabe?.baustein_typ === 'Ebene-2-Aufgabe';

  const [lernpaketFormOpen, setLernpaketFormOpen] = useState(false);
  const [lernzielFormOpen,  setLernzielFormOpen]  = useState(false);
  const [lernzielPaketId, setLernzielPaketId] = useState(null);
  const [aufgabeFormOpen,   setAufgabeFormOpen]   = useState(false);
  const [editEinheitOpen,   setEditEinheitOpen]   = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (selectedNode?.type === 'new-lernpaket') setLernpaketFormOpen(true);
    if (selectedNode?.type === 'new-lernziel')  setLernzielFormOpen(true);
    if (selectedNode?.type === 'new-aufgabe')   setAufgabeFormOpen(true);
  }, [selectedNode]);

  const createLernpaket = useMutation({
    mutationFn: (data) => {
      if (!data.titel_des_pakets?.trim() || !data.einheit_id?.trim()) {
        throw new Error('Titel und Einheit sind erforderlich');
      }
      return base44.entities.Lernpakete.create({ ...data, einheit_id: einheit?.id });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lernpakete'] }),
    onError: (error) => {
      console.error('Fehler beim Erstellen des Pakets:', error);
      toast.error(`Fehler: ${error.message}`);
    },
  });
  
  const createLernziel = useMutation({
    mutationFn: (data) => {
      const paketId = lernzielPaketId || selectedNode?.paketId || selectedNode?.data?.lernpaket_id;
      if (!data.formulierung_fachsprache?.trim()) {
        throw new Error('Formulierung ist erforderlich');
      }
      if (!paketId) {
        throw new Error('Lernpaket-ID fehlt');
      }
      return base44.entities.Lernziele.create({
        ...data,
        lernpaket_id: paketId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lernziele'] });
      setLernzielFormOpen(false);
      setLernzielPaketId(null);
      toast.success('Lernziel erstellt.');
    },
    onError: (error) => {
      console.error('Fehler beim Erstellen des Lernziels:', error);
      toast.error(`Fehler: ${error.message}`);
    },
  });
  
  const createAufgabe = useMutation({
    mutationFn: (data) => {
      if (!data.baustein_typ?.trim()) {
        throw new Error('Baustein-Typ ist erforderlich');
      }
      const clean = { ...data, lernpaket_id: selectedNode?.paketId, lernziel_id: selectedNode?.lernzielId };
      if (clean.lernziel_id === 'none') delete clean.lernziel_id;
      return base44.entities.Aufgabenbausteine.create(clean);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['aufgaben'] }),
    onError: (error) => {
      console.error('Fehler beim Erstellen der Aufgabe:', error);
      toast.error(`Fehler: ${error.message}`);
    },
  });
  const updateEinheit = useMutation({
    mutationFn: (data) => base44.entities.Einheiten.update(einheit?.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['einheiten'] }),
    onError: () => toast.error('Fehler beim Speichern der Einheit.'),
  });

  if (!selectedNode) {
    return (
      <div className="space-y-4">
        <EinheitLockBanner isUnitLocked={isUnitLocked} lockedByEmail={lockedByEmail} />
        <StepEmptyState
          icon={BookOpen}
          title="Wählen Sie einen Eintrag aus"
          description="Klicken Sie links auf einen Eintrag in der Struktur, um hier die Details zu sehen."
          status="yellow"
        />
      </div>
    );
  }

  const type = selectedNode.type;

  if (type === 'einheit') {
    return null;
  }

  if (type === 'lernpaket') {
    const paket = lernpakete.find(p => p.id === selectedNode.id);
    if (!paket) return null;
    // Blockiere Bearbeitungsmodus wenn Einheit gesperrt ist
    const effectiveKannBearbeiten = kannBearbeiten && !isUnitLocked;
    return (
      <>
        <EinheitLockBanner isUnitLocked={isUnitLocked} lockedByEmail={lockedByEmail} />
        <LernpaketPanel
          paket={paket}
          lernziele={lernziele}
          aufgaben={aufgaben}
          kannBearbeiten={effectiveKannBearbeiten}
          userEmail={userEmail}
          istAdmin={istAdmin}
          onNavigate={onNavigate}
          onNewLernziel={() => {
            setLernzielPaketId(paket.id);
            setLernzielFormOpen(true);
          }}
          onDelete={() => onDeleteLernpaket(paket.id)}
        />
        <LernzielForm
          open={lernzielFormOpen}
          onOpenChange={(open) => {
            setLernzielFormOpen(open);
            if (!open) setLernzielPaketId(null);
          }}
          onSubmit={(data) => createLernziel.mutate(data)}
        />
      </>
    );
  }

  if (type === 'lernziel') {
    return null; // Lernziele werden jetzt nur noch im LernpaketPanel bearbeitet
  }

  if (type === 'themenfeld') {
    const themenfeld = selectedNode.themenfelder?.find(tf => tf.id === selectedNode.themenfeldId);
    if (!themenfeld) return null;
    return (
      <ThemenfeldPanel
        themenfeld={themenfeld}
        lernpakete={lernpakete}
        kannBearbeiten={kannBearbeiten}
        queryClient={queryClient}
      />
    );
  }

  if (type === 'aktivitaet-edit') {
    const paket = lernpakete.find(p => p.id === selectedNode.paketId);
    if (!paket) return null;
    const phaseKeyMap = { input: 'Input', uebung: 'Übung', abschluss: 'Abschluss' };
    const phaseKey = phaseKeyMap[selectedNode.phase] || selectedNode.phase;
    const phaseLabelMap = { 'Input': 'Input (Erarbeitung)', 'Übung': 'Übung', 'Abschluss': 'Abschluss' };
    const phaseLabel = phaseLabelMap[phaseKey] || phaseKey;
    return (
      <AktivitaetEditPanel
        paket={paket}
        phaseKey={phaseKey}
        phaseLabel={phaseLabel}
        kannBearbeiten={kannBearbeiten}
        queryClient={queryClient}
        activityRecordId={selectedNode.id}
      />
    );
  }

  if (type === 'phase') {
    const paket = lernpakete.find(p => p.id === selectedNode.paketId);
    if (!paket) return null;
    
    const phaseKeyMap = { input: 'Input', uebung: 'Übung', abschluss: 'Abschluss' };
    const phaseKey = phaseKeyMap[selectedNode.phase] || selectedNode.phase;
    const phaseLabelMap = { 'Input': 'Input (Erarbeitung)', 'Übung': 'Übung', 'Abschluss': 'Abschluss' };
    const phaseLabel = phaseLabelMap[phaseKey] || phaseKey;
    
    return (
      <>
        <div>
          <h2 className="text-lg font-bold mb-4">{phaseLabel}</h2>
          <PhaseContent
            paket={paket}
            phaseKey={phaseKey}
            phaseLabel={phaseLabel}
            kannBearbeiten={kannBearbeiten}
            userEmail={userEmail}
            queryClient={queryClient}
            inEditMode={false}
            onNavigate={onNavigate}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />
        </div>
      </>
    );
  }

  if (type === 'new-lernpaket') {
    return (
      <>
        <StepEmptyState icon={Layers} title="Neues Lernpaket" description="Das Formular öffnet sich automatisch." status="yellow" />
        <LernpaketForm
          open={lernpaketFormOpen}
          onOpenChange={setLernpaketFormOpen}
          onSubmit={(data) => createLernpaket.mutate(data)}
          nextOrder={lernpakete.length + 1}
        />
      </>
    );
  }

  if (type === 'new-lernziel') {
    return (
      <>
        <StepEmptyState icon={Target} title="Neues Lernziel" description="Das Formular öffnet sich automatisch." status="yellow" />
        <LernzielForm
          open={lernzielFormOpen}
          onOpenChange={setLernzielFormOpen}
          onSubmit={(data) => createLernziel.mutate(data)}
        />
      </>
    );
  }

  if (type === 'aufgabe' && isEbene2Aufgabe) {
    const lernpaketIdFuerAufgabe = selectedAufgabe.lernpaket_id;
    return (
      <Ebene2MappingView
        aufgabe={selectedAufgabe}
        lernpaketId={lernpaketIdFuerAufgabe}
        einheitId={einheit?.id}
        kannBearbeiten={kannBearbeiten}
      />
    );
  }

  if (type === 'new-aufgabe') {
    const lernzielFuerNeu = lernziele.find(lz => lz.id === selectedNode.lernzielId);
    return (
      <>
        <StepEmptyState icon={Puzzle} title="Neuer Aufgabenbaustein" description="Das Formular öffnet sich automatisch." status="yellow" />
        <AufgabenbausteinForm
          open={aufgabeFormOpen}
          onOpenChange={setAufgabeFormOpen}
          onSubmit={(data) => createAufgabe.mutate(data)}
          lernziele={lernzielFuerNeu ? [lernzielFuerNeu] : []}
        />
      </>
    );
  }

  return null;
}