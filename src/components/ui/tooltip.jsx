"use client"

/*
 * EBENEN-ORDNUNG (siehe auch ui/dialog.jsx)
 *   9998   Overlay eines Dialogs
 *   9999   Dialog (Grundebene)
 *  10001   Dialog IM Dialog (Aufrufer setzt zIndex)
 *  20000   Popover-Schicht: Select, Dropdown, Popover, Tooltip
 *
 * Popover-artige Elemente liegen IMMER ueber allen Dialogen — sie gehoeren
 * zu einem Bedienelement INNERHALB eines Dialogs und waeren darunter
 * unbedienbar. Bitte hier keine Einzelwerte mehr raten: Genau das hat schon
 * zweimal zu unsichtbaren Menues gefuehrt (Dropdown im Dialog 2026-08-29,
 * Select im Schritt-Fenster 2026-08-31).
 */
import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-[20000] overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props} />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
