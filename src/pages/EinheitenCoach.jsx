import { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import CoachChat from '@/components/coach/CoachChat';
import CoachStrukturPanel from '@/components/coach/CoachStrukturPanel';
import { askCoach, buildWizardBriefing, LEERE_STRUKTUR } from '@/lib/einheitenCoach';
import { Bot, Wand2 } from 'lucide-react';

const BEGRUESSUNG = {
  role: 'coach',
  text: 'Hallo! Ich bin dein **Einheiten-Coach**. Erzähl mir einfach ganz grob, worum es in deiner neuen Einheit gehen soll — du musst noch keinen fertigen Plan haben, den entwickeln wir gemeinsam.\n\nTipp: Du kannst mir auch einen Screenshot vom Inhaltsverzeichnis deines Lehrwerks einfügen (einfach mit **Strg+V** ins Eingabefeld) — dann arbeiten wir am Buch entlang.',
};

const ACTION_LABELS = {
  kritik: 'Bitte prüfe die Struktur einmal kritisch.',
  inspiration: 'Hast du noch Inspiration für mich?',
  studyflix: 'Schau bitte mal bei Studyflix, was es zu diesem Thema gibt.',
};

/**
 * Einheiten-Coach: KI-Sparringspartner VOR dem Erstellungs-Wizard.
 * Links das Gespräch, rechts die live mitwachsende Einheitenübersicht.
 * Am Ende wird das Ergebnis als Briefing an den Wizard übergeben.
 */
export default function EinheitenCoach() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const startPrivat = searchParams.get('privat') === '1';

  const [messages, setMessages] = useState([BEGRUESSUNG]);
  const [struktur, setStruktur] = useState(LEERE_STRUKTUR);
  const [busy, setBusy] = useState(false);
  const [bilder, setBilder] = useState([]);
  const [uploadingBild, setUploadingBild] = useState(false);

  // Refs für synchronen Zugriff im async-Flow.
  const messagesRef = useRef(messages);
  const strukturRef = useRef(struktur);
  messagesRef.current = messages;
  strukturRef.current = struktur;

  const runCoach = async (userText, action = 'chat') => {
    const verlauf = messagesRef.current;
    setMessages((m) => [...m, { role: 'user', text: userText }]);
    setBusy(true);
    try {
      const res = await askCoach({
        verlauf: [...verlauf, { role: 'user', text: userText }],
        struktur: strukturRef.current,
        userText,
        action,
        fileUrls: bilder,
      });
      setMessages((m) => [...m, { role: 'coach', text: res.antwort }]);
      if (res.struktur) setStruktur(res.struktur);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: 'coach',
          error: true,
          text: `Da ist leider etwas schiefgelaufen (${err?.message || 'unbekannter Fehler'}). Versuch es bitte gleich noch einmal.`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const handleAddBild = async (file) => {
    setUploadingBild(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setBilder((b) => [...b, file_url]);
      setMessages((m) => [
        ...m,
        {
          role: 'coach',
          text: 'Danke, ich habe das Bild erhalten und nutze es ab jetzt als Grundlage (z. B. euer Lehrwerk). Erzähl weiter — oder frag mich, was ich darin sehe.',
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'coach', error: true, text: 'Das Bild konnte leider nicht hochgeladen werden. Versuch es bitte noch einmal.' },
      ]);
    } finally {
      setUploadingBild(false);
    }
  };

  const kannUebergeben = (struktur?.themenfelder || []).length > 0;

  const handleHandoff = () => {
    sessionStorage.setItem(
      'einheitenCoachHandoff',
      JSON.stringify({
        titel_der_einheit: struktur?.titel || '',
        fach: struktur?.fach || '',
        jahrgangsstufe: struktur?.jahrgangsstufe || '',
        beschreibung: buildWizardBriefing(struktur),
      })
    );
    navigate(`/einheit/create?coach=1${startPrivat ? '&privat=1' : ''}`);
  };

  return (
    <div className="h-full flex flex-col gap-4 max-w-6xl mx-auto">
      {/* Kopf */}
      <div className="flex items-start justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Bot className="w-6 h-6 text-accent" />
            Einheiten-Coach
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Entwickle im Gespräch entspannt die Struktur deiner neuen Einheit — der Coach sortiert alles mit. Wenn es passt, übergibst du das Ergebnis an den Wizard.
          </p>
        </div>
        <Button onClick={handleHandoff} disabled={!kannUebergeben || busy} className="gap-2 shrink-0">
          <Wand2 className="w-4 h-4" />
          An den Wizard übergeben
        </Button>
      </div>

      {/* Chat + Übersicht */}
      <div className="flex-1 min-h-[520px] h-[calc(100dvh-220px)] grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 rounded-xl border border-border bg-card shadow-sm overflow-hidden min-h-0">
          <CoachChat
            messages={messages}
            busy={busy}
            uploadingBild={uploadingBild}
            bilder={bilder}
            onSend={(t) => runCoach(t, 'chat')}
            onAction={(action) => runCoach(ACTION_LABELS[action], action)}
            onAddBild={handleAddBild}
            onRemoveBild={(idx) => setBilder((b) => b.filter((_, i) => i !== idx))}
          />
        </div>
        <div className="lg:col-span-2 rounded-xl border border-border bg-muted/30 overflow-hidden min-h-0">
          <CoachStrukturPanel struktur={struktur} />
        </div>
      </div>
    </div>
  );
}