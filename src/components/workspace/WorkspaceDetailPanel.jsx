import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRecordLock } from '@/hooks/useRecordLock';
import { getLernzielStatus, getLernpaketStatus, getEinheitFortschritt } from '@/lib/statusLogic';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import LernpaketForm from '@/components/lernpakete/LernpaketForm';
import LernzielForm from '@/components/lernziele/LernzielForm';
import AufgabenbausteinForm from '@/components/aufgaben/AufgabenbausteintForm';
import EinheitForm from '@/components/einheiten/EinheitForm';
import Ebene2MappingView from '@/components/aufgaben/Ebene2MappingView';
import {
  BookOpen, Layers, Target, Puzzle, Plus, Edit, Trash2,
  Clock, Lock, Unlock, AlertCircle, CheckCircle2, ArrowDown,
  TrendingUp, AlertTriangle
} from 'lucide-react';

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

// ── Panel: Einheit-Übersicht ──────────────────────────────────────────────────

function EinheitPanel({ einheit, lernpakete, lernziele, aufgaben, kannBearbeiten, userEmail, onNavigate, onEdit }) {
  const { prozent, gruen, gesamt } = getEinheitFortschritt(lernpakete, lernziele, aufgaben, userEmail);
  const barColor =
    prozent === 100 ? 'bg-green-500' :
    prozent > 50    ? 'bg-amber-400' : 'bg-red-400';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold">{einheit.titel_der_einheit}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {einheit.fach} · Jahrgang {einheit.jahrgangsstufe} · {einheit.navigationslogik}
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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Lernpakete', value: lernpakete.length, icon: Layers, color: 'text-primary bg-primary/10' },
          { label: 'Lernziele',  value: lernziele.length,  icon: Target,  color: 'text-green-700 bg-green-100' },
          { label: 'Aufgaben',   value: aufgaben.length,   icon: Puzzle,  color: 'text-purple-700 bg-purple-100' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="p-4 rounded-xl border bg-card flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {lernpakete.length === 0 && (
        <AmpelBanner status="red" message="Legen Sie zunächst ein Lernpaket an, um mit der Planung zu beginnen." />
      )}

      {/* Pakete-Liste mit Ampel */}
      <div className="space-y-2">
        {lernpakete.map(paket => {
          const pStatus = getLernpaketStatus(paket, lernziele, aufgaben, userEmail);
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
        })}
      </div>
    </div>
  );
}

// ── Panel: Lernpaket ──────────────────────────────────────────────────────────

