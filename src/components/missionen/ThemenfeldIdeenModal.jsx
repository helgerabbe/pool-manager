import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Lightbulb, RefreshCw, Save, Sparkles, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import MissionBadge from '@/components/missionen/MissionBadge';
import { getMaterialLevel } from '@/lib/inspirationConstants';
import { cn } from '@/lib/utils';

const QUICK_PROMPTS = [
  'kreativer und offener',
  'einfacher und schneller umsetzbar',
  'mehr Projektcharakter',
  'weniger Materialaufwand',
];

function Stars({ value }) {
  const safe = [1, 2, 3].includes(value) ? value : 2;
  return <span className="text-amber-500 text-xs">{'★'.repeat(safe)}<span className="text-muted-foreground/30">{'★'.repeat(3 - safe)}</span></span>;
}

function IdeaCard({ idea, saved, saving, onSave }) {
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

      <Button size="sm" onClick={onSave} disabled={saved || saving} className="gap-2 w-full sm:w-auto">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saved ? 'Gemerkte Idee' : 'Idee merken'}
      </Button>
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
  const [fokus, setFokus] = useState('');
  const [ideen, setIdeen] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingIndex, setSavingIndex] = useState(null);
  const [savedKeys, setSavedKeys] = useState(new Set());

  useEffect(() => {
    if (!open) return;
    setThemenfeldId(defaultThemenfeldId || themenfelder[0]?.id || '');
    setFokus('');
    setIdeen([]);
    setSavedKeys(new Set());
    setSavingIndex(null);
  }, [open, defaultThemenfeldId, themenfelder]);

  const selectedThemenfeld = useMemo(
    () => themenfelder.find((tf) => tf.id === themenfeldId),
    [themenfelder, themenfeldId]
  );

  const generate = async (extraFokus = '') => {
    if (!themenfeldId) {
      toast.error('Bitte zuerst ein Themenfeld auswählen.');
      return;
    }
    setLoading(true);
    const combinedFokus = [fokus.trim(), extraFokus].filter(Boolean).join(' — ');
    try {
      const { data } = await base44.functions.invoke('generateThemenfeldTaskIdeas', {
        einheit_id: einheitId,
        themenfeld_id: themenfeldId,
        fokus: combinedFokus,
        count: 3,
      });
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      setIdeen((prev) => [...prev, ...(Array.isArray(data?.ideen) ? data.ideen : [])]);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            KI-Ideenbox für Aufgaben
          </DialogTitle>
          <DialogDescription>
            Wähle ein Themenfeld. Die KI nutzt Grundgerüst, Gesamtziele, Lernpakete und Lernziele als Kontext und schlägt Aufgabenideen vor.
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
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Wunsch für diese Runde</label>
              <Textarea
                value={fokus}
                onChange={(e) => setFokus(e.target.value)}
                placeholder="z.B. mehr kreative Aufgaben, weniger Material, stärkerer Alltagsbezug…"
                className="h-24 bg-white"
                disabled={loading}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((prompt) => (
                <Button key={prompt} type="button" size="sm" variant="outline" onClick={() => generate(prompt)} disabled={loading || !themenfeldId} className="text-xs">
                  {prompt}
                </Button>
              ))}
            </div>

            <Button onClick={() => generate()} disabled={loading || !themenfeldId} className="gap-2 w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : ideen.length ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              {ideen.length ? 'Noch 3 Ideen' : '3 Ideen generieren'}
            </Button>
          </div>

          <div className="space-y-3">
            {ideen.length === 0 && !loading ? (
              <div className="min-h-72 rounded-xl border border-dashed bg-card flex flex-col items-center justify-center text-center p-8">
                <Wand2 className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="font-medium">Noch keine Ideen gesammelt</p>
                <p className="text-sm text-muted-foreground max-w-md mt-1">
                  Starte mit drei Vorschlägen oder gib links eine Richtung vor. Du kannst danach beliebig oft weitere Ideen erzeugen.
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