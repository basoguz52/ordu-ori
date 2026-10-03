export function Field({ label, children, hint }) {
  return (
    <label className="grid gap-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

export function TextInput(props) {
  return (
    <input
      {...props}
      className={[
        "rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-400",
        props.className || "",
      ].join(" ")}
    />
  );
}

export function Select(props) {
  return (
    <select
      {...props}
      className={[
        "rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-slate-400",
        props.className || "",
      ].join(" ")}
    />
  );
}

export function PrimaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      className={[
        "rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60",
        props.className || "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      className={[
        "rounded-lg border px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60",
        props.className || "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function DangerButton({ children, ...props }) {
  return (
    <button
      {...props}
      className={[
        "rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60",
        props.className || "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
