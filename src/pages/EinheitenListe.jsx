import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRBAC } from '@/hooks/useRBAC';
import { kannEinheitSehen, ROLLEN } from '@/lib/rbac';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Search, AlertCircle, Wand2, Lock, Bot } from 'lucide-react';
import PrivateEinheitenUebersicht from '@/components/einheiten/PrivateEinheitenUebersicht';
import BasismoduleListe from '@/pages/BasismoduleListe';
import BereichSwitcher from '@/components/einheiten/BereichSwitcher';
import AustauschBibliothek from '@/components/einheiten/AustauschBibliothek';
import VorgeschlageneEinheitenSektion from '@/components/einheiten/VorgeschlageneEinheitenSektion';
import MoodleWegInfoBox from '@/components/einheiten/MoodleWegInfoBox';
import SyncStatusBadge from '@/components/sync/SyncStatusBadge';
import EinheitCard from '@/components/einheiten/EinheitCard';
import EmptyState from '@/components/shared/EmptyState';
import DeletionOverlay from '@/components/loading/DeletionOverlay';
import EntwurfSektion from '@/components/einheiten/EntwurfSektion';
import { BookOpen } from 'lucide-react';
import { getExportPendingCount } from '@/lib/deltaExportLogic';
import { useNavigate } from 'react-router-dom';
import HelpBadge from '@/components/ui/HelpBadge';
import { useEinheitenMetrics } from '@/hooks/useEinheitenMetrics';
import { EXPORT_LIFECYCLE_STATUS, EXPORT_LIFECYCLE_LABELS } from '@/lib/exportLifecycle';

