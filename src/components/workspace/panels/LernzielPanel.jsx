import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { getLernzielStatus } from '@/lib/statusLogic';
import {
  PenLine,
  Save,
  X,
  Trash2,
  Edit,
  Puzzle,
  Target,
  ArrowDown,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AufgabenbausteinForm from '@/components/aufgaben/AufgabenbausteintForm';
import {
  StatusBadge,
  AmpelBanner,
  StepEmptyState,
  kategorieColors,
  bausteinColors,
} from './SharedUI';

export default function LernzielPanel({
  lernziel,
  paketId,
  aufgaben,
  userEmail,
  kannBearbeiten,
  istAdmin,
  onNewAufgabe,
  onDelete,
}) {
  const queryClient = useQueryClient();
  const [editAufgabe, setEditAufgabe] = useState(null);
  const [editLernzielMode, setEditLernzielMode] = useState(false);
  const [editLernzielData, setEditLernzielData] = useState(null);

  const lzAufgaben = aufgaben.filter(
    (a) =>
      a.lernpaket_id === paketId && a.lernziel_id === lernziel.id
  );
  const lzStatus = getLernzielStatus(lernziel, aufgaben, paketId, userEmail);

  const updateAufgabe = useMutation({
    mutationFn: ({ id, data }) =>
      base44.entities.Aufgabenbausteine.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aufgaben'] });
      setEditAufgabe(null);
    },
    onError: () =>
      toast.error('Fehler beim Speichern des Aufgabenbausteins.'),
  });
  const deleteAufgabe = useMutation({
    mutationFn: (id) => base44.entities.Aufgabenbausteine.delete(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['aufgaben'] }),
    onError: () => toast.error('Fehler beim Löschen des Aufgabenbausteins.'),
  });

  const handleEdit = (aufgabe) => {
    setEditAufgabe(aufgabe);
  };

  const handleEditClose = async (data) => {
    if (data && editAufgabe) await updateAufgabe.mutateAsync({
      id: editAufgabe.id,
      data,
    });
    setEditAufgabe(null);
  };

  const ampelMsg = {
    red: 'Dieses Lernziel hat noch keine Aufgabenbausteine. Fügen Sie jetzt den ersten Baustein hinzu.',
    yellow:
      'Das Constructive Alignment ist noch unvollständig – es fehlen Bausteine für einzelne Anforderungsebenen oder ein Baustein ist gesperrt.',
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {lernziel.kategorie && (
              <Badge className={kategorieColors[lernziel.kategorie] || ''}>
                {lernziel.kategorie}
              </Badge>
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
              <h2 className="text-xl font-bold leading-snug">
                {lernziel.formulierung_fachsprache}
              </h2>
              {lernziel.schueler_uebersetzung && (
                <p className="text-sm text-muted-foreground mt-2 italic">
                  „{lernziel.schueler_uebersetzung}"
                </p>
              )}
            </>
          ) : (
            <div className="space-y-3 mt-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">
                  Formulierung (Fachsprache)
                </label>
                <input
                  type="text"
                  value={editLernzielData?.formulierung_fachsprache || ''}
                  onChange={(e) =>
                    setEditLernzielData({
                      ...editLernzielData,
                      formulierung_fachsprache: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-input text-sm"
                  placeholder="Ich kann..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Kategorie</label>
                <div className="flex gap-2">
                  {['Fachwissen', 'Fähigkeit/Fertigkeit'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() =>
                        setEditLernzielData({
                          ...editLernzielData,
                          kategorie: cat,
                        })
                      }
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
                <label className="text-xs font-semibold">
                  Schüler-Übersetzung (optional)
                </label>
                <input
                  type="text"
                  value={editLernzielData?.schueler_uebersetzung || ''}
                  onChange={(e) =>
                    setEditLernzielData({
                      ...editLernzielData,
                      schueler_uebersetzung: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-input text-sm"
                  placeholder="Schülergerechte Formulierung..."
                />
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!editLernzielMode && kannBearbeiten && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditLernzielMode(true);
                setEditLernzielData({
                  formulierung_fachsprache:
                    lernziel.formulierung_fachsprache,
                  kategorie: lernziel.kategorie,
                  schueler_uebersetzung: lernziel.schueler_uebersetzung,
                });
              }}
              className="gap-2"
            >
              <PenLine className="w-3.5 h-3.5" />
              Bearbeiten
            </Button>
          )}
          {editLernzielMode && (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={async () => {
                  try {
                    await base44.entities.Lernziele.update(
                      lernziel.id,
                      editLernzielData
                    );
                    queryClient.invalidateQueries({
                      queryKey: ['lernziele'],
                    });
                    setEditLernzielMode(false);
                    setEditLernzielData(null);
                    toast.success('Lernziel gespeichert.');
                  } catch (error) {
                    console.error('Fehler:', error);
                    toast.error('Fehler beim Speichern des Lernziels.');
                  }
                }}
                className="gap-2"
              >
                <Save className="w-3.5 h-3.5" />
                Speichern
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditLernzielMode(false);
                  setEditLernzielData(null);
                }}
                className="gap-2"
              >
                <X className="w-3.5 h-3.5" />
                Abbrechen
              </Button>
            </>
          )}
          {!editLernzielMode && kannBearbeiten && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
            >
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
          description={
            kannBearbeiten
              ? 'Erstellen Sie jetzt den ersten Baustein – z. B. einen Pre-Test oder Input.'
              : 'Für dieses Lernziel gibt es noch keine Aufgabenbausteine.'
          }
          actionLabel={
            kannBearbeiten
              ? 'Jetzt ersten Baustein anlegen'
              : undefined
          }
          onAction={kannBearbeiten ? onNewAufgabe : undefined}
          status="red"
        />
      ) : (
        <div className="space-y-3">
          {kannBearbeiten && (
            <Button
              onClick={onNewAufgabe}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <Plus className="w-4 h-4" /> Baustein hinzufügen
            </Button>
          )}
          {lzAufgaben.map((aufgabe) => (
            <div
              key={aufgabe.id}
              className="p-4 rounded-xl border transition-all bg-card border-border hover:border-primary/30"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge
                        className={`text-[10px] ${
                          bausteinColors[aufgabe.baustein_typ] || ''
                        }`}
                      >
                        {aufgabe.baustein_typ}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {kannBearbeiten && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => handleEdit(aufgabe)}
                      >
                        <Edit className="w-3 h-3" />
                        Bearbeiten
                      </Button>
                    )}
                    {kannBearbeiten && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() =>
                          deleteAufgabe.mutate(aufgabe.id)
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
                {aufgabe.aufgabentext_inhalt && (
                  <p className="text-sm text-muted-foreground">
                    {aufgabe.aufgabentext_inhalt}
                  </p>
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
        onOpenChange={(open) => {
          if (!open) handleEditClose(null);
        }}
        onSubmit={handleEditClose}
        initialData={editAufgabe}
        lernziele={[lernziel]}
        isEdit
      />
    </div>
  );
}