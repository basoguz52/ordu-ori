import { useEffect, useMemo, useState } from "react";
import DataTable from "../../../components/ui/DataTable";

function clean(s) {
  return (s ?? "").toString().replace(/\s+/g, " ").trim();
}

function slugifyKeyTR(s) {
  const x = clean(s)
    .toLocaleLowerCase("tr-TR")
    .replace(/[ğ]/g, "g")
    .replace(/[ü]/g, "u")
    .replace(/[ş]/g, "s")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ç]/g, "c")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return x || "col";
}

// Başlık metinlerini normalize edip filtre eşlemesi yapmak için
function normHeaderTR(s) {
  return clean(s).toLocaleLowerCase("tr-TR");
}

/**
 * HTML içinden "asıl" sonucu taşıyan tabloyu bulup
 * header + rows döndürür.
 *
 * Mantık:
 *  - sayfadaki tüm table’lara bak
 *  - en çok satırı olan tabloyu “ana tablo” varsay
 *  - header row’u: th varsa onu, yoksa ilk satırı header say
 */
function extractMainTable(htmlText) {
  const doc = new DOMParser().parseFromString(htmlText, "text/html");
  const tables = Array.from(doc.querySelectorAll("table"));
  if (!tables.length) return { headers: [], rows: [] };

  // En çok data satırı olan tabloyu seç
  let best = null;
  let bestScore = -1;

  for (const t of tables) {
    const trs = Array.from(t.querySelectorAll("tr"));
    const dataLike = trs.filter((tr) => tr.querySelectorAll("td").length >= 2).length;
    if (dataLike > bestScore) {
      bestScore = dataLike;
      best = t;
    }
  }

  if (!best) return { headers: [], rows: [] };

  const trs = Array.from(best.querySelectorAll("tr"));
  if (!trs.length) return { headers: [], rows: [] };

  // Header row tespiti
  let headerTr = trs.find((tr) => tr.querySelectorAll("th").length > 0) || trs[0];
  let headerCells = Array.from(headerTr.querySelectorAll("th,td")).map((c) => clean(c.textContent));

  // Header boşsa fallback
  if (headerCells.every((h) => !h)) {
    headerCells = headerCells.map((_, i) => `Sütun ${i + 1}`);
  }

  // key üret + benzersizleştir
  const keys = [];
  const seen = new Map();
  for (const h of headerCells) {
    const base = slugifyKeyTR(h);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    keys.push(n === 1 ? base : `${base}_${n}`);
  }

  // Data rows: headerTr’den sonraki tr’lar
  const startIdx = trs.indexOf(headerTr) + 1;
  const dataTrs = trs.slice(startIdx);

  const rows = [];
  for (const tr of dataTrs) {
    const tds = Array.from(tr.querySelectorAll("td"));
    if (tds.length < 2) continue;

    const obj = {};
    for (let i = 0; i < keys.length; i++) {
      obj[keys[i]] = clean(tds[i]?.textContent ?? "");
    }
    // id üret
    obj.__id = `${obj[keys[0]] || ""}_${obj[keys[1]] || ""}_${rows.length}`;
    rows.push(obj);
  }

  return {
    headers: headerCells.map((h, i) => ({ key: keys[i], label: h || `Sütun ${i + 1}` })),
    rows,
    title: clean(doc.title || ""),
  };
}

/**
 * Filtreyi "fazla üretmemek" için:
 * Sadece belirli başlıklara denk gelirse filtre aç.
 * (İstersen buraya senin HTML’inde ne varsa onu ekleriz.)
 */
const FILTER_WHITELIST = [
  { match: ["kulüp", "klüp", "kulup"], type: "select" },
  { match: ["kategori", "sınıf", "sinif", "class"], type: "select" },
  { match: ["durum", "status"], type: "select" },
];

function pickFilterableColumns(headers) {
  const out = [];
  for (const h of headers) {
    const nh = normHeaderTR(h.label);
    const rule = FILTER_WHITELIST.find((r) => r.match.some((m) => nh.includes(m)));
    if (rule) out.push({ key: h.key, label: h.label, type: rule.type });
  }
  return out;
}

