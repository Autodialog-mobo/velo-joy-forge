"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const WalletDialog = DialogPrimitive.Root;
const WalletDialogTrigger = DialogPrimitive.Trigger;
const WalletDialogPortal = DialogPrimitive.Portal;
const WalletDialogClose = DialogPrimitive.Close;

const WalletDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm wallet-dialog-overlay",
      className,
    )}
    {...props}
  />
));
WalletDialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const WalletDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <WalletDialogPortal>
    <WalletDialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        "p-0 border-none bg-transparent shadow-none pointer-events-none",
        "wallet-dialog-content focus:outline-none",
        className,
      )}
      {...props}
    >
      <div className="relative w-full max-w-[360px] pointer-events-auto">
        {children}
        <DialogPrimitive.Close className="absolute right-3 top-3 rounded-full bg-black/50 p-2 text-white shadow-lg backdrop-blur-sm transition-all hover:bg-black/70 hover:scale-110 focus:outline-none z-10 ring-1 ring-white/30">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </div>
    </DialogPrimitive.Content>
  </WalletDialogPortal>
));
WalletDialogContent.displayName = DialogPrimitive.Content.displayName;

export {
  WalletDialog,
  WalletDialogPortal,
  WalletDialogOverlay,
  WalletDialogTrigger,
  WalletDialogClose,
  WalletDialogContent,
};
