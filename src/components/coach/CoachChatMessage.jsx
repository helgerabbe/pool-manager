import ReactMarkdown from 'react-markdown';
import { Bot } from 'lucide-react';

/**
 * Eine Chat-Blase im Einheiten-Coach. Coach-Antworten werden als Markdown
 * gerendert, Lehrkraft-Nachrichten als schlichter Text.
 */
export default function CoachChatMessage({ message }) {
  const istUser = message.role === 'user';
  if (istUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm whitespace-pre-wrap">
          {message.text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2.5">
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-accent/15 text-accent shrink-0 mt-0.5">
        <Bot className="w-4 h-4" />
      </span>
      <div
        className={`max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm ${
          message.error ? 'bg-destructive/10 text-destructive' : 'bg-muted text-foreground'
        }`}
      >
        <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5">
          <ReactMarkdown>{message.text}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}