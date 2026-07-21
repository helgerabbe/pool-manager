import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Lightbulb, RefreshCw, Save, Sparkles, Wand2, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { speichereIdeeInKiste, baueIdeenBeschreibung } from '@/lib/ideenkisteUebernahme';
import MissionBadge from '@/components/missionen/MissionBadge';
import MissionTypeChoiceList from '@/components/missionen/MissionTypeChoiceList';
import { getMission } from '@/lib/missionen';
import { getMaterialLevel } from '@/lib/inspirationConstants';
import { cn } from '@/lib/utils';

function Stars({ value }) {
  const safe = [1, 2, 3].includes(value) ? value : 2;
  return <span className="text-amber-500 text-xs">{'★'.repeat(safe)}<span className="text-muted-foreground/30">{'★'.repeat(3 - safe)}</span></span>;
}

function IdeaCard({ idea, saved, saving, onSave, kisteSaved, kisteSaving, onSaveToKiste }) {
  const material = getMaterialLevel(idea.material_level);

  return (
    <div className={cn('rounded-xl border bg-card p-4 space-y-3', saved && 'bg-green-50 border-green-200')}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <MissionBadge missionId={idea.mission_type} size="sm" showFallback />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Stars value={idea.schwierigkeitsgrad} />
          <Badge variant="outline" className="text-[10px]">{material.emoji} {material.label}</Badge>
        </div>
      </div>

      <div>
        <h3 className="font-semibold leading-tight">{idea.titel}</h3>
        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{idea.aufgabenstellung}</p>
      </div>

      {idea.required_materials && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <span className="font-semibold">Material:</span> {idea.required_materials}
        </div>
      )}

      {idea.didaktischer_hinweis && (
        <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Warum passend?</span> {idea.didaktischer_hinweis}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <Button size="sm" onClick={onSave} disabled={saved || saving} className="gap-2 w-full sm:w-auto">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saved ? 'Gemerkte Idee' : 'Idee merken'}
        </Button>
        <Button size="sm" variant="outline" onClick={onSaveToKiste} disabled={kisteSaved || kisteSaving} className="gap-2 w-full sm:w-auto">
          {kisteSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Inbox className="w-4 h-4" />}
          {kisteSaved ? 'In der Ideenkiste' : 'In die Ideenkiste'}
        </Button>
      </div>
    </div>
  );
}

