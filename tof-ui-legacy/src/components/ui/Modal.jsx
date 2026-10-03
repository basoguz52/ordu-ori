export default function Modal({ open, title, children, onClose, footer }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-xl rounded-2xl border bg-white shadow-xl">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <button
              className="rounded-lg border px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
              onClick={onClose}
              type="button"
            >
              Kapat
            </button>
          </div>

          <div className="px-5 py-4">{children}</div>

          {footer ? <div className="border-t px-5 py-4">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
