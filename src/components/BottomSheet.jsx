import { useEffect, useRef } from 'react';

export default function BottomSheet({ open, onClose, title, children, maxHeight = '85vh' }) {
  const openedAtRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    openedAtRef.current = Date.now();
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  function handleBackdrop() {
    // Ignore the ghost click that fires immediately after the tap that opened
    // the sheet on iOS Safari (touchend → synthesized click hits the backdrop
    // at the original touch position, which by now is the freshly mounted
    // backdrop element).
    if (Date.now() - openedAtRef.current < 300) return;
    onClose?.();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end bg-black/40 animate-fade-in" onClick={handleBackdrop}>
      <div
        className="w-full max-w-sm mx-auto bg-white dark:bg-[#101115] rounded-t-3xl p-5 flex flex-col animate-sheet-in"
        style={{ maxHeight }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-muted-light dark:bg-[#2a2d33] mb-4" />
        {title && (
          <header className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button onClick={onClose} className="text-muted px-2 py-1 -mr-2" aria-label="Close">✕</button>
          </header>
        )}
        <div className="flex-1 overflow-y-auto -mx-1 px-1">{children}</div>
      </div>
    </div>
  );
}