export default function ThemenfeldIdeenModal({
  open,
  onOpenChange,
  einheitId,
  themenfelder = [],
  defaultThemenfeldId = null,
  anforderungsebene = '2 - Transfer',
  onSaveIdea,
}) {
  const [themenfeldId, setThemenfeldId] = useState(defaultThemenfeldId || '');
  const [selectedMissionType, setSelectedMissionType] = useState('');
  const [fokus, setFokus] = useState('');
  const [ideen, setIdeen] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingIndex, setSavingIndex] = useState(null);
  const [savedKeys, setSavedKeys] = useState(new Set());
  const [kisteSavingIndex, setKisteSavingIndex] = useState(null);
  const [kisteSavedKeys, setKisteSavedKeys] = useState(new Set());
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) return;
    setThemenfeldId(defaultThemenfeldId || themenfelder[0]?.id || '');
    setSelectedMissionType('');
    setFokus('');
    setIdeen([]);
    setSavedKeys(new Set());
    setSavingIndex(null);
    setKisteSavedKeys(new Set());
    setKisteSavingIndex(null);
  }, [open, defaultThemenfeldId, themenfelder]);

  const selectedThemenfeld = useMemo(
    () => themenfelder.find((tf) => tf.id === themenfeldId),
    [themenfelder, themenfeldId]
  );

  const selectedMission = getMission(selectedMissionType);

  const generate = async () => {
    if (!themenfeldId) {
      toast.error('Bitte zuerst ein Themenfeld auswählen.');
      return;
    }
    if (!selectedMissionType) {
      toast.error('Bitte zuerst eine Aufgabenart auswählen.');
      return;
    }
    setLoading(true);
    const combinedFokus = fokus.trim();
    try {
      const { data } = await base44.functions.invoke('generateThemenfeldTaskIdeas', {
        einheit_id: einheitId,
        themenfeld_id: themenfeldId,
        mission_type: selectedMissionType,
        fokus: combinedFokus,
        count: 3,
      });
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      setIdeen(Array.isArray(data?.ideen) ? data.ideen : []);
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || 'Fehler beim Generieren der Ideen.');
    } finally {
      setLoading(false);
    }
  };

  const saveIdea = async (idea, index) => {
    setSavingIndex(index);
    try {
      await onSaveIdea?.({
        ...idea,
        mission_type: selectedMissionType,
        themenfeld_id: themenfeldId,
        themenfeld_titel: selectedThemenfeld?.titel || '',
        anforderungsebene,
      });
      setSavedKeys((prev) => new Set(prev).add(`${index}-${idea.titel}`));
      toast.success('Idee wurde als Entwurf gemerkt.');
    } catch (err) {
      toast.error(err?.message || 'Idee konnte nicht gespeichert werden.');
    } finally {
      setSavingIndex(null);
    }
  };

  const saveIdeaToKiste = async (idea, index) => {
    setKisteSavingIndex(index);
    try {
      await speichereIdeeInKiste({
        einheitId,
        titel: idea.titel,
        beschreibung: baueIdeenBeschreibung(idea, {
          themenfeldTitel: selectedThemenfeld?.titel,
          missionLabel: selectedMission ? `${selectedMission.emoji} ${selectedMission.label}` : selectedMissionType,
        }),
        aufgabentypVorschlag: `Allgemeine Aufgabe (${anforderungsebene})`,
      });
      queryClient.invalidateQueries({ queryKey: ['aufgaben-ideen', einheitId] });
      setKisteSavedKeys((prev) => new Set(prev).add(`${index}-${idea.titel}`));
      toast.success('Idee liegt jetzt in der Ideenkiste.');
    } catch (err) {
      toast.error(err?.message || 'Idee konnte nicht in die Ideenkiste gelegt werden.');
    } finally {
      setKisteSavingIndex(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            KI-Ideenbox für Aufgaben
          </DialogTitle>
          <DialogDescription>
            Wähle ein Themenfeld und eine Aufgabenart. Die KI nutzt Grundgerüst, Gesamtziele, Lernpakete und Lernziele als Kontext und schlägt gezielt drei Ideen vor.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-[280px,1fr]">
          <div className="space-y-4 rounded-xl border bg-muted/20 p-4 h-fit">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Themenfeld</label>
              <select
                value={themenfeldId}
                onChange={(e) => {
                  setThemenfeldId(e.target.value);
                  setIdeen([]);
                  setSavedKeys(new Set());
                }}
                className="w-full h-9 rounded-md border border-border bg-white px-3 text-sm"
                disabled={loading}
              >
                <option value="">-- Bitte wählen --</option>
                {themenfelder.map((tf) => (
                  <option key={tf.id} value={tf.id}>{tf.titel}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Aufgabenart</label>
              <MissionTypeChoiceList
                selectedMissionType={selectedMissionType}
                onSelect={(missionType) => {
                  setSelectedMissionType(missionType);
                  setIdeen([]);
                  setSavedKeys(new Set());
                }}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Zusätzliche Hinweise für die KI</label>
              <Textarea
                value={fokus}
                onChange={(e) => setFokus(e.target.value)}
                placeholder="z.B. weniger Material, stärkerer Alltagsbezug, kurze Bearbeitungszeit…"
                className="h-24 bg-white"
                disabled={loading}
              />
            </div>

            <Button onClick={() => generate()} disabled={loading || !themenfeldId || !selectedMissionType} className="gap-2 w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : ideen.length ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              {ideen.length ? 'Neue 3 Ideen' : '3 Ideen zu dieser Aufgabenart'}
            </Button>
          </div>

          <div className="space-y-3">
            {selectedMission && ideen.length > 0 && (
              <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                Aktuelle Auswahl: <span className="font-semibold text-foreground">{selectedMission.emoji} {selectedMission.label}</span>
              </div>
            )}
            {ideen.length === 0 && !loading ? (
              <div className="min-h-72 rounded-xl border border-dashed bg-card flex flex-col items-center justify-center text-center p-8">
                <Wand2 className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="font-medium">Noch keine Ideen gesammelt</p>
                <p className="text-sm text-muted-foreground max-w-md mt-1">
                  Wähle links ein Themenfeld und eine Aufgabenart aus. Danach erzeugt die KI genau drei passende Ideen.
                </p>
              </div>
            ) : (
              ideen.map((idea, index) => (
                <IdeaCard
                  key={`${index}-${idea.titel}`}
                  idea={idea}
                  saved={savedKeys.has(`${index}-${idea.titel}`)}
                  saving={savingIndex === index}
                  onSave={() => saveIdea(idea, index)}
                  kisteSaved={kisteSavedKeys.has(`${index}-${idea.titel}`)}
                  kisteSaving={kisteSavingIndex === index}
                  onSaveToKiste={() => saveIdeaToKiste(idea, index)}
                />
              ))
            )}
            {loading && ideen.length === 0 && (
              <div className="min-h-72 rounded-xl border bg-card flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Ideen werden aus dem Einheitskontext entwickelt…
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}