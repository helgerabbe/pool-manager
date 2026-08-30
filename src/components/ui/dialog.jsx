"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

/*
 * EBENEN-ORDNUNG (dieselbe Tabelle steht in select/dropdown-menu/popover/tooltip)
 *   9998   Overlay eines Dialogs
 *   9999   Dialog (Grundebene)
 * +2 je   Dialog IM Dialog — ergibt sich AUTOMATISCH aus der Verschachtelung
 *  20000   Popover-Schicht: Select, Dropdown, Popover, Tooltip
 *
 * Ein Dialog im Dialog muss ueber seinem Eltern-Dialog liegen, sonst oeffnet
 * er sich unsichtbar dahinter. Frueher musste der Aufrufer dafuer eine Zahl
 * uebergeben — was zweimal vergessen wurde und beide Male zu einem Fenster
 * fuehrte, das da war, aber niemand sah.
 *
 * Deshalb rechnet sich die Ebene jetzt SELBST aus: Jeder DialogContent gibt
 * seine Ebene ueber einen Context nach unten weiter, ein darin geoeffneter
 * Dialog legt 2 drauf (Inhalt + eigenes Overlay). Das gilt auch ueber Portale
 * hinweg, weil React-Context dem Komponentenbaum folgt, nicht dem DOM.
 * Verschachtelte Editoren funktionieren damit ohne Zutun des Aufrufers.
 *
 * `zIndex` laesst sich weiterhin von Hand setzen, wird aber nicht gebraucht.
 */

/** Ebene des umgebenden Dialogs — null auf oberster Stufe. */
const DialogZContext = React.createContext(null);
const DIALOG_Z_DEFAULT = 9999;

const DialogOverlay = React.forwardRef(({ className, zIndex = DIALOG_Z_DEFAULT - 1, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    style={{ zIndex }}
    {...props} />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef(({ className, children, zIndex, ...props }, ref) => {
  const elternEbene = React.useContext(DialogZContext);
  const ebene = zIndex ?? (elternEbene == null ? DIALOG_Z_DEFAULT : elternEbene + 2);
  return (
  <DialogPortal>
    <DialogOverlay zIndex={ebene - 1} />
    <DialogPrimitive.Content
      ref={ref}
      style={{
        backgroundColor: 'white',
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: ebene,
      }}
      className={cn(
        "grid w-full max-w-lg gap-4 border border-border p-6 shadow-lg rounded-lg",
        className
      )}
      {...props}>
      {children}
      <DialogPrimitive.Close
        className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}) => (
  <div
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
    {...props} />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props} />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props} />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props} />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}