export default function ResultsDynamicTable({
  source,                // "live" | "intermediate"
  title,
  refreshIntervalMs,
  enableSearch = false,  // "fazlası olmasın" dediğin için default kapalı
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [pageTitle, setPageTitle] = useState(title ?? "");

  // Filtre state (dinamik select’ler + opsiyonel search)
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState({}); // { colKey: selectedValue }

  async function load() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/results.php?source=${source}`, { cache: "no-store" });
      const htmlText = await res.text();
      if (!res.ok) throw new Error(htmlText || `HTTP ${res.status}`);

      const parsed = extractMainTable(htmlText);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setPageTitle(title ?? parsed.title ?? "");
      setFilters({}); // reload’da filtreleri resetlemek istersen
    } catch (e) {
      setError(e?.message || "Bilinmeyen hata");
      setHeaders([]);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    if (!refreshIntervalMs) return;
    const t = setInterval(load, refreshIntervalMs);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, refreshIntervalMs]);

  const filterableCols = useMemo(() => pickFilterableColumns(headers), [headers]);

  const filterOptions = useMemo(() => {
    // her filtrelenebilir kolon için unique seçenekler
    const out = {};
    for (const fc of filterableCols) {
      const set = new Set();
      for (const r of rows) {
        const v = clean(r[fc.key]);
        if (v) set.add(v);
      }
      out[fc.key] = Array.from(set).sort((a, b) => a.localeCompare(b, "tr"));
    }
    return out;
  }, [rows, filterableCols]);

  const filteredRows = useMemo(() => {
    const s = enableSearch ? q.trim().toLocaleLowerCase("tr-TR") : "";

    return rows.filter((r) => {
      // select filtreler
      for (const fc of filterableCols) {
        const selected = filters[fc.key];
        if (selected && clean(r[fc.key]) !== selected) return false;
      }

      // opsiyonel arama
      if (s) {
        const hay = headers
          .map((h) => r[h.key])
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("tr-TR");
        if (!hay.includes(s)) return false;
      }

      return true;
    });
  }, [rows, headers, filterableCols, filters, q, enableSearch]);

  const columns = useMemo(() => {
    // DataTable kolonlarını dinamik üret
    return headers.map((h) => ({
      key: h.key,
      header: h.label,
      render: (r) => r[h.key] || "-",
    }));
  }, [headers]);

  function clearFilters() {
    setFilters({});
    setQ("");
  }

  const hasAnyFilter = filterableCols.length > 0 || enableSearch;

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          {pageTitle || (source === "live" ? "Canlı Sonuçlar" : "Ara Sonuçlar")}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Gösterilen: <span className="font-semibold">{filteredRows.length}</span> / {rows.length}
        </p>
      </div>

      {/* Filtre bar: SADECE whitelist eşleşen kolonlar + opsiyonel arama */}
      {hasAnyFilter ? (
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-4">
            {filterableCols.map((fc) => (
              <div key={fc.key} className="space-y-1">
                <div className="text-xs font-semibold text-slate-700">{fc.label}</div>
                <select
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={filters[fc.key] ?? ""}
                  onChange={(e) => setFilters((prev) => ({ ...prev, [fc.key]: e.target.value }))}
                  disabled={loading}
                >
                  <option value="">Hepsi</option>
                  {(filterOptions[fc.key] ?? []).map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            ))}

            {enableSearch ? (
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-700">Ara</div>
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="Tabloda ara..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  disabled={loading}
                />
              </div>
            ) : null}

            <div className="flex items-end gap-2">
              <button
                className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                onClick={clearFilters}
                disabled={loading || (Object.keys(filters).length === 0 && !q)}
                type="button"
              >
                Temizle
              </button>

              <button
                className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                onClick={load}
                disabled={loading}
                type="button"
              >
                Yenile
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border bg-white p-6 text-sm text-red-600 shadow-sm">
          Hata: {error}
        </div>
      ) : loading ? (
        <div className="rounded-2xl border bg-white p-6 text-sm text-slate-600 shadow-sm">
          Yükleniyor...
        </div>
      ) : headers.length === 0 ? (
        <div className="rounded-2xl border bg-white p-6 text-sm text-slate-600 shadow-sm">
          Tablo bulunamadı.
        </div>
      ) : (
        <DataTable columns={columns} rows={filteredRows} rowKey={(r) => r.__id} />
      )}
    </div>
  );
}
