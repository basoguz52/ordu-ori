import { useEffect, useState } from "react";
import { Select } from "../../../components/ui/Form";

function emptyForm() {
  return {
    name: "",
    description: "",
    type: "",
    start_date: "",
    end_date: "",
    location: "",
    is_registration_open: 1,
    registration_start_at: "",
    registration_end_at: "",

    // Backend list/get artık *_url döndürüyor. Bu alanlar sadece UI'da
    // “mevcut dosya” linkini göstermek için.
    bulletin_path: "",
    bulletin_url: "",
    oncikis_path: "",
    oncikis_url: "",
    kesincikis_path: "",
    kesincikis_url: "",
  };
}

// DB: "YYYY-MM-DD HH:mm:ss" -> input: "YYYY-MM-DDTHH:mm"
function toDatetimeLocal(dbVal) {
  if (!dbVal) return "";
  return String(dbVal).replace(" ", "T").slice(0, 16);
}

// input: "YYYY-MM-DDTHH:mm" -> DB: "YYYY-MM-DD HH:mm:ss"
function fromDatetimeLocal(localVal) {
  const s = String(localVal || "").trim();
  if (!s) return null;
  const v = s.replace("T", " ");
  return v.length === 16 ? `${v}:00` : v;
}

function prettyBytes(n) {
  const v = Number(n || 0);
  if (!v) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const idx = Math.min(units.length - 1, Math.floor(Math.log(v) / Math.log(1024)));
  const val = v / Math.pow(1024, idx);
  return `${val.toFixed(val >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export default function EventModal({
  open,
  mode, // "create" | "edit"
  initialValues,
  saving,
  onClose,
  onChange, // (nextForm) => void
  onSave, // (nextForm, files?) => void
  onDeleteBulletin,
  onDeleteOnCikis,
  onDeleteKesinCikis,
}) {
  const [bulletinFile, setBulletinFile] = useState(null);
  const [oncikisFile, setOnCikisFile] = useState(null);
  const [kesincikisFile, setKesinCikisFile] = useState(null);

  const [deletingBulletin, setDeletingBulletin] = useState(false);
  const [deletingOnCikis, setDeletingOnCikis] = useState(false);
  const [deletingKesinCikis, setDeletingKesinCikis] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBulletinFile(null);
    setOnCikisFile(null);
    setKesinCikisFile(null);
  }, [open, initialValues?.id, mode]);

  if (!open) return null;

  const raw = initialValues ?? emptyForm();
  const isNew = mode === "create";

  const form = {
    ...emptyForm(),
    ...raw,
    registration_start_at: toDatetimeLocal(raw.registration_start_at),
    registration_end_at: toDatetimeLocal(raw.registration_end_at),
  };

  const set = (patch) => onChange({ ...form, ...patch });

  function handleSaveClick() {
    const next = {
      ...form,
      registration_start_at: fromDatetimeLocal(form.registration_start_at),
      registration_end_at: fromDatetimeLocal(form.registration_end_at),
    };

    onSave(next, { bulletinFile, oncikisFile, kesincikisFile });
  }

  // Backend step-3 ile artık *_url geliyor. Fallback için eski path'leri koruyoruz.
  const currentBulletinUrl =
    form.bulletin_url || (form.bulletin_path ? `/bulletin/${String(form.bulletin_path).replace(/^\/+/, "")}` : "");

  const currentOnCikisUrl =
    form.oncikis_url || (form.oncikis_path ? `/cikis/${String(form.oncikis_path).replace(/^\/+/, "")}` : "");

  const currentKesinCikisUrl =
    form.kesincikis_url || (form.kesincikis_path ? `/cikis/${String(form.kesincikis_path).replace(/^\/+/, "")}` : "");

  async function handleDeleteBulletin() {
    if (isNew || !onDeleteBulletin) return;
    if (!confirm("Bülten PDF silinsin mi?")) return;
    setDeletingBulletin(true);
    try {
      await onDeleteBulletin();
      set({ bulletin_path: "", bulletin_url: "" });
      setBulletinFile(null);
    } finally {
      setDeletingBulletin(false);
    }
  }

  async function handleDeleteOnCikis() {
    if (isNew || !onDeleteOnCikis) return;
    if (!confirm("Ön Çıkış PDF silinsin mi?")) return;
    setDeletingOnCikis(true);
    try {
      await onDeleteOnCikis();
      set({ oncikis_path: "", oncikis_url: "" });
      setOnCikisFile(null);
    } finally {
      setDeletingOnCikis(false);
    }
  }

  async function handleDeleteKesinCikis() {
    if (isNew || !onDeleteKesinCikis) return;
    if (!confirm("Kesin Çıkış PDF silinsin mi?")) return;
    setDeletingKesinCikis(true);
    try {
      await onDeleteKesinCikis();
      set({ kesincikis_path: "", kesincikis_url: "" });
      setKesinCikisFile(null);
    } finally {
      setDeletingKesinCikis(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-2xl rounded-2xl border bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="text-lg font-semibold text-slate-900">{isNew ? "Yeni Yarışma" : "Yarışma Düzenle"}</div>

          <button
            type="button"
            className="rounded-lg border px-3 py-1 text-sm font-semibold hover:bg-slate-50"
            onClick={onClose}
            disabled={saving}
          >
            Kapat
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-slate-700">Ad *</span>
            <input className="rounded-xl border px-3 py-2" value={form.name} onChange={(e) => set({ name: e.target.value })} disabled={saving} />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-slate-700">Yer *</span>
            <input
              className="rounded-xl border px-3 py-2"
              value={form.location}
              onChange={(e) => set({ location: e.target.value })}
              disabled={saving}
            />
          </label>

          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="font-semibold text-slate-700">Açıklama</span>
            <textarea
              className="min-h-[90px] rounded-xl border px-3 py-2"
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              disabled={saving}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-slate-700">Tür</span>
            <input className="rounded-xl border px-3 py-2" value={form.type} onChange={(e) => set({ type: e.target.value })} disabled={saving} />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-slate-700">Kayıt</span>
            <Select
              disabled={saving}
              value={Number(form.is_registration_open) === 1 ? 1 : 0}
              onChange={(e) => set({ is_registration_open: Number(e.target.value) === 1 ? 1 : 0 })}
              options={[
                { value: 1, label: "Açık" },
                { value: 0, label: "Kapalı" },
              ]}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-slate-700">Başlangıç *</span>
            <input className="rounded-xl border px-3 py-2" type="date" value={form.start_date} onChange={(e) => set({ start_date: e.target.value })} disabled={saving} />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-slate-700">Bitiş *</span>
            <input className="rounded-xl border px-3 py-2" type="date" value={form.end_date} onChange={(e) => set({ end_date: e.target.value })} disabled={saving} />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-slate-700">Kayıt Başlangıç</span>
            <input
              className="rounded-xl border px-3 py-2"
              type="datetime-local"
              value={form.registration_start_at}
              onChange={(e) => set({ registration_start_at: e.target.value })}
              disabled={saving}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-slate-700">Kayıt Bitiş</span>
            <input
              className="rounded-xl border px-3 py-2"
              type="datetime-local"
              value={form.registration_end_at}
              onChange={(e) => set({ registration_end_at: e.target.value })}
              disabled={saving}
            />
          </label>
        </div>

        {/* PDF upload area */}
        <div className="mt-5 rounded-2xl border bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-800">PDF Dosyaları</div>

          <div className="mt-3 grid gap-4 md:grid-cols-3">
            {/* Bulletin */}
            <div className="rounded-xl border bg-white p-3">
              <div className="text-xs font-semibold text-slate-700">Bülten</div>
              <div className="mt-2 flex flex-col gap-2">
                {currentBulletinUrl ? (
                  <div className="flex items-center justify-between gap-2">
                    <a className="text-xs text-blue-600 hover:underline" href={currentBulletinUrl} target="_blank" rel="noreferrer">
                      Mevcut bülten
                    </a>
                    {!isNew && (
                      <button
                        type="button"
                        onClick={handleDeleteBulletin}
                        disabled={saving || deletingBulletin}
                        className="rounded-lg border px-2 py-1 text-[11px] font-semibold hover:bg-slate-50 disabled:opacity-50"
                      >
                        {deletingBulletin ? "Siliniyor…" : "Sil"}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">Henüz yok</div>
                )}
                <input type="file" accept="application/pdf" disabled={saving} onChange={(e) => setBulletinFile(e.target.files?.[0] ?? null)} />
                {bulletinFile ? (
                  <div className="text-[11px] text-slate-600">
                    Seçildi: <span className="font-semibold">{bulletinFile.name}</span> ({prettyBytes(bulletinFile.size)})
                  </div>
                ) : null}
              </div>
            </div>

            {/* On Cikis */}
            <div className="rounded-xl border bg-white p-3">
              <div className="text-xs font-semibold text-slate-700">Ön Çıkış</div>
              <div className="mt-2 flex flex-col gap-2">
                {currentOnCikisUrl ? (
                  <div className="flex items-center justify-between gap-2">
                    <a className="text-xs text-blue-600 hover:underline" href={currentOnCikisUrl} target="_blank" rel="noreferrer">
                      Mevcut ön çıkış
                    </a>
                    {!isNew && (
                      <button
                        type="button"
                        onClick={handleDeleteOnCikis}
                        disabled={saving || deletingOnCikis}
                        className="rounded-lg border px-2 py-1 text-[11px] font-semibold hover:bg-slate-50 disabled:opacity-50"
                      >
                        {deletingOnCikis ? "Siliniyor…" : "Sil"}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">Henüz yok</div>
                )}
                <input type="file" accept="application/pdf" disabled={saving} onChange={(e) => setOnCikisFile(e.target.files?.[0] ?? null)} />
                {oncikisFile ? (
                  <div className="text-[11px] text-slate-600">
                    Seçildi: <span className="font-semibold">{oncikisFile.name}</span> ({prettyBytes(oncikisFile.size)})
                  </div>
                ) : null}
              </div>
            </div>

            {/* Kesin Cikis */}
            <div className="rounded-xl border bg-white p-3">
              <div className="text-xs font-semibold text-slate-700">Kesin Çıkış</div>
              <div className="mt-2 flex flex-col gap-2">
                {currentKesinCikisUrl ? (
                  <div className="flex items-center justify-between gap-2">
                    <a className="text-xs text-blue-600 hover:underline" href={currentKesinCikisUrl} target="_blank" rel="noreferrer">
                      Mevcut kesin çıkış
                    </a>
                    {!isNew && (
                      <button
                        type="button"
                        onClick={handleDeleteKesinCikis}
                        disabled={saving || deletingKesinCikis}
                        className="rounded-lg border px-2 py-1 text-[11px] font-semibold hover:bg-slate-50 disabled:opacity-50"
                      >
                        {deletingKesinCikis ? "Siliniyor…" : "Sil"}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">Henüz yok</div>
                )}
                <input type="file" accept="application/pdf" disabled={saving} onChange={(e) => setKesinCikisFile(e.target.files?.[0] ?? null)} />
                {kesincikisFile ? (
                  <div className="text-[11px] text-slate-600">
                    Seçildi: <span className="font-semibold">{kesincikisFile.name}</span> ({prettyBytes(kesincikisFile.size)})
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-3 text-[11px] text-slate-600">
            Not: Kaydet&apos;e basınca PDF&apos;ler ayrıca upload edilir. Yeni yarışmada önce yarış oluşturulur (id alınır), sonra PDF yüklenir.
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button type="button" className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-slate-50" onClick={onClose} disabled={saving}>
            İptal
          </button>
          <button
            type="button"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            onClick={handleSaveClick}
            disabled={saving}
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