function SchnellErstellenModal({ open, onOpenChange, onCreated, defaultPrivat = false }) {
  const [form, setForm] = useState({ titel_der_einheit: '', fach: '', jahrgangsstufe: '' });
  // Privat-Modus: Einheit direkt im eigenen Privatbereich anlegen (Sandbox).
  const [privat, setPrivat] = useState(defaultPrivat);
  const { permissions, faecher: userFaecher, authUser, rolle } = useRBAC();
  // Fachlehrkräfte dürfen NUR private Einheiten anlegen (Backend erzwingt
  // dieselbe Regel) — der Privat-Schalter ist für sie fest eingeschaltet.
  const nurPrivatErlaubt = rolle === ROLLEN.LEHRKRAFT;

  // Beim Öffnen die Vorauswahl an die aktuelle Ansicht anpassen.
  useEffect(() => {
    if (open) setPrivat(defaultPrivat || nurPrivatErlaubt);
  }, [open, defaultPrivat, nurPrivatErlaubt]);

  // ✅ SCHRITT 3: Lade NUR die Fächer des Users (Security-Fix)
  const { data: faecher = [] } = useQuery({
    queryKey: ['lookup-faecher'],
    queryFn: async () => {
      const all = await base44.entities.LookupFaecher.list();
      const activeFaecher = all.filter(f => f.ist_aktiv).sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0));
      
      // Admin/Fachschaft sieht alle Fächer, Lehrkraft nur ihre eigenen
      if (permissions.istAdmin) {
        return activeFaecher;
      }
      // Filtere auf User-Fächer (fallback: alle wenn keine Fächer zugewiesen)
      return userFaecher.length > 0 
        ? activeFaecher.filter(f => userFaecher.includes(f.name))
        : activeFaecher;
    },
    enabled: open,
  });

  const { data: jahrgaenge = [] } = useQuery({
    queryKey: ['lookup-jahrgaenge'],
    queryFn: async () => {
      const all = await base44.entities.LookupJahrgaenge.list();
      return all.filter(j => j.ist_aktiv).sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0));
    },
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.Einheiten.create(
        privat
          ? { ...data, sichtbarkeit: 'privat', besitzer_email: authUser?.email }
          : data
      ),
    onSuccess: (einheit) => {
      setForm({ titel_der_einheit: '', fach: '', jahrgangsstufe: '' });
      onOpenChange(false);
      onCreated(einheit);
    },
  });

  const isSubmitting = createMutation.isPending;

  const isValid = form.titel_der_einheit.trim() && form.fach && form.jahrgangsstufe;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95%] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Neue Einheit erstellen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Titel der Einheit *</Label>
            <Input
              placeholder="z.B. Quadratische Gleichungen"
              value={form.titel_der_einheit}
              onChange={e => setForm({ ...form, titel_der_einheit: e.target.value })}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Unterrichtsfach *</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={form.fach}
              onChange={e => setForm({ ...form, fach: e.target.value })}
            >
              <option value="" disabled>Fach auswählen...</option>
              {faecher.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Jahrgangsstufe *</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={form.jahrgangsstufe}
              onChange={e => setForm({ ...form, jahrgangsstufe: e.target.value })}
            >
              <option value="" disabled>Jahrgang auswählen...</option>
              {jahrgaenge.map(j => <option key={j.id} value={j.bezeichnung}>{j.bezeichnung}</option>)}
            </select>
          </div>
          <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                Privat erstellen
              </Label>
              <p className="text-xs text-muted-foreground">
                {nurPrivatErlaubt
                  ? 'Als Fachlehrkraft erstellen Sie Einheiten immer privat. Öffentliche Einheiten legt die Fachschaftsleitung an.'
                  : 'Die Einheit landet nur in Ihrem Privatbereich — Sie können sie später jederzeit veröffentlichen.'}
              </p>
            </div>
            <Switch checked={privat} onCheckedChange={setPrivat} disabled={nurPrivatErlaubt} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button
            onClick={() => createMutation.mutate(form)}
            disabled={!isValid || isSubmitting}
            className="gap-2"
          >
            {isSubmitting && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Erstellen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function EinheitenListe() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFach, setFilterFach] = useState('all');
  const [filterJahrgang, setFilterJahrgang] = useState('all');
  // Phase D: Filter nach Export-Lifecycle (draft / final_freigegeben / export_running / published / 'all').
  const [filterLifecycle, setFilterLifecycle] = useState('all');
  const [showOnlyChanged, setShowOnlyChanged] = useState(false);
  const [schnellErstellen, setSchnellErstellen] = useState(false);
  // Vier Bereiche: 'privat' (Start) | 'austausch' (Bibliothek) | 'oeffentlich' (Poolzeit) | 'basismodule'.
  const [ansicht, setAnsicht] = useState('privat');
  const [isDeletingAny, setIsDeletingAny] = useState(false);
  const queryClient = useQueryClient();

  // Reset Overlay falls es hängen bleibt (z.B. nach Einheitenliste-Refresh)
  useEffect(() => {
    if (isDeletingAny) {
      const timeout = setTimeout(() => setIsDeletingAny(false), 15000);
      return () => clearTimeout(timeout);
    }
  }, [isDeletingAny]);
  const { permissions, rolle, authUser, faecher: userFaecher } = useRBAC();
  
  // ✅ SCHRITT 2: Secure Backend-Funktion statt Client-Side Filtering
   const { data: einheiten = [], isLoading, isFetching } = useQuery({
    queryKey: ['einheiten', ansicht],
    queryFn: async () => {
      // Secure Backend-Funktion mit Server-Side RBAC-Filterung
      const response = await base44.functions.invoke('getEinheitenListSecure', {
        page: 1,
        limit: 100, // Hole alle für Pagination im Frontend
        view: ansicht, // 'oeffentlich' | 'privat'
      });
      return response.data?.data || [];
    },
    staleTime: 0, // ✅ Daten immer als veraltet markieren → zwingt zum Neuladen
    // Bereich "Basismodule" hat seine eigene Datenladung (BasismoduleListe).
    enabled: ansicht !== 'basismodule',
  });

  // ✅ Strikter Ladezustand: Verhindert "Flash of Unfiltered Data"
  const isInitialLoading = isLoading || isFetching;

  // Jahrgänge aus Lookup laden für den Jahrgangsfilter (alle aktiven Jahrgänge,
  // damit das Dropdown auch dann komplett ist, wenn aktuell keine Einheit
  // einem bestimmten Jahrgang zugeordnet ist).
  const { data: jahrgaengeLookup = [] } = useQuery({
    queryKey: ['lookup-jahrgaenge'],
    queryFn: async () => {
      const all = await base44.entities.LookupJahrgaenge.list();
      return all
        .filter((j) => j.ist_aktiv)
        .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0));
    },
    staleTime: 5 * 60 * 1000,
  });

  const pendingCount = getExportPendingCount(einheiten);

  // Filter wirken UND-verknüpft.
  const filtered = einheiten.filter(e => {
    const matchSearch = e.titel_der_einheit?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFach = filterFach === 'all' || e.fach === filterFach;
    const matchJahrgang = filterJahrgang === 'all' || String(e.jahrgangsstufe) === String(filterJahrgang);
    const matchRBAC = kannEinheitSehen(rolle, e.freigabe_status);
    const matchChanged = !showOnlyChanged || (e.sync_status === 'modified' || e.sync_status === 'new' || !e.last_synced_at);
    const lifecycleStatus = e.export_lifecycle_status || EXPORT_LIFECYCLE_STATUS.DRAFT;
    const matchLifecycle = filterLifecycle === 'all' || lifecycleStatus === filterLifecycle;
    // Vorschlags-Workflow: Im Poolzeit-Bereich erscheinen vorgeschlagene
    // (noch private) Einheiten NUR in der eigenen Sektion, nicht im Raster.
    const matchAnsicht = ansicht !== 'oeffentlich' || e.sichtbarkeit !== 'privat';

    return matchSearch && matchFach && matchJahrgang && matchRBAC && matchChanged && matchLifecycle && matchAnsicht;
  });

  // Zur Veröffentlichung vorgeschlagene (private) Einheiten im Poolzeit-Bereich.
  const vorgeschlagene = ansicht === 'oeffentlich'
    ? einheiten.filter((e) => e.sichtbarkeit === 'privat' && e.zur_veroeffentlichung_vorgeschlagen === true)
    : [];

  const faecher = [...new Set(einheiten.map(e => e.fach).filter(Boolean))];

  // Feste Sortierung der öffentlichen Einheiten:
  // 1. Fach-Reihenfolge aus den Einstellungen (LookupFaecher.reihenfolge),
  // 2. innerhalb des Fachs nach Jahrgangsstufe (aufsteigend),
  // 3. dann alphabetisch nach Titel.
  const { data: faecherLookup = [] } = useQuery({
    queryKey: ['lookupFaecher'],
    queryFn: () => base44.entities.LookupFaecher.list(),
    staleTime: 5 * 60 * 1000,
  });
  const fachOrder = new Map(
    [...faecherLookup]
      .sort((a, b) => (a.reihenfolge ?? 999) - (b.reihenfolge ?? 999))
      .map((f, idx) => [f.name, idx])
  );
  const sortiert = [...filtered].sort((a, b) => {
    const fa = fachOrder.has(a.fach) ? fachOrder.get(a.fach) : 999;
    const fb = fachOrder.has(b.fach) ? fachOrder.get(b.fach) : 999;
    if (fa !== fb) return fa - fb;
    const ja = parseInt(a.jahrgangsstufe, 10) || 0;
    const jb = parseInt(b.jahrgangsstufe, 10) || 0;
    if (ja !== jb) return ja - jb;
    return (a.titel_der_einheit || '').localeCompare(b.titel_der_einheit || '', 'de');
  });

  // Sichtbare Gruppierung: pro Fach ein eigener Block (neue Zeile pro Fach).
  const fachGruppen = sortiert.reduce((acc, e) => {
    const key = e.fach || 'Ohne Fach';
    const letzte = acc[acc.length - 1];
    if (letzte && letzte.fach === key) letzte.items.push(e);
    else acc.push({ fach: key, items: [e] });
    return acc;
  }, []);

  // Volumen + Dashboard-Fortschritte für die sichtbaren Kacheln.
  // Wir laden für ALLE einheiten, damit beim Filter-Wechsel keine Lade-Wartezeiten entstehen.
  const { metrics } = useEinheitenMetrics(einheiten.map((e) => e.id));

  // ✅ Strikter Early Return: Verhindert Rendering von ungefilterten Daten
  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground font-medium">Einheiten werden geladen, bitte einen Moment Geduld...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Vier Bereiche: Privat / Freigegebene (Austausch) / Poolzeit / Basismodule —
          Auswahl liegt oben, darunter beginnt der inhaltliche Bereich. */}
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <BereichSwitcher ansicht={ansicht} onChange={setAnsicht} istAdmin={permissions.istAdmin} />
        </div>
        <HelpBadge
          text="Poolzeit-Einheiten sind die verbindlichen, von der Fachschaft betreuten Einheiten für die Poolzeit. Freigegebene Einheiten sind die Tauschbörse des Kollegiums: private Einheiten, die Kolleg:innen zur Verfügung stellen — Sie können sich davon jederzeit eine eigene private Kopie ziehen. Private Einheiten sind Ihr persönlicher Arbeitsbereich. Basismodule sind verbindliche Wissensspeicher aus vorangegangenen Jahrgängen — ihre Lernziele werden in den Poolzeit-Einheiten angeboten, damit Schüler:innen Themen nachlernen oder nachschlagen können."
          docsSlug="einheiten-struktur"
        />
      </div>

      {/* Bereich "Basismodule" bringt seinen eigenen Kopfbereich mit —
          der Einheiten-Header wird dann ausgeblendet. */}
      {ansicht !== 'basismodule' && (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-accent" />
            {ansicht === 'privat' ? 'Private Einheiten' : ansicht === 'austausch' ? 'Freigegebene Einheiten' : 'Poolzeit-Einheiten'}
            <HelpBadge
              text="Eine Einheit ist das Grundgerüst Ihrer Unterrichtsplanung. Jede Einheit enthält Themenfelder, Lernpakete und Aufgaben."
              docsSlug="einheiten-struktur"
            />
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {einheiten.length}{' '}
            {ansicht === 'privat'
              ? `private Einheit${einheiten.length !== 1 ? 'en' : ''}`
              : ansicht === 'austausch'
                ? `freigegebene Einheit${einheiten.length !== 1 ? 'en' : ''}`
                : `Poolzeit-Einheit${einheiten.length !== 1 ? 'en' : ''}`}{' '}
            insgesamt
          </p>
        </div>
        {/* Erstellen dürfen: Admin + Fachschaftsleitung (öffentlich & privat)
            sowie Fachlehrkräfte (NUR privat — wird in Modal/Wizard erzwungen).
            Im Bereich "Freigegebene Einheiten" gibt es kein Erstellen —
            dort landen Einheiten nur per Freigabe. */}
        {ansicht !== 'austausch' && (permissions.kannEinheitVerwalten || rolle === ROLLEN.LEHRKRAFT) && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Button onClick={() => setSchnellErstellen(true)} className="gap-2 bg-blue-100 text-blue-900 border border-blue-200 shadow-sm hover:bg-blue-200">
                <Plus className="w-4 h-4" />
                Neue Einheit
              </Button>
              <HelpBadge
                text="Schnell eine neue Einheit anlegen: Nur Titel, Fach und Jahrgang erforderlich. Themenfelder und Inhalte können Sie später im Workspace ergänzen."
                docsSlug="einheiten-struktur"
              />
            </div>
            <div className="flex items-center gap-1">
              <Button onClick={() => navigate(`/einheit/coach${ansicht === 'privat' ? '?privat=1' : ''}`)} className="gap-2 bg-blue-300 text-blue-950 border border-blue-300 shadow-sm hover:bg-blue-400">
                <Bot className="w-4 h-4" />
                Mit KI-Coach planen
              </Button>
              <HelpBadge
                text="Der Einheiten-Coach ist ein KI-Sparringspartner: Sie entwickeln im Gespräch entspannt die Struktur Ihrer Einheit — mit kritischer Prüfung, Inspiration und Studyflix-Recherche. Das Ergebnis wird anschließend an den Wizard übergeben."
                docsSlug="einheiten-struktur"
              />
            </div>
            <div className="flex items-center gap-1">
              <Button onClick={() => navigate(`/einheit/create${ansicht === 'privat' ? '?privat=1' : ''}`)} className="gap-2 bg-blue-500 text-white border border-blue-500 shadow-sm hover:bg-blue-600">
                <Wand2 className="w-4 h-4" />
                Einheiten-Wizard
              </Button>
              <HelpBadge
                text="Der geführte Wizard hilft Ihnen Schritt für Schritt: Metadaten, Gesamtziele, Themenfelder und Lernpakete werden strukturiert angelegt. Empfohlen für neue Einheiten."
                docsSlug="einheiten-struktur"
              />
            </div>
          </div>
        )}
      </div>
      )}

      {ansicht === 'basismodule' ? (
        <BasismoduleListe />
      ) : ansicht === 'austausch' ? (
        <AustauschBibliothek
          einheiten={einheiten}
          rolle={rolle}
          benutzerFaecher={userFaecher}
          currentUserEmail={authUser?.email}
          istAdmin={permissions.istAdmin}
        />
      ) : ansicht === 'privat' && permissions.istAdmin ? (
        /* Admin: kompakte Besitzer-Übersicht statt Kachel-Flut */
        <PrivateEinheitenUebersicht einheiten={einheiten} />
      ) : (
      <>
      {/* Angefangene Entwürfe (nur für den Ersteller sichtbar) */}
      {ansicht === 'oeffentlich' && <EntwurfSektion />}

      {/* Zur Veröffentlichung vorgeschlagene Einheiten (Ansichtsmodus) */}
      {ansicht === 'oeffentlich' && (
        <VorgeschlageneEinheitenSektion
          einheiten={vorgeschlagene}
          rolle={rolle}
          benutzerFaecher={userFaecher}
        />
      )}

      {einheiten.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Einheiten durchsuchen..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterFach} onValueChange={setFilterFach}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Alle Fächer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Fächer</SelectItem>
                {faecher.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterJahrgang} onValueChange={setFilterJahrgang}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Alle Jahrgänge" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Jahrgänge</SelectItem>
                {jahrgaengeLookup.map(j => (
                  <SelectItem key={j.id} value={j.bezeichnung}>
                    Jg. {j.bezeichnung}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Phase D: Filter nach Export-Lifecycle. */}
            <Select value={filterLifecycle} onValueChange={setFilterLifecycle}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Alle Export-Stati" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Export-Stati</SelectItem>
                <SelectItem value={EXPORT_LIFECYCLE_STATUS.DRAFT}>
                  {EXPORT_LIFECYCLE_LABELS[EXPORT_LIFECYCLE_STATUS.DRAFT]}
                </SelectItem>
                <SelectItem value={EXPORT_LIFECYCLE_STATUS.FINAL_FREIGEGEBEN}>
                  {EXPORT_LIFECYCLE_LABELS[EXPORT_LIFECYCLE_STATUS.FINAL_FREIGEGEBEN]}
                </SelectItem>
                <SelectItem value={EXPORT_LIFECYCLE_STATUS.EXPORT_RUNNING}>
                  {EXPORT_LIFECYCLE_LABELS[EXPORT_LIFECYCLE_STATUS.EXPORT_RUNNING]}
                </SelectItem>
                <SelectItem value={EXPORT_LIFECYCLE_STATUS.PUBLISHED}>
                  {EXPORT_LIFECYCLE_LABELS[EXPORT_LIFECYCLE_STATUS.PUBLISHED]}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

        </div>
      )}

      {filtered.length > 0 ? (
        <div className="space-y-6">
          {fachGruppen.map((gruppe) => (
            <div key={gruppe.fach}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-bold text-foreground">{gruppe.fach}</h2>
                <span className="text-xs text-muted-foreground">
                  {gruppe.items.length} Einheit{gruppe.items.length !== 1 ? 'en' : ''}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gruppe.items.map(einheit => (
                  <EinheitCard
                    key={einheit.id}
                    einheit={einheit}
                    metrics={metrics[einheit.id]}
                    rolle={rolle}
                    benutzerFaecher={userFaecher}
                    currentUserEmail={authUser?.email}
                    onDeleteStart={() => setIsDeletingAny(true)}
                    onDeleteEnd={() => setIsDeletingAny(false)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : einheiten.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Noch keine Einheiten"
          description="Erstellen Sie Ihre erste Unterrichtseinheit, um mit der Planung zu beginnen."
        />
      ) : (
        <p className="text-sm text-muted-foreground text-center py-10">Keine Einheiten gefunden.</p>
      )}
      </>
      )}

      {/* Direkthilfe im Privatbereich: Wie kommt meine Einheit nach Moodle? */}
      {ansicht === 'privat' && <MoodleWegInfoBox />}

      <SchnellErstellenModal
        open={schnellErstellen}
        onOpenChange={setSchnellErstellen}
        defaultPrivat={ansicht === 'privat'}
        onCreated={(einheit) => {
          queryClient.invalidateQueries({ queryKey: ['einheiten'] });
          navigate(`/einheiten/${einheit.id}`);
        }}
      />

      {/* Globales Lösch-Overlay */}
      <DeletionOverlay isVisible={isDeletingAny} message="Einheit wird unwiderruflich gelöscht... Bitte warten." />
    </div>
  );
}