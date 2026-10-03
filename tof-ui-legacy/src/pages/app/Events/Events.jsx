import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../../../api/apiClient";
import DataTable from "../../../components/ui/DataTable";
import { useAuth } from "../../../auth/AuthContext";

// 🔁 Bu sürüm, kesincikis (kesin çıkış) PDF’ini de destekler.
import EventModal from "./EventModal";

import EventsHeader from "./EventsHeader";
import EventsFilters from "./EventsFilters";
import EventStatusBadge from "./EventStatusBadge";
import InlineRegEndEditor, { toLocalDateTime, fromLocalDateTime } from "./InlineRegEndEditor";

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

    bulletin_path: "",
    bulletin_url: "",
    oncikis_path: "",
    oncikis_url: "",
    kesincikis_path: "",
    kesincikis_url: "",
  };
}

export default function Events() {
  const { user } = useAuth();
  const canManage = !!user && (user.is_club_manager || user.is_referee);

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [err, setErr] = useState(null);

  const [regEndDraft, setRegEndDraft] = useState({});

  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm());

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const items = await apiClient.listEvents({ q: "" });
      setRows(items);
      const nextDraft = {};
      for (const e of items) nextDraft[e.id] = toLocalDateTime(e.registration_end_at);
      setRegEndDraft(nextDraft);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      [r.name, r.location, r.type, r.start_date, r.end_date]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(s))
    );
  }, [q, rows]);

  function openCreate() {
    setEditItem({ id: null });
    setForm(emptyForm());
    setEditOpen(true);
  }

  function openEdit(r) {
    setEditItem({ id: r.id });
    setForm({
      ...emptyForm(),
      name: r.name ?? "",
      description: r.description ?? "",
      type: r.type ?? "",
      start_date: r.start_date ?? "",
      end_date: r.end_date ?? "",
      location: r.location ?? "",
      is_registration_open: Number(r.is_registration_open) === 1 ? 1 : 0,
      registration_start_at: r.registration_start_at ?? null,
      registration_end_at: r.registration_end_at ?? null,
      bulletin_path: r.bulletin_path ?? "",
      bulletin_url: r.bulletin_url ?? "",
      oncikis_path: r.oncikis_path ?? "",
      oncikis_url: r.oncikis_url ?? "",
      kesincikis_path: r.kesincikis_path ?? "",
      kesincikis_url: r.kesincikis_url ?? "",
    });
    setEditOpen(true);
  }

  async function toggleOpen(r) {
    setSavingId(r.id);
    setErr(null);
    try {
      const next = Number(r.is_registration_open) === 1 ? 0 : 1;
      await apiClient.updateEvent(r.id, { is_registration_open: next });
      setRows((cur) => cur.map((x) => (x.id === r.id ? { ...x, is_registration_open: next } : x)));
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setSavingId(null);
    }
  }

  async function saveInlineRegEnd(eventId, localValue) {
    setSavingId(eventId);
    setErr(null);
    try {
      const payload = { registration_end_at: fromLocalDateTime(localValue) };
      await apiClient.updateEvent(eventId, payload);
      setRows((cur) => cur.map((x) => (x.id === eventId ? { ...x, ...payload } : x)));
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setSavingId(null);
    }
  }

  async function removeEvent(r) {
    if (!confirm(`Silinsin mi?\n\n${r.name}`)) return;
    setSavingId(r.id);
    setErr(null);
    try {
      await apiClient.deleteEvent(r.id);
      setRows((cur) => cur.filter((x) => x.id !== r.id));
      setRegEndDraft((cur) => {
        const next = { ...cur };
        delete next[r.id];
        return next;
      });
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setSavingId(null);
    }
  }

  async function downloadCsv(r) {
  setSavingId(r.id);
  setErr(null);

  try {
    const { blob, filename } = await apiClient.downloadEventCsv(r.id);

    const safeName = String(r.name || "event").replace(/[^\w\-]+/g, "_");
    const finalName = filename && filename !== "download.csv"
      ? filename
      : `${safeName}_${r.id}.csv`;

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = finalName;
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);
  } catch (e) {
    setErr(String(e?.message || e));
  } finally {
    setSavingId(null);
  }
}


  // modal artık (nextForm, files) parametreleri ile gelir
  // files: { bulletinFile?, oncikisFile?, kesincikisFile? }
  async function saveModal(nextForm, files = {}) {
    if (!editItem) return;
    const isNew = !editItem.id;
    setSavingId(isNew ? "new" : editItem.id);
    setErr(null);

    try {
      const payload = {
        name: nextForm.name.trim(),
        description: nextForm.description?.trim() || null,
        type: nextForm.type?.trim() || null,
        start_date: nextForm.start_date,
        end_date: nextForm.end_date,
        location: nextForm.location.trim(),
        is_registration_open: Number(nextForm.is_registration_open) === 1 ? 1 : 0,
        registration_start_at: nextForm.registration_start_at ?? null,
        registration_end_at: nextForm.registration_end_at ?? null,
      };

      if (!payload.name || !payload.location || !payload.start_date || !payload.end_date) {
        throw new Error("Zorunlu alanlar: Ad, Yer, Başlangıç, Bitiş");
      }

      let eventId = editItem.id || null;
      if (isNew) {
        const created = await apiClient.createEvent(payload);
        eventId = created?.id ?? null;
        if (!eventId) throw new Error("Yarışma oluşturuldu ancak id dönmedi.");
      } else {
        await apiClient.updateEvent(eventId, payload);
      }

      const hasFiles = !!files?.bulletinFile || !!files?.oncikisFile || !!files?.kesincikisFile;
      if (hasFiles) {
        if (files?.bulletinFile) await apiClient.uploadEventBulletin(eventId, files.bulletinFile);
        if (files?.oncikisFile) await apiClient.uploadEventOnCikis(eventId, files.oncikisFile);
        if (files?.kesincikisFile) await apiClient.uploadEventKesinCikis(eventId, files.kesincikisFile);
        await load();
      } else {
        if (isNew) {
          await load();
        } else {
          setRows((cur) => cur.map((x) => (x.id === editItem.id ? { ...x, ...payload } : x)));
          setRegEndDraft((cur) => ({ ...cur, [editItem.id]: toLocalDateTime(payload.registration_end_at) }));
        }
      }

      setEditOpen(false);
      setEditItem(null);
      setForm(emptyForm());
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setSavingId(null);
    }
  }

  async function deleteBulletin() {
    if (!editItem?.id) return;
    setSavingId(editItem.id);
    setErr(null);
    try {
      await apiClient.deleteEventBulletin(editItem.id);
      setForm((prev) => ({ ...prev, bulletin_path: "", bulletin_url: "" }));
      setRows((cur) => cur.map((x) => (x.id === editItem.id ? { ...x, bulletin_path: null, bulletin_url: null } : x)));
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setSavingId(null);
    }
  }

  async function deleteOnCikis() {
    if (!editItem?.id) return;
    setSavingId(editItem.id);
    setErr(null);
    try {
      await apiClient.deleteEventOnCikis(editItem.id);
      setForm((prev) => ({ ...prev, oncikis_path: "", oncikis_url: "" }));
      setRows((cur) => cur.map((x) => (x.id === editItem.id ? { ...x, oncikis_path: null, oncikis_url: null } : x)));
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setSavingId(null);
    }
  }

  async function deleteKesinCikis() {
    if (!editItem?.id) return;
    setSavingId(editItem.id);
    setErr(null);
    try {
      await apiClient.deleteEventKesinCikis(editItem.id);
      setForm((prev) => ({ ...prev, kesincikis_path: "", kesincikis_url: "" }));
      setRows((cur) => cur.map((x) => (x.id === editItem.id ? { ...x, kesincikis_path: null, kesincikis_url: null } : x)));
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setSavingId(null);
    }
  }

  const columns = useMemo(() => {
    const base = [
      { key: "name", header: "Yarışma", render: (r) => r.name },
      { key: "location", header: "Yer", render: (r) => r.location ?? "-" },
      { key: "type", header: "Tür", render: (r) => r.type ?? "-" },
      { key: "date", header: "Tarih", render: (r) => `${r.start_date} → ${r.end_date}` },
      { key: "status", header: "Durum", render: (r) => <EventStatusBadge event={r} /> },
    ];
    if (!canManage) return base;

    return [
      ...base,
      {
        key: "open",
        header: "Kayıt",
        render: (r) => (
          <button
            type="button"
            disabled={savingId === r.id}
            onClick={() => toggleOpen(r)}
            className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            {Number(r.is_registration_open) === 1 ? "Açık" : "Kapalı"}
          </button>
        ),
      },
      {
        key: "regEnd",
        header: "Kayıt Bitiş",
        render: (r) => (
          <InlineRegEndEditor
            disabled={savingId === r.id}
            value={regEndDraft[r.id] ?? ""}
            onChange={(v) => setRegEndDraft((cur) => ({ ...cur, [r.id]: v }))}
            onSave={() => saveInlineRegEnd(r.id, regEndDraft[r.id] ?? "")}
          />
        ),
      },
      {
        key: "actions",
        header: "İşlem",
        render: (r) => (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={savingId === r.id}
              onClick={() => openEdit(r)}
              className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              Düzenle
            </button>
            <button
              type="button"
              disabled={savingId === r.id}
              onClick={() => downloadCsv(r)}
              className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
              title="Bu yarışın CSV çıktısını indir"
            >
              CSV İndir
            </button>
            <button
              type="button"
              disabled={savingId === r.id}
              onClick={() => removeEvent(r)}
              className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Sil
            </button>
          </div>
        ),
      },
    ];
  }, [canManage, regEndDraft, savingId]);

  return (
    <div className="p-4">
      <EventsHeader canManage={canManage} onCreate={openCreate} />
      <EventsFilters q={q} setQ={setQ} loading={loading} total={filtered.length}/>

      {err ? <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div> : null}

      <div className="mt-4">
        <DataTable columns={columns} rows={filtered} rowKey={(r) => r.id} loading={loading} />
      </div>

      <EventModal
        open={editOpen}
        mode={editItem?.id ? "edit" : "create"}
        initialValues={form}
        saving={savingId === "new" || savingId === editItem?.id}
        onClose={() => setEditOpen(false)}
        onChange={setForm}
        onSave={saveModal}
        onDeleteBulletin={deleteBulletin}
        onDeleteOnCikis={deleteOnCikis}
        onDeleteKesinCikis={deleteKesinCikis}
      />
    </div>
  );
}
