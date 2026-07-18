import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Eye, Copy, Rocket, Undo2 } from 'lucide-react';
import EinheitVorschauModal from '@/components/einheiten/EinheitVorschauModal';

function ActionButton({ onClick, disabled, title, icon: Icon, className = '', spinning }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-md border border-border bg-card text-muted-foreground transition-all disabled:opacity-50 ${className}`}
    >
      {spinning
        ? <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        : <Icon className="w-4 h-4" />
      }
    </button>
  );
}

/**
 * Eine Zeile in der Austausch-Bibliothek: Vorschau, private Kopie ziehen,
 * (Fachschaftsleitung/Admin) zu Poolzeit kopieren, (Besitzer/Admin) Freigabe zurückziehen.
 */
export default function AustauschEinheitRow({ einheit, darfPoolzeit, darfZurueckziehen, istEigene }) {
  const [showVorschau, setShowVorschau] = useState(false);
  const [busy, setBusy] = useState(null); // 'kopie' | 'poolzeit' | 'zurueck'
  const queryClient = useQueryClient();

  const invoke = async (art, fn, payload, successMsg) => {
    setBusy(art);
    try {
      const res = await base44.functions.invoke(fn, payload);
      if (res.data?.success) {
        toast.success(successMsg(res.data));
        queryClient.invalidateQueries({ queryKey: ['einheiten'] });
      } else {
        toast.error(res.data?.error || 'Aktion fehlgeschlagen.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Aktion fehlgeschlagen.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border border-border rounded-lg bg-card hover:border-emerald-300 transition-colors">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{einheit.titel_der_einheit}</p>
        <p className="text-xs text-muted-foreground truncate">
          {einheit.fach} · Jg. {einheit.jahrgangsstufe} · von {einheit.besitzer_email || 'unbekannt'}
          {istEigene && <span className="ml-1.5 text-emerald-700 font-medium">(Ihre Einheit)</span>}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <ActionButton
          onClick={() => setShowVorschau(true)}
          title="Vorschau aus Schülersicht"
          icon={Eye}
          className="hover:text-primary hover:border-primary/40"
        />
        {!istEigene && (
          <ActionButton
            onClick={() => invoke('kopie', 'duplicateEinheitSecure', { einheit_id: einheit.id },
              (d) => `Private Kopie erstellt: „${d.titel}" — Sie finden sie in Ihrem Privatbereich.`)}
            disabled={busy !== null}
            spinning={busy === 'kopie'}
            title="Private Kopie ziehen — eine eigene, unabhängige Kopie in Ihren Privatbereich übernehmen"
            icon={Copy}
            className="hover:text-emerald-700 hover:border-emerald-400/50 hover:bg-emerald-50"
          />
        )}
        {darfPoolzeit && (
          <ActionButton
            onClick={() => invoke('poolzeit', 'duplicateEinheitSecure', { einheit_id: einheit.id, als_poolzeit: true },
              (d) => `„${d.titel}" wurde als Poolzeit-Einheit übernommen.`)}
            disabled={busy !== null}
            spinning={busy === 'poolzeit'}
            title="Zu den Poolzeit-Einheiten kopieren — erzeugt auf Grundlage dieser Einheit eine neue Poolzeit-Einheit (nur Fachschaftsleitung/Admin)"
            icon={Rocket}
            className="hover:text-blue-700 hover:border-blue-400/50 hover:bg-blue-50"
          />
        )}
        {darfZurueckziehen && (
          <ActionButton
            onClick={() => invoke('zurueck', 'setEinheitAustauschSecure', { einheit_id: einheit.id, im_austausch: false },
              () => `„${einheit.titel_der_einheit}" wurde aus der Bibliothek zurückgezogen.`)}
            disabled={busy !== null}
            spinning={busy === 'zurueck'}
            title="Freigabe zurückziehen — Einheit verschwindet aus der Bibliothek (bereits gezogene Kopien bleiben erhalten)"
            icon={Undo2}
            className="hover:text-destructive hover:border-destructive/40"
          />
        )}
      </div>
      <EinheitVorschauModal open={showVorschau} onOpenChange={setShowVorschau} einheit={einheit} />
    </div>
  );
}