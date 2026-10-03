export default function Modal({ open, title, children, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">{title}</h2>
          <button className="text-sm underline" onClick={onClose}>Kapat</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
