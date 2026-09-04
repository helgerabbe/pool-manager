/**
 * MbkAdminTodoCard — „Offene MBK-Aktionen" in den Admin-Einstellungen.
 *
 * Beim Bau eines Kurses fallen Punkte an, die NICHT im Pool-Manager erledigt
 * werden können (Moodle-Abgaben anlegen, KI-Prompts einspielen). Der Pool-Manager
 * hat kein Nachrichtensystem — deshalb sammeln sich diese Punkte hier, statt per
 * E-Mail unterzugehen. Die Karte bleibt unsichtbar, solange nichts offen ist.
 */
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Inbox } from 'lucide-react';
import { useMbkAdminTodos, useMbkAdminTodoErledigen } from '@/hooks/useMbkRueckmeldung';
import MbkAdminPunkteListe from '@/components/pruefung/MbkAdminPunkteListe';

export default function MbkAdminTodoCard() {
  const { data: punkte = [], isLoading } = useMbkAdminTodos();
  const erledigen = useMbkAdminTodoErledigen();

  if (isLoading || punkte.length === 0) return null;

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Inbox className="w-4 h-4 text-primary" />
          Offene MBK-Aktionen ({punkte.length})
        </CardTitle>
        <CardDescription>
          Punkte aus der Rückmeldung des Kursbaus, die außerhalb des Pool-Managers erledigt werden —
          etwa in Moodle. Sie stehen bewusst nicht in der Taskliste der Lehrkräfte.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <MbkAdminPunkteListe punkte={punkte} kannErledigen onErledigen={erledigen} mitEinheit />
      </CardContent>
    </Card>
  );
}