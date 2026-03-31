import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, ArrowRight, Clock, Layers } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

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

export default function EinheitCard({ einheit, lernpaketCount }) {
  const colorClass = fachColors[einheit.fach] || 'bg-muted text-muted-foreground';

  return (
    <Link to={`/einheiten/${einheit.id}`}>
      <Card className="group hover:shadow-lg hover:border-primary/20 transition-all duration-300 cursor-pointer overflow-hidden">
        <CardContent className="p-0">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <Badge className={colorClass + ' font-medium'}>
                {einheit.fach}
              </Badge>
              <Badge variant={einheit.freigabe_status === 'Freigegeben für Moodle' ? 'default' : 'secondary'}>
                {einheit.freigabe_status || 'In Planung'}
              </Badge>
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
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {einheit.navigationslogik || 'Sequenziell'}
              </span>
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
  );
}