import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import SpeechInputButton from '@/components/ui/SpeechInputButton';

/** Freies Eingabefeld mit Spracheingabe. */
export default function FreitextMitSprache({ placeholder }) {
  const [text, setText] = React.useState('');
  return (
    <div className="relative">
      <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} className="pr-12" />
      <SpeechInputButton value={text} onResult={setText} maxSeconds={60} className="absolute right-2 top-2" />
    </div>
  );
}