/**
 * EinheitUebersichtTab.jsx
 *
 * Tab 0 im Workspace: "Einheit anlegen"
 * Zeigt die Einheits-Metadaten (Titel, Ziel, Fach, Jahrgang, Status)
 * und die Teammitglieder direkt im Hauptbereich – kein Dialog.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { invokeFunction } from '@/utils/functionsHelper';
import { getAllLernpakete } from '@/services/LernpaketService';
import { getMembersByEinheit, getMembershipByEinheitAndUser, removeEinheitMember, updateEinheitMemberRole } from '@/services/EinheitMembersService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Save, Plus, Trash2, Crown, Edit, Eye, Lock, Unlock, ShieldAlert, Clock, ArrowRight, LayoutList, PenLine, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
// useDraftState removed – form state managed directly
import { useSystemSettings } from '@/hooks/useSystemSettings';
import HelpDialog from '@/components/ui/HelpDialog';
import HelpBadge from '@/components/ui/HelpBadge';

const EINHEIT_HELP = {
  title: 'Einheit konfigurieren',
  description: 'Hier verwalten Sie die Grundeinstellungen dieser Unterrichtseinheit: Titel, Fach, Jahrgang und Planungsphase. Außerdem können Sie den Bearbeitungsstatus steuern und Mitarbeiter hinzufügen.',
  features: [
    'Titel, Fach und Jahrgang der Einheit festlegen oder anpassen',
    'Einheit für die Bearbeitung freigeben oder sperren',
    'Fachlehrkräfte als Mitarbeiter hinzufügen und wieder entfernen',
  ],
  faqs: [
    {
      question: 'Was bedeutet "Einheit gesperrt"?',
      answer: 'Wenn eine Einheit gesperrt ist, können normale Lehrkräfte keine Inhalte mehr bearbeiten. Nur Fachschaftsleitungen und Administratoren haben weiterhin Schreibzugriff. So können Sie eine fertige Einheit vor versehentlichen Änderungen schützen.',
    },
    {
      question: 'Was ist der Unterschied zwischen "offen" und "sequenziell"?',
      answer: 'Der Modus bezieht sich auf die Themenfelder – nicht auf einzelne Lernpakete. Im offenen Modus können Schüler die Themenfelder in beliebiger Reihenfolge bearbeiten. Im sequenziellen Modus sind die Themenfelder nummeriert und müssen der Reihe nach durchgearbeitet werden. Lernpakete innerhalb eines Themenfelds sind immer frei zugänglich.',
    },
  ],
  docsSlug: 'einheiten-struktur',
};
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import GesamtzielManager from './GesamtzielManager';
import { hasUnitLevelAccess } from '@/lib/rbac';

const UNIT_ROLE_CONFIG = {
  LEITUNG: { 
    label: 'Leitung', 
    color: 'bg-amber-100 text-amber-700 border-amber-200', 
    Icon: Crown,
    description: 'Vollständiger Zugriff: Alles verwalten, Mitglieder hinzufügen/entfernen, Rollen ändern.'
  },
  EDITOR:  { 
    label: 'Editor',  
    color: 'bg-blue-100 text-blue-700 border-blue-200',   
    Icon: Edit,
    description: 'Bearbeiten erlaubt: Inhalte erstellen, ändern und löschen. Keine Verwaltung.'
  },
  READER:  { 
    label: 'Leser',   
    color: 'bg-slate-100 text-slate-600 border-slate-200', 
    Icon: Eye,
    description: 'Nur Leserechte: Inhalte ansehen, aber nicht bearbeiten oder löschen.'
  },
};

function UnitRoleBadge({ role }) {
  const cfg = UNIT_ROLE_CONFIG[role] || UNIT_ROLE_CONFIG.READER;
  const Icon = cfg.Icon;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('inline-flex items-center gap-1 border rounded-full font-medium text-[10px] px-2 py-0.5 cursor-help', cfg.color)}>
            <Icon className="w-2.5 h-2.5" />
            {cfg.label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs text-xs">
          {cfg.description}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function EinheitUebersichtTab({ 
  einheit, 
  currentUserEmail, 
  currentUserRole, 
  currentUserFaecher = [], 
  isLockedByOther = false,
  isEditingActive = false,
  onAcquireLock = null,
  onReleaseLock = null,
  isAcquiring = false,
  isReleasing = false,
}) {
  const queryClient = useQueryClient();
  const { faecher, jahrgaenge, phasen } = useSystemSettings();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addingMitarbeiter, setAddingMitarbeiter] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('EDITOR');
  const [mitarbeiterEmail, setMitarbeiterEmail] = useState('');

  const buildForm = (e) => ({
    titel_der_einheit: e.titel_der_einheit || '',
    fach:              e.fach || '',
    jahrgangsstufe:    e.jahrgangsstufe || '',
    zeit_phase_id:     e.zeit_phase_id || '',
    bearbeitungsmodus: e.bearbeitungsmodus || 'offen',
  });

  const [form, setForm] = useState(() => buildForm(einheit));

  // Immer wenn sich die Einheit vom Backend ändert, Form-State aktualisieren
  useEffect(() => {
    setForm(buildForm(einheit));
  }, [
    einheit.id,
    einheit.titel_der_einheit,
    einheit.fach,
    einheit.jahrgangsstufe,
    einheit.zeit_phase_id,
    einheit.bearbeitungsmodus,
  ]);

  const [isLocking, setIsLocking] = useState(false);



  const istGesperrt = einheit.freigabe_status === 'Gesperrt';

  const handleToggleSperre = async () => {
    setIsLocking(true);
    try {
      const neuerStatus = istGesperrt ? 'Freigegeben für Bearbeitung' : 'Gesperrt';
      await invokeFunction('updateEinheitSecure', {
        einheit_id: einheit.id,
        freigabe_status: neuerStatus,
        version: einheit.version,
      });
      await queryClient.refetchQueries({ queryKey: ['workspace-data', einheit.id] });
      await queryClient.refetchQueries({ queryKey: ['einheiten-list-secure'] });
      toast.success(istGesperrt
        ? 'Einheit ist jetzt für die Bearbeitung freigegeben.'
        : 'Einheit wurde für die Bearbeitung gesperrt.'
      );
    } catch (error) {
      console.error('[ToggleSperre] Fehler:', error);
      toast.error('Fehler beim Ändern des Sperrstatus.');
    } finally {
      setIsLocking(false);
    }
  };

  const set = (key, val) => setForm({ ...form, [key]: val });

  // ── Membership ──────────────────────────────────────────────────────────────
  const [previousMembership, setPreviousMembership] = React.useState(null);

  const { data: myMembership } = useQuery({
    queryKey: ['einheit-members', einheit.id, currentUserEmail],
    queryFn: () => getMembershipByEinheitAndUser(einheit.id, currentUserEmail),
    enabled: !!currentUserEmail,
    staleTime: 5000,  // ✅ Nur 5 Sekunden Cache
    refetchInterval: 10000,  // ✅ Alle 10s im Hintergrund neuladen
    refetchOnWindowFocus: true,  // ✅ Bei Tab-Wechsel neu validieren
  });

  // ✅ Warnung, falls Delegation entzogen wurde
  React.useEffect(() => {
    if (previousMembership && !myMembership) {
      toast.warning(
        '🔒 Ihre Bearbeitungsrechte für diese Einheit wurden entzogen. ' +
        'Bitte aktualisieren Sie die Seite.'
      );
    }
    setPreviousMembership(myMembership);
  }, [myMembership]);

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['einheit-members', einheit.id],
    queryFn: () => getMembersByEinheit(einheit.id),
  });

  // ✅ RBAC-Prüfung: Wer darf Einheit-Metadaten bearbeiten?
  // Berücksichtigt Unit-Level-Mitgliedschaft (LEITUNG-Rolle in EinheitMembers)
  // MUSS NACH members-Query stehen (Initialisierungsreihenfolge!)
  const unitAccess = useMemo(() => 
    hasUnitLevelAccess(
      currentUserRole,
      currentUserFaecher,
      einheit.fach,
      members,
      currentUserEmail?.toLowerCase()?.trim() || ''
    ),
    [currentUserRole, currentUserFaecher, einheit.fach, members, currentUserEmail]
  );
  
  const kannEinheitBearbeiten = unitAccess.hasFullAccess && !isLockedByOther && isEditingActive;
  const kannSperrenToggle = unitAccess.hasFullAccess && !isLockedByOther && isEditingActive;
  const kannMitarbeiterHinzufuegen = unitAccess.hasFullAccess && !isLockedByOther && isEditingActive;
  const kannBearbeitungsstartButton = unitAccess.hasFullAccess && !isLockedByOther && onAcquireLock;

  // ✅ Normalisierter E-Mail-Vergleich (case-insensitive, ohne Leerzeichen)
  const normalizedEmail = currentUserEmail?.toLowerCase()?.trim() || '';
  const isLeitung = myMembership?.unit_role === 'LEITUNG' || 
    (einheit.created_by?.toLowerCase()?.trim() === normalizedEmail);

  // Fachlehrkräfte via Backend laden (asServiceRole – Frontend-User.list() ist admin-only)
  const { data: allFachlehrkraefte = [] } = useQuery({
    queryKey: ['fachlehrkraefte'],
    queryFn: async () => {
      const res = await invokeFunction('listFachlehrkraefte', {});
      return res.data?.fachlehrkraefte || [];
    },
    enabled: kannMitarbeiterHinzufuegen,
  });

  const { data: allLernpakete = [] } = useQuery({
    queryKey: ['lernpakete'],
    queryFn: () => getAllLernpakete(),
  });

  // Gefiltert: nur Lernpakete der aktuellen Einheit, die gerade gesperrt sind
  const paketeFuerEinheit = allLernpakete.filter(p => p.einheit_id === einheit.id);
  const activeLocks = paketeFuerEinheit.filter(p => p.is_locked && p.locked_by_email);

  // Für Mitarbeiter hinzufügen: Fachlehrkräfte die noch nicht als LEITUNG eingetragen sind
  // ✅ Normalisierter E-Mail-Vergleich
  const availableFachlehrkraefteForMitarbeiter = allFachlehrkraefte.filter(u => {
    const normalizedUserEmail = u.email?.toLowerCase()?.trim() || '';
    return !members.find(m => 
      m.user_email?.toLowerCase()?.trim() === normalizedUserEmail && 
      m.unit_role === 'LEITUNG'
    );
  });

  // ── Mutations ───────────────────────────────────────────────────────────────
  const addMember = useMutation({
    mutationFn: async ({ email, role }) => {
      // ✅ Nutze gesicherte Backend-Funktion
      return await invokeFunction('addEinheitMemberSecure', {
        einheitId: einheit.id,
        targetEmail: email,
        newRole: role
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['einheit-members', einheit.id] });
      setNewEmail(''); setNewRole('EDITOR'); setAdding(false);
      toast.success('Mitglied hinzugefügt.');
    },
    onError: (err) => {
      const msg = err.message || '';
      if (msg.includes('Berechtigung') || msg.includes('403')) {
        toast.error('🔒 Zugriff verweigert. Du benötigst Fachschaftsleiter-Rechte für diesen Bereich.');
      } else {
        toast.error('Fehler beim Hinzufügen. Bitte versuchen Sie es erneut.');
      }
    },
  });

  const addMitarbeiter = useMutation({
    mutationFn: async (email) => {
      // ✅ Nutze gesicherte Backend-Funktion mit LEITUNG-Rolle
      return await invokeFunction('addEinheitMemberSecure', {
        einheitId: einheit.id,
        targetEmail: email,
        newRole: 'LEITUNG'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['einheit-members', einheit.id] });
      setMitarbeiterEmail('');
      setAddingMitarbeiter(false);
      toast.success('Mitarbeiter hinzugefügt.');
    },
    onError: (err) => {
      const msg = err.message || '';
      if (msg.includes('Berechtigung') || msg.includes('403')) {
        toast.error('🔒 Zugriff verweigert. Du benötigst Fachschaftsleiter-Rechte für diesen Bereich.');
      } else {
        toast.error('Fehler beim Hinzufügen. Bitte versuchen Sie es erneut.');
      }
    },
  });

  const removeMember = useMutation({
    mutationFn: async (id) => {
      // 🥚 EASTER EGG: Selbstlöschung verhindern
      const memberToRemove = members.find(m => m.id === id);
      const normalizedMemberEmail = memberToRemove?.user_email?.toLowerCase()?.trim() || '';
      const normalizedCurrentUserEmail = currentUserEmail?.toLowerCase()?.trim() || '';
      
      if (memberToRemove && normalizedMemberEmail === normalizedCurrentUserEmail) {
        toast.warning('🛑 Halt, Stopp!', {
          description: 'Du kannst dich nicht selbst feuern! (Selbstmord ist hier keine Lösung 😉)',
          duration: 5000,
        });
        return; // Abbruch - keine Backend-Operation
      }
      
      return removeEinheitMember(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['einheit-members', einheit.id] });
      toast.success('Mitglied entfernt.');
    },
  });

  const updateRole = useMutation({
    mutationFn: ({ memberId, role }) => updateEinheitMemberRole(memberId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['einheit-members', einheit.id] }),
  });

  const handleSave = async () => {
    console.log('[Tab 1 Save] Starte Speicherprozess...');
    console.log('[Tab 1 Save] Einheit ID:', einheit.id);
    console.log('[Tab 1 Save] Payload:', form);

    if (!einheit.id) {
      toast.error('Fehler: Einheit-ID fehlt.');
      return;
    }

    setIsSaving(true);
    try {
      const result = await invokeFunction('updateEinheitSecure', {
        einheit_id: einheit.id,
        titel_der_einheit: form.titel_der_einheit,
        fach: form.fach,
        jahrgangsstufe: form.jahrgangsstufe,
        zeit_phase_id: form.zeit_phase_id || null,
        bearbeitungsmodus: form.bearbeitungsmodus,
        version: einheit.version,
      });

      console.log('[Tab 1 Save] DB Antwort:', result?.data);

      if (result?.data?.error) {
        throw new Error(result.data.error);
      }

      await queryClient.refetchQueries({ queryKey: ['workspace-data', einheit.id] });
      await queryClient.refetchQueries({ queryKey: ['einheiten-list-secure'] });

      toast.success('✅ Einheit gespeichert. Bearbeitungsmodus wird beendet.');
      if (onReleaseLock) {
        await onReleaseLock();
      }
    } catch (error) {
      console.error('[Tab 1 Save] KRITISCHER FEHLER:', error);
      toast.error(`Fehler beim Speichern: ${error?.response?.data?.message || error.message || 'Unbekannter Fehler'}`);
      // Bearbeitungsmodus bleibt aktiv!
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await invokeFunction('deleteEinheitSecure', {
        einheitId: einheit.id
      });
      queryClient.invalidateQueries({ queryKey: ['einheiten'] });
      toast.success('🗑️ Einheit unwiderruflich gelöscht.');
      navigate('/einheiten');
    } catch (err) {
      toast.error(err.message || 'Fehler beim Löschen der Einheit.');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🗑️ Einheit unwiderruflich löschen?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 mt-2">
              <p>
                Du bist dabei, die Einheit <strong>"{einheit.titel_der_einheit}"</strong> vollständig zu löschen.
              </p>
              <p className="text-destructive font-semibold">
                ⚠️ Diese Aktion kann nicht rückgängig gemacht werden!
              </p>
              <p className="text-xs text-muted-foreground">
                Alle zugeordneten Themenfelder, Lernpakete, Lernziele und Aufgaben werden ebenfalls gelöscht.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 gap-2"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Ja, löschen
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <div className="px-6 lg:px-10 py-8 max-w-7xl mx-auto w-full">

      {/* ── Zweispalten-Layout: Konfiguration | Mitarbeiter ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

        {/* ── Spalte 1: Metadaten ──────────────────────────────────────────────── */}
        <section className="space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold">Einheit konfigurieren</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Titel, Ziel, Fach und Status dieser Unterrichtseinheit.</p>
            </div>
            <HelpDialog {...EINHEIT_HELP} />
          </div>

          <div className={cn(
            'space-y-4 p-5 rounded-xl border transition-colors',
            isEditingActive ? 'bg-card' : 'bg-muted/30'
          )}>
            {!kannEinheitBearbeiten ? (
              // ✅ LESE-MODUS oder BEARBEITUNGSMODUS INAKTIV
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground">Titel der Einheit</Label>
                  <p className="text-sm font-medium">{form.titel_der_einheit || '—'}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground">Fach</Label>
                    <p className="text-sm font-medium">{form.fach || '—'}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground">Jahrgangsstufe</Label>
                    <p className="text-sm font-medium">{form.jahrgangsstufe || '—'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground">Planungsphase</Label>
                    <p className="text-sm font-medium">{phasen.find(p => p.id === form.zeit_phase_id)?.bezeichnung || '—'}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground">Bearbeitungsmodus</Label>
                    <p className="text-sm font-medium">{form.bearbeitungsmodus === 'sequenziell' ? 'Sequenziell' : 'Offen'}</p>
                  </div>
                </div>

                {/* Gesamtziele im Lesemodus */}
                {einheit.gesamtziele?.length > 0 && (
                  <div className="space-y-2 pt-3 mt-1 border-t">
                    <Label className="text-muted-foreground">Gesamtziele</Label>
                    <div className="space-y-1.5">
                      {einheit.gesamtziele.map((ziel, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-lg border bg-blue-50 border-blue-200">
                          <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center text-[10px] font-bold text-blue-700 shrink-0 mt-0.5">
                            {idx + 1}
                          </div>
                          <p className="text-sm text-foreground">{ziel}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-3 mt-3 border-t">
                  {isEditingActive ? (
                    <p className="text-xs text-green-700 flex items-center gap-1.5 bg-green-50 px-2.5 py-1.5 rounded-lg border border-green-200">
                      <Edit className="w-3 h-3" />
                      Bearbeitungsmodus aktiv – Du kannst Änderungen vornehmen.
                    </p>
                  ) : kannBearbeitungsstartButton ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Lock className="w-3 h-3" />
                        Bearbeitungsmodus ist deaktiviert.
                      </p>
                      <button
                        onClick={onAcquireLock}
                        disabled={isAcquiring}
                        className="w-full flex items-center justify-center gap-2 text-xs font-medium px-3 py-2 rounded-lg border border-primary/40 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isAcquiring ? <Loader2 className="w-3 h-3 animate-spin" /> : <PenLine className="w-3 h-3" />}
                        Bearbeitungsmodus aktivieren
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Lock className="w-3 h-3" />
                      {!unitAccess.isAssignedMember 
                        ? 'Nur Fachschaftsleitung und Administratoren können die Einheit-Metadaten bearbeiten.'
                        : 'Sie haben als zugewiesener Mitarbeiter (Leitung) Bearbeitungsrechte für diese Einheit.'}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              // ✅ BEARBEITUNGS-MODUS für Admin/Fachschaft
              <>
                <div className="space-y-1.5">
                  <Label>Titel der Einheit *</Label>
                  <Input
                    value={form.titel_der_einheit}
                    onChange={e => set('titel_der_einheit', e.target.value)}
                    placeholder="z.B. Interpretation von Kurzgeschichten"
                  />
                </div>

                <div className="space-y-1.5 pt-2 pb-4 border-t">
                  <GesamtzielManager 
                    einheitId={einheit.id}
                    gesamtziele={einheit.gesamtziele || []}
                    onUpdate={() => {
                      queryClient.refetchQueries({ queryKey: ['workspace-data', einheit.id] });
                      queryClient.refetchQueries({ queryKey: ['einheiten-list-secure'] });
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Fach *</Label>
                    <Select value={form.fach} onValueChange={v => set('fach', v)}>
                      <SelectTrigger><SelectValue placeholder="Fach wählen" /></SelectTrigger>
                      <SelectContent>
                        {faecher.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Jahrgangsstufe *</Label>
                    <Select value={form.jahrgangsstufe} onValueChange={v => set('jahrgangsstufe', v)}>
                      <SelectTrigger><SelectValue placeholder="Jahrgang" /></SelectTrigger>
                      <SelectContent>
                        {jahrgaenge.map(j => <SelectItem key={j} value={j}>Jg. {j}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Planungsphase (Halbjahr)</Label>
                    <Select value={form.zeit_phase_id || ''} onValueChange={v => set('zeit_phase_id', v || null)}>
                      <SelectTrigger><SelectValue placeholder="Phase wählen…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>– Keine Zuordnung –</SelectItem>
                        {phasen.map(p => <SelectItem key={p.id} value={p.id}>{p.bezeichnung}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Bearbeitungsmodus</Label>
                    <Select value={form.bearbeitungsmodus || 'offen'} onValueChange={v => set('bearbeitungsmodus', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="offen">Offen (freie Reihenfolge)</SelectItem>
                        <SelectItem value="sequenziell">Sequenziell (feste Reihenfolge)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-between pt-1">
                   <Button
                     onClick={() => setShowDeleteDialog(true)}
                     disabled={isDeleting}
                     variant="destructive"
                     className="gap-2"
                   >
                     {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                     Einheit löschen
                   </Button>
                   <Button
                     onClick={handleSave}
                     disabled={isSaving || !form.titel_der_einheit || !form.fach || !form.jahrgangsstufe}
                     className="gap-2"
                   >
                     {isSaving
                       ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                       : <Save className="w-4 h-4" />}
                     Speichern
                   </Button>
                 </div>
              </>
            )}
          </div>
        </section>

        {/* ── Spalte 2: Bearbeitungsstatus + Mitarbeiter ───────────────────────── */}
        <section className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-1.5">
              Bearbeitungsstatus
              <HelpBadge
                text="Steuert, ob Lehrkräfte Inhalte dieser Einheit bearbeiten dürfen. 'Gesperrt' schützt fertige Einheiten vor versehentlichen Änderungen."
                docsSlug="einheiten-struktur"
              />
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">Steuert, ob Lehrkräfte Inhalte dieser Einheit bearbeiten dürfen.</p>
          </div>

          <div className={cn(
            'p-5 rounded-xl border',
            istGesperrt ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
          )}>
            <div className="flex items-start gap-4">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                istGesperrt ? 'bg-red-100' : 'bg-green-100'
              )}>
                {istGesperrt
                  ? <Lock className="w-5 h-5 text-red-600" />
                  : <Unlock className="w-5 h-5 text-green-600" />
                }
              </div>
              <div className="flex-1">
                <p className={cn('font-semibold text-sm', istGesperrt ? 'text-red-800' : 'text-green-800')}>
                  {istGesperrt ? 'Einheit gesperrt' : 'Einheit freigegeben'}
                </p>
                <p className={cn('text-xs mt-1', istGesperrt ? 'text-red-600' : 'text-green-600')}>
                  {istGesperrt
                    ? 'Lehrkräfte können diese Einheit gerade nicht bearbeiten. Nur Lesen ist erlaubt.'
                    : 'Lehrkräfte können Inhalte dieser Einheit bearbeiten.'
                  }
                </p>
              </div>
            </div>

            {kannSperrenToggle ? (
              <div className="mt-4">
                <Button
                  onClick={handleToggleSperre}
                  disabled={isLocking}
                  variant={istGesperrt ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'gap-2 w-full',
                    !istGesperrt && 'border-red-300 text-red-700 hover:bg-red-50'
                  )}
                >
                  {isLocking
                    ? <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    : istGesperrt
                      ? <Unlock className="w-3.5 h-3.5" />
                      : <Lock className="w-3.5 h-3.5" />
                  }
                  {istGesperrt ? 'Einheit für Bearbeitung freigeben' : 'Einheit für Bearbeitung sperren'}
                </Button>
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                {!unitAccess.isAssignedMember
                  ? 'Nur Fachschaftsleitungen und Administratoren können den Sperrstatus ändern.'
                  : 'Sie haben als zugewiesener Mitarbeiter (Leitung) das Recht, den Sperrstatus zu ändern.'}
              </div>
            )}
          </div>

          {/* ── Mitarbeiter (direkt unter Bearbeitungsstatus) ─────────────────── */}
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-1.5">
              Mitarbeiter
              <HelpBadge
                text="Hier fügen Sie Fachlehrkräfte als Mitarbeiter hinzu. Mitarbeiter erhalten volle Bearbeitungsrechte (LEITUNG-Rolle) für diese Einheit."
                docsSlug="kollaboration-sperren"
              />
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">Fachlehrkräfte dieser Einheit volle Bearbeitungsrechte geben.</p>
          </div>

          <div className="space-y-3 p-5 rounded-xl border bg-card">
            {members.filter(m => m.unit_role === 'LEITUNG').length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">Noch keine Mitarbeiter zugewiesen.</p>
            ) : (
              members.filter(m => m.unit_role === 'LEITUNG').map(m => {
                return (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border bg-background">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700 shrink-0">
                      {(m.user_name || m.user_email).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.user_name || m.user_email}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.user_email}</p>
                    </div>
                    {kannMitarbeiterHinzufuegen && (
                      <button
                        onClick={() => removeMember.mutate(m.id)}
                        className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}

            {kannMitarbeiterHinzufuegen && (
              <div className="pt-1">
                {!addingMitarbeiter ? (
                  <Button variant="outline" size="sm" onClick={() => setAddingMitarbeiter(true)} className="gap-2 w-full">
                    <Plus className="w-3.5 h-3.5" /> Mitarbeiter hinzufügen
                  </Button>
                ) : (
                  <div className="space-y-3 p-3 rounded-lg bg-muted/50 border">
                    <p className="text-xs font-semibold text-muted-foreground">Fachlehrkraft auswählen</p>
                    {availableFachlehrkraefteForMitarbeiter.length > 0 ? (
                      <Select value={mitarbeiterEmail} onValueChange={setMitarbeiterEmail}>
                        <SelectTrigger className="text-sm"><SelectValue placeholder="Fachlehrkraft wählen…" /></SelectTrigger>
                        <SelectContent>
                          {availableFachlehrkraefteForMitarbeiter.map(u => (
                            <SelectItem key={u.email} value={u.email}>
                              <span className="font-medium">{u.full_name}</span>
                              <span className="text-muted-foreground ml-2 text-xs">{u.email}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-xs text-muted-foreground">Keine verfügbaren Fachlehrkräfte.</p>
                    )}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setAddingMitarbeiter(false); setMitarbeiterEmail(''); }} className="flex-1">Abbrechen</Button>
                      <Button size="sm" className="flex-1 gap-1" disabled={!mitarbeiterEmail || addMitarbeiter.isPending} onClick={() => addMitarbeiter.mutate(mitarbeiterEmail)} >
                        <Plus className="w-3.5 h-3.5" /> Hinzufügen
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Lernpakete im Bearbeitungsmodus (in rechter Spalte) ───────────── */}
          <div>
           <h2 className="text-lg font-semibold flex items-center gap-1.5">
             Lernpakete im Bearbeitungsmodus
             <HelpBadge
               text="Sperren verhindern, dass zwei Lehrkräfte gleichzeitig dasselbe Lernpaket bearbeiten. Sperren laufen nach 60 Minuten automatisch ab."
               docsSlug="kollaboration-sperren"
             />
           </h2>
           <p className="text-sm text-muted-foreground mt-0.5">Zeigt an, welche Lernpakete gerade bearbeitet werden.</p>
          </div>

          <div className="space-y-3 p-5 rounded-xl border bg-card">
           {activeLocks.length === 0 ? (
             <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">Keine Lernpakete werden gerade bearbeitet.</p>
           ) : (
             activeLocks.map(paket => (
               <div key={paket.id} className="flex items-start gap-3 p-3 rounded-lg border bg-background hover:border-primary/30 transition-colors">
                 <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-700 shrink-0">
                   <Clock className="w-4 h-4" />
                 </div>
                 <div className="flex-1 min-w-0">
                   <p className="text-sm font-medium truncate">{paket.titel_des_pakets}</p>
                   <p className="text-xs text-muted-foreground mt-0.5">
                     Bearbeitet von <strong>{paket.locked_by_email}</strong>
                   </p>
                   {paket.locked_at && (
                     <p className="text-xs text-muted-foreground/60 mt-1">
                       Seit {new Date(paket.locked_at).toLocaleString('de-DE', {
                         hour: '2-digit',
                         minute: '2-digit',
                         second: '2-digit'
                       })}
                     </p>
                   )}
                 </div>
               </div>
             ))
           )}
          </div>
          </section>

          </div>
          </div>
          </>
          );
          }