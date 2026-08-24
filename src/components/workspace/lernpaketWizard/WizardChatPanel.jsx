/**
 * WizardChatPanel.jsx
 *
 * Lernpaket-Wizard (Etappe 1, 2026-08-24): Chat-Einstieg in den Paketbau.
 * Die Lehrkraft beschreibt im Gespräch (Text/Diktat, mit Material-Upload),
 * was sie in diesem Lernpaket haben möchte. Der Wizard pflegt einen Bauplan;
 * mit "Bau das jetzt" werden alle geplanten Aktivitäten angelegt
 * (applyLernpaketWizardProposal, additiv — Speichern/Verwerfen-Semantik
 * des Dialogs greift wie gehabt).
 */
import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Hammer, Wand2, User } from 'lucide-react';
import SpeechInputButton from '@/components/ui/SpeechInputButton';
import WizardMaterialUpload from './WizardMaterialUpload';
import WizardChatBauplan from './WizardChatBauplan';
import WizardChatAenderungen from './WizardChatAenderungen';

const MAX_INPUT_LENGTH = 5000;

export default function WizardChatPanel({ paket, disabled, onApplied, onBusyChange }) {
  const [messages, setMessages] = useState([]);
  const [bauplan, setBauplan] = useState(null);
  // Etappe 2: Änderungsvorschläge an bestehenden Aktivitäten.
  const [aenderungen, setAenderungen] = useState([]);
  const [materialien, setMaterialien] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const endRef = useRef(null);

  const busy = isSending || isBuilding || disabled;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, isSending]);

  const setBusyState = (sending, building) => {
    setIsSending(sending);
    setIsBuilding(building);
    onBusyChange?.(sending || building);
  };

  const send = async () => {
    const nachricht = input.trim();
    if (!nachricht || busy) return;
    const verlauf = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: 'user', content: nachricht }]);
    setInput('');
    setBusyState(true, false);
    try {
      const res = await base44.functions.invoke('lernpaketWizardChat', {
        lernpaketId: paket.id,
        nachricht,
        verlauf,
        bauplan,
        materialien,
      });
      const data = res?.data || res;
      if (data?.error) throw new Error(data.error);
      setMessages((prev) => [...prev, { role: 'assistant', content: data.antwort || '' }]);
      if (data.bauplan) setBauplan(data.bauplan);
      if (Array.isArray(data.aenderungen) && data.aenderungen.length > 0) {
        // Neue Vorschläge ersetzen ältere zur gleichen Aktivität.
        setAenderungen((prev) => {
          const neueIds = new Set(data.aenderungen.map((a) => a.aktivitaet_id));
          return [...prev.filter((a) => !neueIds.has(a.aktivitaet_id)), ...data.aenderungen];
        });
      }
    } catch (err) {
      console.error('[WizardChatPanel] chat failed', err);
      toast.error(err?.response?.data?.error || err?.message || 'Der Wizard konnte nicht antworten.');
    } finally {
      setBusyState(false, false);
    }
  };

  const build = async () => {
    const items = (bauplan?.items || []).map((it) => ({
      aktivitaetstyp: it.aktivitaetstyp,
      phase: it.phase,
      ki_briefing_skizze: {
        variant: 'offen',
        idee: it.idee || '',
        offen: {
          lernziel: it.lernziel || '',
          funktionsweise: it.funktionsweise || it.idee || '',
        },
        ...(it.quelle_url ? { quelle_url: it.quelle_url } : {}),
      },
      material_urls: (it.material_indizes || []).map((i) => materialien[i]).filter(Boolean),
    }));
    if (items.length === 0 && aenderungen.length === 0) return;
    setBusyState(false, true);
    try {
      let createdIds = [];
      let anzahlNeu = 0;

      if (items.length > 0) {
        const res = await base44.functions.invoke('applyLernpaketWizardProposal', {
          lernpaketId: paket.id,
          items,
          mode: 'additive',
          briefing: bauplan?.leitidee || '',
        });
        const data = res?.data || res;
        if (!data?.success) {
          toast.error(data?.error || 'Bau fehlgeschlagen.');
          return;
        }
        createdIds = (data.createdActivities || []).map((c) => c.id);
        anzahlNeu = data.stats.items_created;
      }

      // Etappe 2: Beschreibungen bestehender Aktivitäten aktualisieren
      // (Inhalte und Materialien bleiben unangetastet).
      let anzahlGeaendert = 0;
      for (const ae of aenderungen) {
        try {
          const akt = await base44.entities.LernpaketPhaseAktivitaet.get(ae.aktivitaet_id);
          const bisher = akt?.ki_briefing && typeof akt.ki_briefing === 'object' ? akt.ki_briefing : {};
          await base44.entities.LernpaketPhaseAktivitaet.update(ae.aktivitaet_id, {
            ki_briefing: {
              ...bisher,
              variant: 'offen',
              idee: ae.neue_beschreibung,
              offen: { ...(bisher.offen || {}), funktionsweise: ae.neue_beschreibung },
            },
          });
          anzahlGeaendert += 1;
        } catch (err) {
          console.error('[WizardChatPanel] Änderung fehlgeschlagen', ae.aktivitaet_id, err);
        }
      }

      const ideenkisteIds = (bauplan?.items || []).map((it) => it.ideenkiste_id).filter(Boolean);
      onApplied?.({ createdIds, ideenkisteIds });

      const teile = [];
      if (anzahlNeu > 0) teile.push(`${anzahlNeu} Aktivität${anzahlNeu !== 1 ? 'en' : ''} angelegt`);
      if (anzahlGeaendert > 0) teile.push(`${anzahlGeaendert} Beschreibung${anzahlGeaendert !== 1 ? 'en' : ''} geändert`);
      const zusammenfassung = teile.join(' und ');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `✅ Erledigt — ${zusammenfassung}. Du findest alles in der Übersicht unten. Über den Inhalte-Generator kannst du die Inhalte automatisch ausarbeiten lassen — oder du bearbeitest die Aktivitäten direkt. Mit "Speichern & schließen" übernimmst du alles, mit "Abbrechen & verwerfen" werden die neuen Aktivitäten wieder entfernt.`,
        },
      ]);
      setBauplan(null);
      setAenderungen([]);
      toast.success(zusammenfassung.charAt(0).toUpperCase() + zusammenfassung.slice(1) + '.');
    } catch (err) {
      console.error('[WizardChatPanel] build failed', err);
      toast.error(err?.response?.data?.error || 'Fehler beim Bauen.');
    } finally {
      setBusyState(false, false);
    }
  };

  const removeItem = (index) => {
    setBauplan((prev) => {
      if (!prev) return prev;
      return { ...prev, items: prev.items.filter((_, i) => i !== index) };
    });
  };

  const anzahlItems = bauplan?.items?.length || 0;
  const anzahlAenderungen = aenderungen.length;
  const hatUmzusetzendes = anzahlItems > 0 || anzahlAenderungen > 0;
  const umsetzenLabel = [
    anzahlItems > 0 ? `${anzahlItems} neu` : null,
    anzahlAenderungen > 0 ? `${anzahlAenderungen} geändert` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <section className="rounded-md border border-border bg-muted/20 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Wand2 className="w-4 h-4 text-primary" />
        Bau dein Lernpaket im Gespräch
      </h3>

      {messages.length === 0 && (
        <p className="text-xs text-muted-foreground leading-snug">
          Beschreibe einfach, was du dir für dieses Paket vorstellst — welche Aufgaben, welcher
          Ablauf, welche Materialien du schon hast (unten anhängen). Der Wizard kennt Einheit,
          Lernziele und deine Ideenkiste, macht Vorschläge und pflegt einen Bauplan. Wenn alles
          passt, klickst du auf <strong>„Bau das jetzt"</strong> und alles wird angelegt.
        </p>
      )}

      {/* Gesprächsverlauf */}
      {messages.length > 0 && (
        <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
          {messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="flex gap-2 justify-end">
                <div className="rounded-lg bg-primary text-primary-foreground px-3 py-2 text-xs max-w-[85%] whitespace-pre-wrap">
                  {m.content}
                </div>
                <div className="w-6 h-6 rounded bg-muted flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              </div>
            ) : (
              <div key={i} className="flex gap-2">
                <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
                  <Wand2 className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="rounded-lg bg-background border border-border px-3 py-2 text-xs max-w-[85%] whitespace-pre-wrap">
                  {m.content}
                </div>
              </div>
            )
          )}
          {isSending && (
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
                <Wand2 className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="rounded-lg bg-background border border-border px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Denke nach…
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}

      {/* Bauplan + Bau-Button */}
      <WizardChatBauplan bauplan={bauplan} onRemove={removeItem} disabled={busy} />
      <WizardChatAenderungen
        aenderungen={aenderungen}
        onRemove={(i) => setAenderungen((prev) => prev.filter((_, idx) => idx !== i))}
        disabled={busy}
      />
      {hatUmzusetzendes && (
        <div className="flex justify-end">
          <Button type="button" onClick={build} disabled={busy} className="gap-2">
            {isBuilding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Hammer className="w-4 h-4" />}
            Bau das jetzt ({umsetzenLabel})
          </Button>
        </div>
      )}

      {/* Eingabe */}
      <div className="flex items-end gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, MAX_INPUT_LENGTH))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={
            messages.length === 0
              ? 'Beispiel: Die Schüler sollen Laute den passenden Buchstaben zuordnen. Einstieg gern mit meinem Arbeitsblatt (hänge ich an), danach ein Zuordnungstraining und zum Schluss ein kleiner Test.'
              : 'Antwort schreiben … (Enter sendet, Shift+Enter neue Zeile)'
          }
          rows={2}
          disabled={busy}
          className="resize-none min-h-[44px] text-xs"
        />
        <SpeechInputButton
          value={input}
          onResult={(text) => setInput(text.slice(0, MAX_INPUT_LENGTH))}
          disabled={busy}
          maxSeconds={60}
          className="self-center"
        />
        <Button type="button" size="icon" className="h-10 w-10 shrink-0" onClick={send} disabled={busy || !input.trim()}>
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>

      <WizardMaterialUpload materialien={materialien} onChange={setMaterialien} disabled={busy} />
    </section>
  );
}