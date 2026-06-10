/**
 * components/workspace/VideoUploadField.jsx
 *
 * Spezial-Eingabe für den Medientyp „🎬 Eigenes Video hochladen" in der
 * Video/Audio-Aktivität.
 *
 * Eigenschaften:
 * - Hartes Größenlimit: 100 MB (vor Upload geprüft).
 * - Erlaubte Formate: .mp4, .webm, .mov (typische Screencast-Outputs).
 * - Live-Upload-Fortschritt (Indeterminate, da UploadFile keinen Progress liefert).
 * - Hilfe-Popover „Wie komprimiere ich mein Video?" mit Anbieter-Tipps.
 * - Schreibt die zurückgegebene file_url in `value` (kompatibel mit dem
 *   bestehenden `url`-Feld der Aktivität).
 */

import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  UploadCloud, Loader2, AlertCircle, CheckCircle2, HelpCircle, X, Film, Music, ExternalLink,
} from 'lucide-react';

const MAX_MB = 100;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const ACCEPT_VIDEO = 'video/mp4,video/webm,video/quicktime';
const ACCEPT_AUDIO = 'audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/ogg,audio/webm';

function formatMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(1);
}

/**
 * mode: 'video' (Default) | 'audio'
 * Steuert erlaubte Formate, Beschriftungen und den Komprimierungs-Hilfetext.
 */
