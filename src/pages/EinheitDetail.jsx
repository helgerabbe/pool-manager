import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { useRBAC } from '@/hooks/useRBAC';
import { useRecordLock } from '@/hooks/useRecordLock';
import { ROLLEN } from '@/lib/rbac';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, Plus, Layers, Target, Puzzle, Clock,
  Edit, Trash2, Lock, BookOpen, ChevronRight,
  AlertCircle, LayoutGrid, CheckSquare, Unlock, Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import LernpaketForm from '@/components/lernpakete/LernpaketForm';
import LernzielForm from '@/components/lernziele/LernzielForm';
import AufgabenbausteinForm from '@/components/aufgaben/AufgabenbausteintForm';
import EinheitForm from '@/components/einheiten/EinheitForm';
import AlignmentBoard from '@/components/AlignmentBoard';
import EmptyState from '@/components/shared/EmptyState';
import KILernpaketAssistent from '@/components/einheiten/KILernpaketAssistent';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const ebeneColors = {
  'Ebene 1 - Basis':    'bg-green-100 text-green-700',
  'Ebene 2 - Transfer': 'bg-blue-100 text-blue-700',
  'Ebene 3 - Projekt':  'bg-purple-100 text-purple-700',
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

// ─── Aufgabe-Zeile mit Lock-Logik ────────────────────────────────────────────
function AufgabeRow({ aufgabe, userEmail, kannBearbeiten, kannLoeschen, istAdmin, onDelete, onEditSave }) {
  const { acquireLock, releaseLock, forceReleaseLock, isLockedByOther } = useRecordLock();
  const [editOpen, setEditOpen] = useState(false);
  const [acquiring, setAcquiring] = useState(false);

  const lockedByOther = isLockedByOther(aufgabe, userEmail);
  const lockedByMe = aufgabe.lock_status && aufgabe.locked_by_user === userEmail;

  const handleEditClick = async () => {
    setAcquiring(true);
    const success = await acquireLock(aufgabe.id, userEmail);
    setAcquiring(false);
    if (success) setEditOpen(true);
  };

  const handleClose = async (savedData) => {
    if (savedData) await onEditSave(aufgabe.id, savedData);
    await releaseLock(aufgabe.id, userEmail);
    setEditOpen(false);
  };

  return (
    <>
      <div className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
        lockedByOther
          ? 'bg-amber-50 border-amber-200 opacity-80'
          : lockedByMe
            ? 'bg-primary/5 border-primary/30'
            : 'bg-background border-border hover:border-primary/30'
      }`}>
        {/* Lock-Indikator */}
        <div className="mt-0.5 shrink-0">
          {lockedByOther ? (
            <Lock className="w-4 h-4 text-amber-500" />
          ) : lockedByMe ? (
            <Edit className="w-4 h-4 text-primary" />
          ) : (
            <Puzzle className="w-4 h-4 text-muted-foreground" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge className={`text-[10px] ${bausteinColors[aufgabe.baustein_typ] || ''}`}>
              {aufgabe.baustein_typ}
            </Badge>
            {lockedByMe && (
              <Badge className="text-[10px] bg-primary/10 text-primary">Wird von dir bearbeitet</Badge>
            )}
          </div>
          <p className="text-sm text-foreground line-clamp-2">
            {aufgabe.aufgabentext_inhalt || <span className="text-muted-foreground italic">Kein Inhalt</span>}
          </p>
          {lockedByOther && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Wird bearbeitet von <strong className="ml-1">{aufgabe.locked_by_user}</strong>
              {istAdmin && (
                <button
                  onClick={() => forceReleaseLock(aufgabe.id)}
                  className="ml-2 underline text-amber-700 hover:text-amber-900"
                >
                  (Lock aufheben)
                </button>
              )}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {kannBearbeiten && !lockedByOther && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={handleEditClick}
              disabled={acquiring}
            >
              {acquiring ? (
                <div className="w-3 h-3 border-2 border-muted border-t-primary rounded-full animate-spin" />
              ) : (
                <Edit className="w-3 h-3" />
              )}
              {lockedByMe ? 'Weiterbearbeiten' : 'Bearbeiten'}
            </Button>
          )}
          {kannLoeschen && !lockedByOther && !lockedByMe && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onDelete(aufgabe.id)}
            >
              <Trash2 className="w-3 h-3 text-destructive" />
            </Button>
          )}
        </div>
      </div>

      {/* Inline-Edit Modal */}
      <AufgabenbausteinForm
        open={editOpen}
        onOpenChange={(open) => { if (!open) handleClose(null); }}
        onSubmit={handleClose}
        initialData={aufgabe}
        lernziele={[]}
        isEdit
      />
    </>
  );
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────
export default function EinheitDetail() {
  const einheitId = window.location.pathname.split('/').pop();
  const queryClient = useQueryClient();
  const { permissions, authUser, rolle } = useRBAC();

  const [showLernpaketForm, setShowLernpaketForm] = useState(false);
  const [showLernzielForm, setShowLernzielForm] = useState(false);
  const [showAufgabenForm, setShowAufgabenForm] = useState(false);
  const [showEditEinheit, setShowEditEinheit] = useState(false);
  const [selectedPaketId, setSelectedPaketId] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, type: '', id: '' });
  const [activeTab, setActiveTab] = useState('lernpakete');

  // ── Queries ──
  const { data: einheiten = [] } = useQuery({
    queryKey: ['einheiten'],
    queryFn: () => base44.entities.Einheiten.list(),
  });
  const einheit = einheiten.find(e => e.id === einheitId);

  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete'],
    queryFn: () => base44.entities.Lernpakete.list(),
  });
  const paketeFuerEinheit = lernpakete
    .filter(lp => lp.einheit_id === einheitId)
    .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0));

  const { data: lernziele = [] } = useQuery({
    queryKey: ['lernziele'],
    queryFn: () => base44.entities.Lernziele.list(),
  });

  const { data: aufgaben = [] } = useQuery({
    queryKey: ['aufgaben'],
    queryFn: () => base44.entities.Aufgabenbausteine.list(),
  });

  const paketIds = paketeFuerEinheit.map(p => p.id);
  const zieleFuerEinheit  = lernziele.filter(lz => paketIds.includes(lz.lernpaket_id));
  const aufgabenFuerEinheit = aufgaben.filter(a => paketIds.includes(a.lernpaket_id));

  const getLernzieleForPaket = (id) => zieleFuerEinheit.filter(lz => lz.lernpaket_id === id);
  const getAufgabenForPaket  = (id) => aufgabenFuerEinheit.filter(a => a.lernpaket_id === id);

  // ── Mutations ──
  const createLernpaket = useMutation({
    mutationFn: (data) => base44.entities.Lernpakete.create({ ...data, einheit_id: einheitId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lernpakete'] }),
  });
  const createLernziel = useMutation({
    mutationFn: (data) => base44.entities.Lernziele.create({ ...data, lernpaket_id: selectedPaketId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lernziele'] }),
  });
  const createAufgabe = useMutation({
    mutationFn: (data) => {
      const clean = { ...data, lernpaket_id: selectedPaketId };
      if (clean.lernziel_id === 'none') delete clean.lernziel_id;
      return base44.entities.Aufgabenbausteine.create(clean);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['aufgaben'] }),
  });
  const updateAufgabe = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Aufgabenbausteine.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['aufgaben'] }),
  });
  const updateEinheit = useMutation({
    mutationFn: (data) => base44.entities.Einheiten.update(einheitId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['einheiten'] }),
  });
  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }) => {
      if (type === 'lernpaket') {
        for (const z of lernziele.filter(lz => lz.lernpaket_id === id))
          await base44.entities.Lernziele.delete(z.id);
        for (const a of aufgaben.filter(a => a.lernpaket_id === id))
          await base44.entities.Aufgabenbausteine.delete(a.id);
        return base44.entities.Lernpakete.delete(id);
      }
      if (type === 'lernziel')  return base44.entities.Lernziele.delete(id);
      if (type === 'aufgabe') return base44.entities.Aufgabenbausteine.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
      queryClient.invalidateQueries({ queryKey: ['lernziele'] });
      queryClient.invalidateQueries({ queryKey: ['aufgaben'] });
      setDeleteDialog({ open: false, type: '', id: '' });
    },
  });

  // ── RBAC ──
  const kannDieseEinheitBearbeiten = einheit ? permissions.kannEinheitBearbeiten(einheit.fach) : false;
  const kannFreigabeAendern        = einheit ? permissions.kannFreigabeStatusAendern(einheit.fach) : false;
  const istAdmin = rolle === ROLLEN.ADMIN;
  const kannKIAssistent = permissions.kannKIAssistentNutzen;

  if (!einheit) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const lockedCount = aufgabenFuerEinheit.filter(a => a.lock_status).length;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link to="/einheiten" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Zurück zu Einheiten
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">{einheit.titel_der_einheit}</h1>
              <Badge variant={einheit.freigabe_status === 'Freigegeben für Moodle' ? 'default' : 'secondary'}>
                {einheit.freigabe_status || 'In Planung'}
              </Badge>
              {lockedCount > 0 && (
                <Badge className="bg-amber-100 text-amber-700 gap-1">
                  <Lock className="w-3 h-3" />{lockedCount} aktive Sperr{lockedCount === 1 ? 'e' : 'en'}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <span>{einheit.fach}</span>
              <span>Jahrgang {einheit.jahrgangsstufe}</span>
              <span>{einheit.navigationslogik}</span>
              {einheit.created_date && (
                <span>Erstellt: {format(new Date(einheit.created_date), 'dd.MM.yyyy', { locale: de })}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {kannFreigabeAendern && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateEinheit.mutate({
                  freigabe_status: einheit.freigabe_status === 'Freigegeben für Moodle'
                    ? 'In Planung'
                    : 'Freigegeben für Moodle'
                })}
                className={`gap-2 ${einheit.freigabe_status === 'Freigegeben für Moodle' ? 'text-amber-600 border-amber-300' : 'text-green-600 border-green-300'}`}
              >
                <CheckSquare className="w-4 h-4" />
                {einheit.freigabe_status === 'Freigegeben für Moodle' ? 'Freigabe zurückziehen' : 'Für Moodle freigeben'}
              </Button>
            )}
            {kannDieseEinheitBearbeiten && (
              <Button variant="outline" size="sm" onClick={() => setShowEditEinheit(true)} className="gap-2">
                <Edit className="w-4 h-4" /> Bearbeiten
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Layers, value: paketeFuerEinheit.length, label: 'Lernpakete', color: 'bg-primary/10 text-primary' },
          { icon: Target, value: zieleFuerEinheit.length,   label: 'Lernziele',  color: 'bg-green-100 text-green-700' },
          { icon: Puzzle, value: aufgabenFuerEinheit.length, label: 'Aufgaben',  color: 'bg-purple-100 text-purple-700' },
        ].map(({ icon: Icon, value, label, color }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted">
          <TabsTrigger value="lernpakete" className="gap-1.5">
            <Layers className="w-3.5 h-3.5" />Lernpakete
          </TabsTrigger>
          {kannKIAssistent && (
            <TabsTrigger value="ki-assistent" className="gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />KI-Assistent
            </TabsTrigger>
          )}
          <TabsTrigger value="alignment" className="gap-1.5">
            <LayoutGrid className="w-3.5 h-3.5" />Alignment-Check
          </TabsTrigger>
          <TabsTrigger value="hierarchie" className="gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />Gesamtübersicht
          </TabsTrigger>
        </TabsList>

        {/* ── Lernpakete-Tab ── */}
        <TabsContent value="lernpakete" className="space-y-4 mt-4">
          {kannDieseEinheitBearbeiten && (
            <div className="flex justify-end">
              <Button onClick={() => setShowLernpaketForm(true)} size="sm" className="gap-2">
                <Plus className="w-4 h-4" />Neues Lernpaket
              </Button>
            </div>
          )}

          {paketeFuerEinheit.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="Noch keine Lernpakete"
              description="Unterteilen Sie die Einheit in thematische Lernpakete."
              actionLabel={kannDieseEinheitBearbeiten ? "Erstes Lernpaket erstellen" : undefined}
              onAction={kannDieseEinheitBearbeiten ? () => setShowLernpaketForm(true) : undefined}
            />
          ) : (
            <div className="space-y-4">
              {paketeFuerEinheit.map(paket => {
                const paketZiele    = getLernzieleForPaket(paket.id);
                const paketAufgaben = getAufgabenForPaket(paket.id);
                return (
                  <Card key={paket.id} className="border shadow-sm overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                            {paket.reihenfolge_nummer}
                          </div>
                          <div>
                            <CardTitle className="text-base">{paket.titel_des_pakets}</CardTitle>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{paket.geschaetzte_dauer_minuten} Min.</span>
                              <span>{paketZiele.length} Lernziele</span>
                              <span>{paketAufgaben.length} Aufgaben</span>
                            </div>
                          </div>
                        </div>
                        {kannDieseEinheitBearbeiten && (
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => setDeleteDialog({ open: true, type: 'lernpaket', id: paket.id })}>
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0 space-y-4">
                      {/* Lernziele */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lernziele</h4>
                          {kannDieseEinheitBearbeiten && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
                              onClick={() => { setSelectedPaketId(paket.id); setShowLernzielForm(true); }}>
                              <Plus className="w-3 h-3" />Hinzufügen
                            </Button>
                          )}
                        </div>
                        {paketZiele.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic py-2">Noch keine Lernziele definiert.</p>
                        ) : (
                          <div className="space-y-2">
                            {paketZiele.map(ziel => (
                              <div key={ziel.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 group">
                                <Target className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm">{ziel.formulierung_fachsprache}</p>
                                  <Badge className={`mt-1 text-[10px] ${ebeneColors[ziel.anforderungsebene] || ''}`}>
                                    {ziel.anforderungsebene}
                                  </Badge>
                                </div>
                                {kannDieseEinheitBearbeiten && (
                                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                    onClick={() => setDeleteDialog({ open: true, type: 'lernziel', id: ziel.id })}>
                                    <Trash2 className="w-3 h-3 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Aufgabenbausteine */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Aufgabenbausteine</h4>
                          {kannDieseEinheitBearbeiten && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
                              onClick={() => { setSelectedPaketId(paket.id); setShowAufgabenForm(true); }}>
                              <Plus className="w-3 h-3" />Hinzufügen
                            </Button>
                          )}
                        </div>
                        {paketAufgaben.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic py-2">Noch keine Aufgabenbausteine erstellt.</p>
                        ) : (
                          <div className="space-y-2">
                            {paketAufgaben.map(aufgabe => (
                              <AufgabeRow
                                key={aufgabe.id}
                                aufgabe={aufgabe}
                                userEmail={authUser?.email}
                                kannBearbeiten={kannDieseEinheitBearbeiten}
                                kannLoeschen={kannDieseEinheitBearbeiten}
                                istAdmin={istAdmin}
                                onDelete={(id) => setDeleteDialog({ open: true, type: 'aufgabe', id })}
                                onEditSave={(id, data) => updateAufgabe.mutateAsync({ id, data })}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── KI-Assistent-Tab ── */}
        {kannKIAssistent && (
          <TabsContent value="ki-assistent" className="mt-4">
            <KILernpaketAssistent
              einheitId={einheitId}
              einheit={einheit}
              existingPaketeCount={paketeFuerEinheit.length}
              onCreated={() => {
                queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
                queryClient.invalidateQueries({ queryKey: ['lernziele'] });
                setActiveTab('lernpakete');
              }}
            />
          </TabsContent>
        )}

        {/* ── Alignment-Board-Tab ── */}
        <TabsContent value="alignment" className="mt-4">
          <AlignmentBoard
            lernpakete={paketeFuerEinheit}
            lernziele={zieleFuerEinheit}
            aufgaben={aufgabenFuerEinheit}
          />
        </TabsContent>

        {/* ── Hierarchie-Tab ── */}
        <TabsContent value="hierarchie" className="mt-4">
          {paketeFuerEinheit.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              Erstellen Sie zunächst Lernpakete in der Lernpakete-Ansicht.
            </p>
          ) : (
            <div className="space-y-2">
              {paketeFuerEinheit.map(paket => (
                <Card key={paket.id} className="border shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {paket.reihenfolge_nummer}
                      </div>
                      <span className="font-semibold text-sm">{paket.titel_des_pakets}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{paket.geschaetzte_dauer_minuten} Min.</span>
                    </div>
                    <div className="ml-8 space-y-1">
                      {getLernzieleForPaket(paket.id).map(ziel => (
                        <div key={ziel.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ChevronRight className="w-3 h-3" />
                          <Target className="w-3 h-3 text-green-600" />
                          <span className="truncate">{ziel.formulierung_fachsprache}</span>
                          <Badge className={`ml-auto text-[10px] shrink-0 ${ebeneColors[ziel.anforderungsebene] || ''}`}>
                            {ziel.anforderungsebene}
                          </Badge>
                        </div>
                      ))}
                      {getAufgabenForPaket(paket.id).map(aufgabe => (
                        <div key={aufgabe.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ChevronRight className="w-3 h-3" />
                          {aufgabe.lock_status
                            ? <Lock className="w-3 h-3 text-amber-500" />
                            : <Puzzle className="w-3 h-3 text-purple-600" />
                          }
                          <Badge className={`text-[10px] ${bausteinColors[aufgabe.baustein_typ] || ''}`}>
                            {aufgabe.baustein_typ}
                          </Badge>
                          <span className="truncate">{aufgabe.aufgabentext_inhalt?.substring(0, 60)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Forms */}
      <LernpaketForm
        open={showLernpaketForm}
        onOpenChange={setShowLernpaketForm}
        onSubmit={(data) => createLernpaket.mutate(data)}
        nextOrder={paketeFuerEinheit.length + 1}
      />
      <LernzielForm
        open={showLernzielForm}
        onOpenChange={setShowLernzielForm}
        onSubmit={(data) => createLernziel.mutate(data)}
      />
      <AufgabenbausteinForm
        open={showAufgabenForm}
        onOpenChange={setShowAufgabenForm}
        onSubmit={(data) => createAufgabe.mutate(data)}
        lernziele={selectedPaketId ? getLernzieleForPaket(selectedPaketId) : []}
      />
      <EinheitForm
        open={showEditEinheit}
        onOpenChange={setShowEditEinheit}
        onSubmit={(data) => updateEinheit.mutate(data)}
        initialData={einheit}
      />

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Löschen bestätigen
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.type === 'lernpaket'
                ? 'Beim Löschen des Lernpakets werden auch alle zugehörigen Lernziele und Aufgabenbausteine gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.'
                : 'Dieser Eintrag wird unwiderruflich gelöscht.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate({ type: deleteDialog.type, id: deleteDialog.id })}
            >
              Endgültig löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}