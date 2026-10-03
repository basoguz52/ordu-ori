function statusLabel(e) {
  const open = Number(e.is_registration_open) === 1;

  const now = new Date();
  const start = e.registration_start_at ? new Date(String(e.registration_start_at).replace(" ", "T")) : null;
  const end = e.registration_end_at ? new Date(String(e.registration_end_at).replace(" ", "T")) : null;

  if (!open) return { text: "Kayıt Kapalı", cls: "border-red-200 bg-red-50 text-red-700" };
  if (start && now < start) return { text: "Kayıt Başlamadı", cls: "border-amber-200 bg-amber-50 text-amber-800" };
  if (end && now > end) return { text: "Kayıt Bitti", cls: "border-amber-200 bg-amber-50 text-amber-800" };
  return { text: "Kayıt Açık", cls: "border-emerald-200 bg-emerald-50 text-emerald-800" };
}

export default function EventStatusBadge({ event }) {
  const s = statusLabel(event);
  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${s.cls}`}>
      {s.text}
    </span>
  );
}
