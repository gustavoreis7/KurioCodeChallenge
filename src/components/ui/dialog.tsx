import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useId, useRef, type ReactNode } from "react";
import { Button } from "./button";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className = "",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  const previousFocus = useRef<HTMLElement | null>(null);
  const titleId = useId(),
    descriptionId = useId();
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/65" />
        <DialogPrimitive.Content
          className={`market-modal ${className}`}
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          onOpenAutoFocus={(event) => {
            previousFocus.current = document.activeElement as HTMLElement;
            const input = document.querySelector<HTMLInputElement>(
              ".market-modal input",
            );
            if (input) {
              event.preventDefault();
              input.focus();
            }
          }}
          onCloseAutoFocus={(event) => {
            const trigger = previousFocus.current?.isConnected
              ? previousFocus.current
              : document.querySelector<HTMLElement>("[data-login-trigger]");
            if (trigger) {
              event.preventDefault();
              trigger.focus();
            }
          }}
        >
          <DialogPrimitive.Title
            id={titleId}
            className="mb-3 pr-8 text-base font-bold"
          >
            {title}
          </DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description
              id={descriptionId}
              className="mb-6 text-xs text-muted-foreground"
            >
              {description}
            </DialogPrimitive.Description>
          ) : (
            <DialogPrimitive.Description id={descriptionId} className="sr-only">
              {title}
            </DialogPrimitive.Description>
          )}
          <DialogPrimitive.Close asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2"
              aria-label="Fechar"
            >
              <X aria-hidden="true" />
            </Button>
          </DialogPrimitive.Close>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
