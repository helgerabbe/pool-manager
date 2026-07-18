/**
 * WartungsSperre.jsx
 *
 * Vollbild-Sperrbildschirm für Nicht-Administratoren, solange der globale
 * Wartungsmodus aktiv ist. Ersetzt die gesamte App-Oberfläche — Nutzer
 * können nichts mehr lesen oder schreiben, nur abmelden. Admins sehen
 * diesen Bildschirm nie (sie behalten Zugriff, um die Wartung durchzuführen).
 */
import React from 'react';
import { ShieldOff, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logout } from '@/services/AuthService';

export default function WartungsSperre() {
  return (
    <div className="h-[100dvh] w-full flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center">
          <ShieldOff className="w-8 h-8 text-orange-600" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-foreground">Wartungsmodus aktiv</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Der Pool-Manager wird gerade gewartet. Der Zugriff ist vorübergehend für alle
            Nutzerinnen und Nutzer gesperrt. Bitte versuchen Sie es in Kürze erneut.
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => logout(false)}>
          <LogOut className="w-4 h-4" />
          Abmelden
        </Button>
      </div>
    </div>
  );
}