import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Hafif modal (Radix'siz). createPortal ile body'ye basılır.
 * - Escape ile kapanır, overlay tıklanınca kapanır.
 * - Açıkken body scroll kilitlenir, panele focus verilir.
 */
export function Dialog({
  open,
  onClose,
  children,
  className,
  closeOnOverlay = true,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  closeOnOverlay?: boolean;
}) {
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Panele focus (erişilebilirlik + görünürlük)
    const t = window.setTimeout(() => panelRef.current?.focus(), 0);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={closeOnOverlay ? onClose : undefined}
      />
      <div className="absolute inset-0 grid place-items-start justify-center overflow-y-auto p-4 sm:place-items-center">
        <div
          ref={panelRef}
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "relative my-8 w-full max-w-lg rounded-xl border bg-card text-card-foreground shadow-lg outline-none",
            "max-h-[calc(100vh-4rem)] overflow-y-auto",
            className,
          )}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function DialogHeader({
  title,
  onClose,
}: {
  title: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
      <h2 className="font-semibold">{title}</h2>
      {onClose && (
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Kapat">
          <X />
        </Button>
      )}
    </div>
  );
}

export function DialogBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("p-5", className)}>{children}</div>;
}