function LernpaketPanel({ paket, lernziele, aufgaben, kannBearbeiten, userEmail, onNavigate, onNewLernziel, onDelete }) {
  const paketZiele = lernziele.filter(lz => lz.lernpaket_id === paket.id);
  const pStatus = getLernpaketStatus(paket, lernziele, aufgaben, userEmail);

  const ampelMsg = {
    red:    'Dieses Lernpaket hat noch keine Lernziele. Fügen Sie jetzt das erste Lernziel hinzu.',
    yellow: 'Einige Lernziele fehlen noch Aufgabenbausteine oder sind gerade gesperrt.',
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
              {paket.reihenfolge_nummer}
            </div>
            <h2 className="text-xl font-bold">{paket.titel_des_pakets}</h2>
            <StatusBadge status={pStatus} />
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />{paket.geschaetzte_dauer_minuten} Minuten
          </p>
        </div>
        {kannBearbeiten && (
          <Button variant="ghost" size="icon" onClick={onDelete} title="Lernpaket löschen">
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        )}
      </div>

      <AmpelBanner status={pStatus} message={ampelMsg[pStatus]} />

      {paketZiele.length === 0 ? (
        <StepEmptyState
          icon={Target}
          title="Noch keine Lernziele"
          description="Definieren Sie zuerst Lernziele, bevor Aufgabenbausteine angelegt werden können."
          actionLabel={kannBearbeiten ? "Jetzt erstes Lernziel hinzufügen" : undefined}
          onAction={kannBearbeiten ? onNewLernziel : undefined}
          status="red"
        />
      ) : (
        <>
          {kannBearbeiten && (
            <Button onClick={onNewLernziel} size="sm" variant="outline" className="gap-2">
              <Plus className="w-4 h-4" /> Lernziel hinzufügen
            </Button>
          )}
          <div className="space-y-2">
            {paketZiele.map(lz => {
              const lzStatus = getLernzielStatus(lz, aufgaben, paket.id, userEmail);
              const dotColor = lzStatus === 'green' ? 'bg-green-500' : lzStatus === 'yellow' ? 'bg-amber-400' : 'bg-red-500';
              const lzAufgaben = aufgaben.filter(a => a.lernpaket_id === paket.id && a.lernziel_id === lz.id);
              return (
                <button
                  key={lz.id}
                  onClick={() => onNavigate({ type: 'lernziel', id: lz.id, data: lz, paketId: paket.id })}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg border hover:bg-muted transition-colors text-left ${
                    lzStatus === 'red' ? 'border-red-200 bg-red-50/50 hover:bg-red-50' : ''
                  }`}
                >
                  <Target className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{lz.formulierung_fachsprache}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {lz.kategorie && (
                        <Badge className={`text-[10px] ${kategorieColors[lz.kategorie] || ''}`}>
                          {lz.kategorie}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{lzAufgaben.length} Bausteine</span>
                    </div>
                  </div>
                  <span className={`w-2.5 h-2.5 rounded-full ring-2 ring-offset-1 shrink-0 mt-1 ${dotColor}`} />
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Panel: Lernziel ───────────────────────────────────────────────────────────

function LernzielPanel({ lernziel, paketId, aufgaben, userEmail, kannBearbeiten, istAdmin, onNewAufgabe, onDelete }) {
  const { acquireLock, releaseLock, forceReleaseLock, isLockedByOther } = useRecordLock();
  const queryClient = useQueryClient();
  const [editAufgabe, setEditAufgabe] = useState(null);
  const [acquiring, setAcquiring]     = useState(null);

  const lzAufgaben = aufgaben.filter(a => a.lernpaket_id === paketId && a.lernziel_id === lernziel.id);
  const lzStatus   = getLernzielStatus(lernziel, aufgaben, paketId, userEmail);

  const updateAufgabe = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Aufgabenbausteine.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['aufgaben'] }); setEditAufgabe(null); },
  });
  const deleteAufgabe = useMutation({
    mutationFn: (id) => base44.entities.Aufgabenbausteine.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['aufgaben'] }),
  });

  const handleEdit = async (aufgabe) => {
    setAcquiring(aufgabe.id);
    const ok = await acquireLock(aufgabe.id, userEmail);
    setAcquiring(null);
    if (ok) setEditAufgabe(aufgabe);
  };

  const handleEditClose = async (data) => {
    if (data && editAufgabe) await updateAufgabe.mutateAsync({ id: editAufgabe.id, data });
    if (editAufgabe) await releaseLock(editAufgabe.id, userEmail);
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
          </div>
          <h2 className="text-xl font-bold leading-snug">{lernziel.formulierung_fachsprache}</h2>
          {lernziel.schueler_uebersetzung && (
            <p className="text-sm text-muted-foreground mt-2 italic">„{lernziel.schueler_uebersetzung}"</p>
          )}
        </div>
        {kannBearbeiten && (
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        )}
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
          {lzAufgaben.map(aufgabe => {
            const lockedByOther = isLockedByOther(aufgabe, userEmail);
            const lockedByMe    = aufgabe.lock_status && aufgabe.locked_by_user === userEmail;
            return (
              <div
                key={aufgabe.id}
                className={`p-4 rounded-xl border transition-all ${
                  lockedByOther ? 'bg-amber-50 border-amber-200' :
                  lockedByMe    ? 'bg-primary/5 border-primary/30' :
                                  'bg-card border-border hover:border-primary/30'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge className={`text-[10px] ${bausteinColors[aufgabe.baustein_typ] || ''}`}>
                        {aufgabe.baustein_typ}
                      </Badge>
                      {lockedByOther && (
                        <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Gesperrt von {aufgabe.locked_by_user}
                        </span>
                      )}
                      {lockedByMe && (
                        <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Von mir bearbeitet
                        </span>
                      )}
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
                  <div className="flex items-center gap-1 shrink-0">
                    {kannBearbeiten && !lockedByOther && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
                        onClick={() => handleEdit(aufgabe)} disabled={!!acquiring}>
                        {acquiring === aufgabe.id
                          ? <div className="w-3 h-3 border-2 border-muted border-t-primary rounded-full animate-spin" />
                          : <Edit className="w-3 h-3" />}
                        {lockedByMe ? 'Weiter' : 'Bearbeiten'}
                      </Button>
                    )}
                    {istAdmin && lockedByOther && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-amber-600"
                        onClick={() => forceReleaseLock(aufgabe.id)}>
                        <Unlock className="w-3 h-3" /> Entsperren
                      </Button>
                    )}
                    {kannBearbeiten && !lockedByOther && !lockedByMe && (
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => deleteAufgabe.mutate(aufgabe.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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

// ── Haupt-Export ──────────────────────────────────────────────────────────────

export default function WorkspaceDetailPanel({
  selectedNode, einheit, lernpakete, lernziele, aufgaben,
  userEmail, kannBearbeiten, istAdmin,
  onNavigate, onDeleteLernpaket, onDeleteLernziel,
}) {
  // Prüfen ob eine Ebene-2-Aufgabe ausgewählt ist
  const selectedAufgabe = selectedNode?.type === 'aufgabe'
    ? aufgaben.find(a => a.id === selectedNode.id)
    : null;
  const isEbene2Aufgabe = selectedAufgabe?.baustein_typ === 'Ebene-2-Aufgabe';

  const [lernpaketFormOpen, setLernpaketFormOpen] = useState(false);
  const [lernzielFormOpen,  setLernzielFormOpen]  = useState(false);
  const [aufgabeFormOpen,   setAufgabeFormOpen]   = useState(false);
  const [editEinheitOpen,   setEditEinheitOpen]   = useState(false);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (selectedNode?.type === 'new-lernpaket') setLernpaketFormOpen(true);
    if (selectedNode?.type === 'new-lernziel')  setLernzielFormOpen(true);
    if (selectedNode?.type === 'new-aufgabe')   setAufgabeFormOpen(true);
  }, [selectedNode]);

  const createLernpaket = useMutation({
    mutationFn: (data) => base44.entities.Lernpakete.create({ ...data, einheit_id: einheit?.id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lernpakete'] }),
  });
  const createLernziel = useMutation({
    mutationFn: (data) => base44.entities.Lernziele.create({
      ...data,
      lernpaket_id: selectedNode?.paketId || selectedNode?.data?.lernpaket_id,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lernziele'] }),
  });
  const createAufgabe = useMutation({
    mutationFn: (data) => {
      const clean = { ...data, lernpaket_id: selectedNode?.paketId, lernziel_id: selectedNode?.lernzielId };
      if (clean.lernziel_id === 'none') delete clean.lernziel_id;
      return base44.entities.Aufgabenbausteine.create(clean);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['aufgaben'] }),
  });
  const updateEinheit = useMutation({
    mutationFn: (data) => base44.entities.Einheiten.update(einheit?.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['einheiten'] }),
  });

  if (!selectedNode) {
    return (
      <StepEmptyState
        icon={BookOpen}
        title="Wählen Sie einen Eintrag aus"
        description="Klicken Sie links auf einen Eintrag in der Struktur, um hier die Details zu sehen."
        status="yellow"
      />
    );
  }

  const type = selectedNode.type;

  if (type === 'einheit') {
    return (
      <>
        <EinheitPanel
          einheit={einheit}
          lernpakete={lernpakete}
          lernziele={lernziele}
          aufgaben={aufgaben}
          kannBearbeiten={kannBearbeiten}
          userEmail={userEmail}
          onNavigate={onNavigate}
          onEdit={() => setEditEinheitOpen(true)}
        />
        <EinheitForm
          open={editEinheitOpen}
          onOpenChange={setEditEinheitOpen}
          onSubmit={(data) => updateEinheit.mutate(data)}
          initialData={einheit}
        />
      </>
    );
  }

  if (type === 'lernpaket') {
    const paket = lernpakete.find(p => p.id === selectedNode.id);
    if (!paket) return null;
    return (
      <>
        <LernpaketPanel
          paket={paket}
          lernziele={lernziele}
          aufgaben={aufgaben}
          kannBearbeiten={kannBearbeiten}
          userEmail={userEmail}
          onNavigate={onNavigate}
          onNewLernziel={() => setLernzielFormOpen(true)}
          onDelete={() => onDeleteLernpaket(paket.id)}
        />
        <LernzielForm
          open={lernzielFormOpen}
          onOpenChange={setLernzielFormOpen}
          onSubmit={(data) => createLernziel.mutate({ ...data, lernpaket_id: paket.id })}
        />
      </>
    );
  }

  if (type === 'lernziel') {
    const lernziel = lernziele.find(lz => lz.id === selectedNode.id);
    if (!lernziel) return null;
    const paketId = selectedNode.paketId || lernziel.lernpaket_id;
    return (
      <>
        <LernzielPanel
          lernziel={lernziel}
          paketId={paketId}
          aufgaben={aufgaben}
          userEmail={userEmail}
          kannBearbeiten={kannBearbeiten}
          istAdmin={istAdmin}
          onNewAufgabe={() => setAufgabeFormOpen(true)}
          onDelete={() => onDeleteLernziel(lernziel.id)}
        />
        <AufgabenbausteinForm
          open={aufgabeFormOpen}
          onOpenChange={setAufgabeFormOpen}
          onSubmit={(data) => createAufgabe.mutate({ ...data, lernpaket_id: paketId, lernziel_id: lernziel.id })}
          lernziele={[lernziel]}
        />
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