// DB: "YYYY-MM-DD HH:mm:ss" -> input: "YYYY-MM-DDTHH:mm"
export function toLocalDateTime(dbVal) {
  if (!dbVal) return "";
  return String(dbVal).replace(" ", "T").slice(0, 16);
}

// input: "YYYY-MM-DDTHH:mm" -> DB: "YYYY-MM-DD HH:mm:ss"
export function fromLocalDateTime(localVal) {
  const s = String(localVal || "").trim();
  if (!s) return null;
  const v = s.replace("T", " ");
  return v.length === 16 ? `${v}:00` : v;
}

export default function InlineRegEndEditor({ disabled, value, onChange, onSave }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="datetime-local"
        className="rounded-lg border px-2 py-1 text-xs"
        disabled={disabled}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={onSave}
        className="rounded-lg border px-2 py-1 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
        title="Kaydet"
      >
        ✓
      </button>
    </div>
  );
}
