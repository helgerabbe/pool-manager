import { X } from 'lucide-react';

/**
 * Einfaches Vollbild-Overlay zur Anzeige eines vergrößerten Bildes.
 * Schließen per X-Button oder Klick auf den abgedunkelten Hintergrund.
 */
export default function BildLightbox({ url, caption, onClose }) {
  if (!url) return null;
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 flex items-center justify-center w-11 h-11 rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors"
        aria-label="Bild schließen"
      >
        <X className="w-6 h-6" />
      </button>
      <img
        src={url}
        alt={caption || 'Vergrößertes Bild'}
        className="max-w-full max-h-[85vh] object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
      {caption && (
        <p className="mt-3 text-sm text-white/90 text-center max-w-2xl">{caption}</p>
      )}
    </div>
  );
}