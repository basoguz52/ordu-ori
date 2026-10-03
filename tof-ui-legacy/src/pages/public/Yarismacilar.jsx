import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient } from "../../api/apiClient";
import DataTable from "../../components/ui/DataTable";

function fullName(r) {
  return `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim();
}

export default function Yarismacilar() {
  const [sp] = useSearchParams();
  const eventId = sp.get("event");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ filtre state
  const [selectedClub, setSelectedClub] = useState("");      // club_code veya club_name
  const [selectedCategory, setSelectedCategory] = useState(""); // category_code
  const [q, setQ] = useState(""); // opsiyonel hızlı arama

  useEffect(() => {
    if (!eventId) return;
    (async () => {
      setLoading(true);
      try {
        const items = await apiClient.listEventRegistrations(eventId);
        setRows(items);
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId]);

  // ✅ dropdown seçenekleri (unique)
  const clubOptions = useMemo(() => {
    const map = new Map(); // key -> label
    for (const r of rows) {
      // Tercih: code varsa key olarak code; yoksa name
      const key = (r.club_code ?? r.club_name ?? "").trim();
      if (!key) continue;
      const label = r.club_code ? `${r.club_code} — ${r.club_name ?? ""}`.trim() : (r.club_name ?? key);
      if (!map.has(key)) map.set(key, label);
    }
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "tr"));
  }, [rows]);

  const categoryOptions = useMemo(() => {
    const map = new Map(); // code -> label
    for (const r of rows) {
      const code = (r.category_code ?? "").trim();
      if (!code) continue;
      const label = r.category_name ? `${code} — ${r.category_name}` : code;
      if (!map.has(code)) map.set(code, label);
    }
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "tr"));
  }, [rows]);

  // ✅ filtrelenmiş satırlar
  const filteredRows = useMemo(() => {
    const s = q.trim().toLowerCase();

    return rows.filter((r) => {
      const clubKey = (r.club_code ?? r.club_name ?? "").trim();
      if (selectedClub && clubKey !== selectedClub) return false;

      const catCode = (r.category_code ?? "").trim();
      if (selectedCategory && catCode !== selectedCategory) return false;

      if (s) {
        const hay = [
          fullName(r),
          r.si_chip_no,
          r.license_no,
          r.club_name,
          r.club_code,
          r.category_code,
          r.category_name,
          r.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!hay.includes(s)) return false;
      }

      return true;
    });
  }, [rows, selectedClub, selectedCategory, q]);

  const columns = useMemo(
    () => [
      { key: "athlete", header: "Sporcu", render: (r) => fullName(r) || "-" },
      { key: "si_chip_no", header: "SI", render: (r) => r.si_chip_no ?? "-" },
      { key: "club", header: "Kulüp", render: (r) => r.club_name ?? "-" },
      { key: "category", header: "Kategori", render: (r) => r.category_code ?? "-" },
      { key: "status", header: "Durum", render: (r) => r.status ?? "-" },
    ],
    []
  );

  function clearFilters() {
    setSelectedClub("");
    setSelectedCategory("");
    setQ("");
  }

  if (!eventId) {
    return (
      <div className="rounded-2xl border bg-white p-6 text-sm text-slate-700 shadow-sm">
        Event parametresi yok. Örnek:{" "}
        <span className="font-mono">/yarisma-basvurulari/yarismacilar?event=10</span>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Yarışmacılar</h1>
        <p className="mt-1 text-sm text-slate-600">Event ID: {eventId}</p>
      </div>

      {/* ✅ Filtre bar */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-700">Kulüp</div>
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={selectedClub}
              onChange={(e) => setSelectedClub(e.target.value)}
              disabled={loading}
            >
              <option value="">Hepsi</option>
              {clubOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-700">Kategori</div>
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              disabled={loading}
            >
              <option value="">Hepsi</option>
              {categoryOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-700">Ara</div>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="İsim, SI, lisans, kulüp..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
              onClick={clearFilters}
              disabled={loading || (!selectedClub && !selectedCategory && !q)}
              type="button"
            >
              Temizle
            </button>

            <div className="ml-auto text-xs text-slate-500">
              Gösterilen: <span className="font-semibold">{filteredRows.length}</span> / {rows.length}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border bg-white p-6 text-sm text-slate-600 shadow-sm">Yükleniyor...</div>
      ) : (
        <DataTable columns={columns} rows={filteredRows} rowKey={(r) => r.id} />
      )}
    </div>
  );
}