export default function VideoUploadField({ value, onChange, disabled = false, mode = 'video' }) {
  const isAudio = mode === 'audio';
  const ACCEPT = isAudio ? ACCEPT_AUDIO : ACCEPT_VIDEO;
  const MediaIcon = isAudio ? Music : Film;
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadedName, setUploadedName] = useState(null);
  const inputRef = useRef(null);

  const handleFileSelect = async (e) => {
    setError(null);
    const file = e.target.files?.[0];
    // Input zurücksetzen, damit derselbe Dateiname erneut auswählbar bleibt
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;

    // Größencheck VOR dem Upload — kein Daten-Roundtrip bei Überschreitung.
    if (file.size > MAX_BYTES) {
      setError(
        `Diese Datei ist ${formatMB(file.size)} MB groß. Das Limit liegt bei ${MAX_MB} MB. ` +
        (isAudio
          ? `Bitte komprimiere die Audiodatei vorher (siehe „Wie komprimieren?").`
          : `Bitte komprimiere das Video vorher (siehe „Wie komprimiere ich mein Video?").`),
      );
      return;
    }

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(file_url);
      setUploadedName(file.name);
    } catch (err) {
      console.error('Video-Upload fehlgeschlagen:', err);
      setError(err?.message || 'Upload fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    onChange('');
    setUploadedName(null);
    setError(null);
  };

  // Bereits hochgeladen → kompakte Vorschau
  if (value) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-green-700 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-green-900 truncate">
                {uploadedName || (isAudio ? 'Audiodatei hochgeladen' : 'Video hochgeladen')}
              </p>
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-green-700 hover:underline truncate flex items-center gap-1"
              >
                Vorschau öffnen <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="shrink-0 text-xs text-green-700 hover:text-green-900 inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-green-100"
            >
              <X className="w-3.5 h-3.5" /> Entfernen
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="rounded-lg border-2 border-dashed border-input bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 p-2 rounded-lg bg-primary/10 text-primary">
            <MediaIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {isAudio ? 'Eigene Audiodatei hochladen' : 'Eigenes Video hochladen'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Max. <strong>{MAX_MB} MB</strong> · {isAudio ? 'MP3, M4A, WAV oder OGG' : 'MP4, WebM oder MOV'}
            </p>
          </div>
          <CompressionHelp isAudio={isAudio} />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            onChange={handleFileSelect}
            disabled={disabled || isUploading}
            className="hidden"
            id="video-upload-input"
          />
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={disabled || isUploading}
            onClick={() => inputRef.current?.click()}
            className="gap-2"
          >
            {isUploading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Lädt hoch…</>
              : <><UploadCloud className="w-4 h-4" /> {isAudio ? 'Audiodatei auswählen' : 'Video auswählen'}</>}
          </Button>
          {isUploading && (
            <span className="text-xs text-muted-foreground">
              Bitte nicht abbrechen — je nach Größe bis zu 30 Sek.
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
          <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
    </div>
  );
}

function CompressionHelp({ isAudio = false }) {
  if (isAudio) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="shrink-0 inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Wie komprimieren?
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 text-sm space-y-3">
          <div>
            <p className="font-semibold text-foreground">Audiodatei unter {MAX_MB} MB bringen</p>
            <p className="text-xs text-muted-foreground mt-1">
              Lange Aufnahmen können groß werden. Mit einem dieser kostenlosen Tools
              bekommst du fast jede Tondatei unter {MAX_MB} MB:
            </p>
          </div>
          <ul className="space-y-2 text-xs">
            <li className="flex gap-2">
              <span className="font-bold text-primary">1.</span>
              <div>
                <a
                  href="https://www.freeconvert.com/audio-compressor"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                >
                  FreeConvert <ExternalLink className="w-3 h-3" />
                </a>{' '}
                <span className="text-muted-foreground">(im Browser, ohne Account)</span>
                <p className="text-muted-foreground mt-0.5">
                  MP3 mit z. B. 128 kbit/s exportieren — das reicht für Sprache locker.
                </p>
              </div>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-primary">2.</span>
              <div>
                <a
                  href="https://www.audacityteam.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                >
                  Audacity <ExternalLink className="w-3 h-3" />
                </a>{' '}
                <span className="text-muted-foreground">(kostenlos, Mac/Win)</span>
                <p className="text-muted-foreground mt-0.5">
                  „Exportieren als MP3" mit niedriger Bitrate für kleine Dateien.
                </p>
              </div>
            </li>
          </ul>
          <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
            <strong className="text-foreground">Tipp:</strong> Für gesprochene Inhalte
            genügt eine niedrige Bitrate (z. B. 96–128 kbit/s).
          </div>
        </PopoverContent>
      </Popover>
    );
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="shrink-0 inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          Wie komprimieren?
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 text-sm space-y-3">
        <div>
          <p className="font-semibold text-foreground">Video unter {MAX_MB} MB bringen</p>
          <p className="text-xs text-muted-foreground mt-1">
            Screencasts werden schnell sehr groß. Mit einem dieser kostenlosen Tools
            bekommst du fast jedes Lernvideo unter {MAX_MB} MB:
          </p>
        </div>

        <ul className="space-y-2 text-xs">
          <li className="flex gap-2">
            <span className="font-bold text-primary">1.</span>
            <div>
              <a
                href="https://handbrake.fr/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline inline-flex items-center gap-1"
              >
                HandBrake <ExternalLink className="w-3 h-3" />
              </a>{' '}
              <span className="text-muted-foreground">(kostenlos, Mac/Win)</span>
              <p className="text-muted-foreground mt-0.5">
                Preset: „Web → Gmail Large 3 Minutes 720p30". Funktioniert für
                fast jedes Screencast-Format.
              </p>
            </div>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-primary">2.</span>
            <div>
              <a
                href="https://www.freeconvert.com/video-compressor"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline inline-flex items-center gap-1"
              >
                FreeConvert <ExternalLink className="w-3 h-3" />
              </a>{' '}
              <span className="text-muted-foreground">(im Browser, ohne Account)</span>
              <p className="text-muted-foreground mt-0.5">
                Zielgröße direkt auf {MAX_MB} MB einstellen — das Tool rechnet
                automatisch die nötige Bitrate aus.
              </p>
            </div>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-primary">3.</span>
            <div>
              <a
                href="https://www.veed.io/tools/video-compressor"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline inline-flex items-center gap-1"
              >
                VEED.IO <ExternalLink className="w-3 h-3" />
              </a>{' '}
              <span className="text-muted-foreground">(im Browser)</span>
              <p className="text-muted-foreground mt-0.5">
                Per Schieberegler die Komprimierungsstärke wählen — sehr einfach.
              </p>
            </div>
          </li>
        </ul>

        <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
          <strong className="text-foreground">Tipp:</strong> 720p reicht für Lernvideos
          fast immer. So passen 5–10 Minuten Screencast locker in {MAX_MB} MB.
        </div>
      </PopoverContent>
    </Popover>
  );
}