import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { sourceMaterial, targetWords } = await req.json();

  if (!sourceMaterial?.trim()) {
    return Response.json({ error: 'sourceMaterial ist erforderlich.' }, { status: 400 });
  }

  const targetWordsClean = (targetWords || '')
    .split(',')
    .map(w => w.trim())
    .filter(Boolean);

  const targetWordsList = targetWordsClean.length > 0
    ? `\nDiese Wörter MÜSSEN zwingend als Lücken markiert werden (in eckige Klammern setzen): ${targetWordsClean.join(', ')}`
    : '';

  const prompt = `Du bist ein erfahrener Pädagoge. Erstelle einen didaktisch hochwertigen Lückentext auf Basis des folgenden Quellmaterials.

REGELN:
1. Identifiziere die wichtigsten Fachbegriffe und Schlüsselwörter im Text.
2. Ersetze diese Schlüsselwörter durch eckige Klammern: Schreibe das Wort IN die eckigen Klammern, z.B. [Photosynthese].
3. Der Text soll ohne die eingeklammerten Wörter noch sinnvoll lesbar sein.
4. Setze 5-10 Lücken, je nach Länge des Textes.${targetWordsList}

QUELLMATERIAL:
${sourceMaterial}

Antworte NUR mit dem fertigen Lückentext. Keine Erklärungen, keine Überschriften, nur den Text mit den eckigen Klammern.`;

  const result = await base44.integrations.Core.InvokeLLM({ prompt });

  return Response.json({ text: result });
});