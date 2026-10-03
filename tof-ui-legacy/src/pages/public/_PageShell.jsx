export default function PageShell({ title, children }) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      {children ? <div className="mt-3 text-sm text-slate-700">{children}</div> : null}
    </div>
  );
}
