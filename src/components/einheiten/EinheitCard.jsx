import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Layers, Trash2, Lock, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import DeleteConfirmModal from '@/components/shared/DeleteConfirmModal';
import { ROLLEN } from '@/lib/rbac';
import { getFachFarbe, getFachBadgeStyle } from '@/lib/fachFarben';
import EinheitAccessBadge from '@/components/ui/EinheitAccessBadge';

export default function EinheitCard({ einheit, lernpaketCount, rolle, onDeleteStart, onDeleteEnd, currentUserEmail }) {
  const { data: faecher = [] } = useQuery({
    queryKey: ['lookupFaecher'],
    queryFn: () => base44.entities.LookupFaecher.list(),
    staleTime: 5 * 60 * 1000,
  });
  const fachHex = getFachFarbe(einheit.fach, faecher);
  const badgeStyle = getFachBadgeStyle(fachHex);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();
  const isAdmin = rolle === ROLLEN.ADMIN;

  const handleDelete = async () => {
    setIsDeleting(true);
    onDeleteStart?.();
    try {
      const res = await base44.functions.invoke('deleteEinheit', { einheitId: einheit.id });
      if (res.data?.success) {
        toast.success('Einheit erfolgreich gelöscht.');
        setShowConfirm(false);
        onDeleteEnd?.();
        // invalidate NACH onDeleteEnd, damit das Overlay schon weg ist bevor die Card verschwindet
        queryClient.invalidateQueries({ queryKey: ['einheiten'] });
      } else {
        const errorMsg = res.data?.error || 'Fehler beim Löschen der Einheit.';
        toast.error(errorMsg);
        setIsDeleting(false);
        onDeleteEnd?.();
      }
    } catch (err) {
      let errorMessage = 'Fehler beim Löschen der Einheit.';
      
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      toast.error(errorMessage);
      console.error('Delete error:', err);
      setIsDeleting(false);
      onDeleteEnd?.();
    }
  };

  return (
    <>
      <div className="relative group/card">
        <Link to={`/einheiten/${einheit.id}`}>
          <Card className="group hover:shadow-lg hover:border-primary/20 transition-all duration-300 cursor-pointer overflow-hidden h-[168px] flex flex-col">
            <CardContent className="p-0 flex flex-col flex-1">
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-3 gap-2">
                  <Badge className="font-medium border" style={badgeStyle}>
                    {einheit.fach}
                  </Badge>
                  <div className="flex items-center gap-1 shrink-0">
                    {einheit.freigabe_status === 'Gesperrt' && (
                      <Badge className="bg-red-100 text-red-700 border border-red-200 gap-1">
                        <Lock className="w-3 h-3" />
                        Gesperrt
                      </Badge>
                    )}
                    <EinheitAccessBadge 
                      currentUserEmail={currentUserEmail} 
                      members={einheit.members} 
                    />
                  </div>
                </div>
                <h3 className="text-base font-semibold text-foreground mb-auto group-hover:text-primary transition-colors line-clamp-2">
                  {einheit.titel_der_einheit}
                </h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    Jg. {einheit.jahrgangsstufe}
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    {lernpaketCount} Paket{lernpaketCount !== 1 ? 'e' : ''}
                  </span>
                </div>
              </div>
              <div className="px-6 py-2.5 bg-muted/50 flex items-center justify-between border-t shrink-0">
                <span className="text-xs text-muted-foreground">
                  {einheit.created_date && format(new Date(einheit.created_date), 'dd. MMM yyyy', { locale: de })}
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Löschen-Button — nur für Administratoren */}
        {isAdmin && (
          <button
            onClick={(e) => { e.preventDefault(); setShowConfirm(true); }}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-md bg-white/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-red-50 transition-all opacity-0 group-hover/card:opacity-100"
            title="Einheit löschen"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <DeleteConfirmModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        titel={einheit.titel_der_einheit}
        isLoading={isDeleting}
      />
    </>
  );
}