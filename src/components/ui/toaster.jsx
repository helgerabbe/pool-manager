import { useToast } from "@/components/ui/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, open, onOpenChange, ...props }) {
        // `open` und `onOpenChange` sind interne Felder des useToast-State und
        // dürfen nicht ans DOM-`<div>` durchgereicht werden (sonst React-Warnung
        // "Unknown event handler property `onOpenChange`"). Toasts mit
        // open=false (gerade dismissed) werden ausgeblendet, bis sie aus dem
        // State entfernt werden.
        if (open === false) return null;
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose onClick={() => onOpenChange?.(false)} />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}