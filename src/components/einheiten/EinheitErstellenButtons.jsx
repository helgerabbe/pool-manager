import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Bot, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HelpBadge from '@/components/ui/HelpBadge';

/**
 * Die drei Wege, eine Einheit zu erstellen (Schnell / KI-Coach / Wizard).
 * Ausgelagert, damit sie im Privatbereich beim Bereich "Meine Einheiten"
 * stehen können und in den anderen Bibliotheken weiterhin im Kopfbereich.
 */
export default function EinheitErstellenButtons({ privat, onNeueEinheit }) {
  const navigate = useNavigate();
  const suffix = privat ? '?privat=1' : '';

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <Button onClick={onNeueEinheit} className="gap-2 bg-blue-100 text-blue-900 border border-blue-200 shadow-sm hover:bg-blue-200">
          <Plus className="w-4 h-4" />
          Neue Einheit
        </Button>
        <HelpBadge
          text="Schnell eine neue Einheit anlegen: Nur Titel, Fach und Jahrgang erforderlich. Themenfelder und Inhalte können Sie später im Workspace ergänzen."
          docsSlug="einheiten-struktur"
        />
      </div>
      <div className="flex items-center gap-1">
        <Button onClick={() => navigate(`/einheit/coach${suffix}`)} className="gap-2 bg-blue-300 text-blue-950 border border-blue-300 shadow-sm hover:bg-blue-400">
          <Bot className="w-4 h-4" />
          Mit KI-Coach planen
        </Button>
        <HelpBadge
          text="Der Einheiten-Coach ist ein KI-Sparringspartner: Sie entwickeln im Gespräch entspannt die Struktur Ihrer Einheit — mit kritischer Prüfung, Inspiration und Studyflix-Recherche. Das Ergebnis wird anschließend an den Wizard übergeben."
          docsSlug="einheiten-struktur"
        />
      </div>
      <div className="flex items-center gap-1">
        <Button onClick={() => navigate(`/einheit/create${suffix}`)} className="gap-2 bg-blue-500 text-white border border-blue-500 shadow-sm hover:bg-blue-600">
          <Wand2 className="w-4 h-4" />
          Einheiten-Wizard
        </Button>
        <HelpBadge
          text="Der geführte Wizard hilft Ihnen Schritt für Schritt: Metadaten, Gesamtziele, Themenfelder und Lernpakete werden strukturiert angelegt. Empfohlen für neue Einheiten."
          docsSlug="einheiten-struktur"
        />
      </div>
    </div>
  );
}