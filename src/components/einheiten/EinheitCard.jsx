import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, ArrowRight, Clock, Layers, Trash2, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import DeleteConfirmModal from '@/components/shared/DeleteConfirmModal';
import { ROLLEN } from '@/lib/rbac';

const fachColors = {
  Deutsch: 'bg-red-100 text-red-700',
  Mathematik: 'bg-blue-100 text-blue-700',
  Englisch: 'bg-yellow-100 text-yellow-700',
  Französisch: 'bg-purple-100 text-purple-700',
  Biologie: 'bg-green-100 text-green-700',
  Chemie: 'bg-orange-100 text-orange-700',
  Physik: 'bg-cyan-100 text-cyan-700',
  Geschichte: 'bg-amber-100 text-amber-700',
  Informatik: 'bg-indigo-100 text-indigo-700',
};

export default function EinheitCard({ einheit, lernpaketCount, rolle, onDeleteStart, onDeleteEnd }) {
  const colorClass = fachColors[einheit.fach] || 'bg-muted text-muted-foreground';
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
          <Card className="group hover:shadow-lg hover:border-primary/20 transition-all duration-300 cursor-pointer overflow-hidden">
            <CardContent className="p-0">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <Badge className={colorClass + ' font-medium'}>
                    {einheit.fach}
                  </Badge>
                  {einheit.freigabe_status === 'Gesperrt' && (
                    <Badge className="bg-red-100 text-red-700 border border-red-200 gap-1">
                      <Lock className="w-3 h-3" />
                      Gesperrt
                    </Badge>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {einheit.titel_der_einheit}
                </h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    Jg. {einheit.jahrgangsstufe}
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    {lernpaketCount} Paket{lernpaketCount !== 1 ? 'e' : ''}
                  </span>
                  {einheit.bearbeitungsmodus && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {einheit.bearbeitungsmodus === 'sequenziell' ? 'Sequenziell' : 'Offen'}
                    </span>
                  )}
                </div>
              </div>
              <div className="px-6 py-3 bg-muted/50 flex items-center justify-between border-t">
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