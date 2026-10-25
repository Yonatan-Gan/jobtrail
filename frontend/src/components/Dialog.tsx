import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}

// A modal built on the browser's own <dialog> element. showModal() gives the parts that
// are hard to get right by hand: the rest of the page becomes inert (so Tab stays inside
// the dialog), Esc closes it, and it is drawn on top of everything else.
//
// The `open` prop is the single source of truth: the parent decides when the dialog is
// open, and this component only mirrors that onto the <dialog> element.
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      // Remember what had focus (usually the button that opened us), to give it back later.
      openerRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      dialog.showModal();
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
      openerRef.current?.focus();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      // Esc fires a "cancel" event. Instead of letting the browser close the dialog by
      // itself, ask the parent to close it, so React state and the screen stay in sync.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={keepTabInside}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/50"
    >
      {/* The content only exists while open, so every opening starts with a fresh form. */}
      {open && (
        <div className="p-5">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          {description && (
            <div id={descriptionId} className="mt-1 text-sm text-slate-600">
              {description}
            </div>
          )}
          <div className="mt-4">{children}</div>
        </div>
      )}
    </dialog>
  );
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// The page behind a modal <dialog> is already inert, but browsers let Tab leave the
// dialog for the browser's own toolbar. This wraps Tab around inside the dialog instead:
// from the last control back to the first, and Shift+Tab the other way.
function keepTabInside(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") {
    return;
  }
  const focusable = [
    ...event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE),
  ];
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!first || !last) {
    return;
  }
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
