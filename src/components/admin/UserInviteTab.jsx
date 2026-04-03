import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Mail, Send, AlertTriangle, CheckCircle, Clock, Info } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export default function UserInviteTab({ benutzer = [] }) {
  const queryClient = useQueryClient();
  const [inviteId, setInviteId] = useState(null);
  const [invitingId, setInvitingId] = useState(null);

  // Lade echte User-Accounts
  const { data: users = [] } = useQuery({
    queryKey: ['appUsers'],
    queryFn: async () => {
      try {
        const result = await base44.asServiceRole.entities.User.list();
        return result || [];
      } catch (err) {
        console.error('User-Liste konnte nicht geladen werden:', err);
        return [];
      }
    },
  });

  // Lade AuditLog um zu sehen, welche Einladungen gesendet wurden
  const { data: auditLog = [] } = useQuery({
    queryKey: ['auditLog'],
    queryFn: async () => {
      try {
        const result = await base44.entities.AuditLog.list('-created_date');
        return result || [];
      } catch (err) {
        console.error('AuditLog konnte nicht geladen werden:', err);
        return [];
      }
    },
  });

  const inviteMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('inviteUserSecure', data),
    onSuccess: () => {
      toast.success('Einladung gesendet!');
      setInviteId(null);
      queryClient.invalidateQueries({ queryKey: ['appUsers'] });
    },
    onError: (err) => {
      const msg = err.response?.data?.error || err.message;
      toast.error(`Fehler: ${msg}`);
    }
  });

  // Filter: Benutzer-Metadaten ohne echten User-Account
  const unregisteredBenutzer = benutzer.filter(b => 
    !users.find(u => u.email === b.user_id)
  );

  if (unregisteredBenutzer.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
        <p className="text-sm">Alle Benutzerprofile sind registriert ✓</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {unregisteredBenutzer.map(b => {
        const isRegistered = users.find(u => u.email === b.user_id);
        const lastInvite = auditLog
          .filter(log => log.action === 'CREATE' && log.resource_type === 'inviteUserSecure' && log.changes?.email === b.user_id)
          .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
        
        return (
          <Card key={b.id} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-700 shrink-0">
                  {(b.vorname || '?')[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{b.vorname} {b.nachname}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="w-3 h-3" />{b.user_id}
                  </p>
                  {lastInvite && (
                    <p className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                      <Info className="w-3 h-3" /> Einladung gesendet am {format(new Date(lastInvite.created_date), 'dd. MMM HH:mm', { locale: de })}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <Badge variant="outline" className="text-xs">{b.rolle}</Badge>
                {isRegistered ? (
                  <Badge className="text-xs bg-green-100 text-green-700">Registriert</Badge>
                ) : (
                  <Badge className="text-xs bg-amber-100 text-amber-700 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Ausstehend
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setInviteId(b.id)}
                  disabled={isRegistered}
                  className="gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  Einladen
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Bestätigungs-Dialog */}
      {inviteId && (
        <AlertDialog open={!!inviteId} onOpenChange={(open) => { if (!open) setInviteId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Send className="w-5 h-5 text-primary" />
                Einladung senden
              </AlertDialogTitle>
              <AlertDialogDescription>
                {(() => {
                  const user = unregisteredBenutzer.find(b => b.id === inviteId);
                  return user ? `Eine Einladungsmail wird an ${user.user_id} gesendet. Der Benutzer wird dann als ${user.rolle} registriert.` : '';
                })()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const user = unregisteredBenutzer.find(b => b.id === inviteId);
                  if (user) {
                    setInvitingId(inviteId);
                    inviteMutation.mutate({
                      email: user.user_id,
                      rolle: user.rolle
                    });
                  }
                }}
                disabled={inviteMutation.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {inviteMutation.isPending ? 'Wird gesendet...' : 'Einladung senden'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}