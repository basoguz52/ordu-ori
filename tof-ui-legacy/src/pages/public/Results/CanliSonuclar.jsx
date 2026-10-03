import { useEffect, useMemo, useState } from "react";

const LIVE_RESULTS_URL = "https://orduoryantiring.com.tr/api/results.php?source=live"; // ✅ senin eklediğin URL

// ---- Encoding: Türkçe karakter düzeltmesi ----
function decodeHtml(arrayBuffer) {
  // önce UTF-8
  let text = new TextDecoder("utf-8").decode(arrayBuffer);
  // UTF-8 mojibake (Ã¶ Ã§ vb) varsa windows-1254 dene
  if (/(Ã.|Â.|�)/.test(text)) {
    try {
      text = new TextDecoder("windows-1254").decode(arrayBuffer);
    } catch {}
  }
  return text;
}

function cleanText(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function isStatusTime(v) {
  const x = String(v || "").toLowerCase();
  return x === "mp" || x === "dnf" || x === "dsq" || x === "dns";
}

// ---- OE2010 HTML parse ----
function parseOe2010Html(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");

  let headerTitle = "";
  let headerTime = "";
  const top = doc.querySelector("#reporttop table");
  if (top) {
    const tds = top.querySelectorAll("tr:first-child td");
    headerTitle = cleanText(tds?.[0]?.textContent);
    headerTime = cleanText(tds?.[1]?.textContent);
  }

  const anchors = Array.from(doc.querySelectorAll("a[id]"));
  const groups = [];

  for (const a of anchors) {
    const id = a.getAttribute("id");
    if (!id) continue;

    // a'dan sonra gelen ilk tablo: kategori başlık tablosu
    let t1 = a.nextElementSibling;
    while (t1 && t1.tagName !== "TABLE") t1 = t1.nextElementSibling;
    if (!t1) continue;

    const nameRaw = cleanText(t1.querySelector("#c00")?.textContent);
    const statusRaw = cleanText(t1.querySelector("#c01")?.textContent);
    if (!nameRaw) continue;

    // ikinci tablo: kolon başlıkları
    let t2 = t1.nextElementSibling;
    while (t2 && t2.tagName !== "TABLE") t2 = t2.nextElementSibling;

    // üçüncü tablo: veri satırları
    let t3 = t2?.nextElementSibling;
    while (t3 && t3.tagName !== "TABLE") t3 = t3.nextElementSibling;
    if (!t3) continue;

    const rows = [];
    const trs = Array.from(t3.querySelectorAll("tbody tr"));
    for (const tr of trs) {
      const tds = Array.from(tr.querySelectorAll("td"));
      if (tds.length < 5) continue;

      const pos = cleanText(tds[0]?.textContent);
      const chip = cleanText(tds[1]?.textContent);
      const name = cleanText(tds[2]?.textContent);
      const club = cleanText(tds[3]?.textContent);
      const time = cleanText(tds[4]?.textContent);
      const diff = cleanText(tds[5]?.textContent);

      if (!pos && !chip && !name && !club && !time && !diff) continue;
      rows.push({ pos, chip, name, club, time, diff });
    }

    let progress = "";
    const m = nameRaw.match(/\((\d+\/\d+)\)/);
    if (m?.[1]) progress = m[1];

    groups.push({
      id,
      name: nameRaw,
      status: statusRaw,
      progress,
      rows,
    });
  }

  return { headerTitle, headerTime, groups };
}

export default function CanliSonuclar() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState(null);
  const [rawHtml, setRawHtml] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  // Filtreler: başta HİÇBİRİ seçili değil
  const [secondsLeft, setSecondsLeft] = useState(59);
  const [selectedCategory, setSelectedCategory] = useState(""); // "" => hepsi
  const [selectedClub, setSelectedClub] = useState(""); // "" => hepsi
  const [onlyFinished, setOnlyFinished] = useState(false);

  const parsed = useMemo(() => {
    if (!rawHtml) return { headerTitle: "", headerTime: "", groups: [] };
    return parseOe2010Html(rawHtml);
  }, [rawHtml]);

  const categoryOptions = useMemo(
    () => parsed.groups.map((g) => ({ id: g.id, label: g.name })),
    [parsed.groups]
  );

  // Kategori seçilmediyse tüm gruplar alt alta
  const groupsToRender = useMemo(() => {
    return selectedCategory
      ? parsed.groups.filter((g) => g.id === selectedCategory)
      : parsed.groups;
  }, [parsed.groups, selectedCategory]);

  // Kulüp listesi: seçili kategori varsa o kategoriden; yoksa tüm kategorilerden
  const clubOptions = useMemo(() => {
    const set = new Set();
    const baseGroups = selectedCategory
      ? parsed.groups.filter((g) => g.id === selectedCategory)
      : parsed.groups;

    for (const g of baseGroups) {
      for (const r of g.rows || []) {
        const c = cleanText(r.club);
        if (c) set.add(c);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "tr"));
  }, [parsed.groups, selectedCategory]);

  const filterRows = (rows) =>
    (rows || []).filter((r) => {
      if (selectedClub && cleanText(r.club) !== selectedClub) return false;
      if (onlyFinished && isStatusTime(r.time)) return false;
      return true;
    });

  const fetchHtml = async () => {
    const res = await fetch(`${LIVE_RESULTS_URL}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // const buf = await res.arrayBuffer();
    const text = await res.text();
    return text;
    return decodeHtml(buf);
  };

  const load = async (mode = "refresh") => {
    try {
      setErr(null);
      if (!rawHtml) setLoading(true);
      if (rawHtml) setRefreshing(true);

      const html = await fetchHtml();
      setRawHtml(html);
      setLastUpdated(new Date());
    } catch (e) {
      setErr(e?.message || "Yükleme hatası");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // İlk yükleme + 60sn sayaç: 0 olunca otomatik yenile
  useEffect(() => {
    let alive = true;

    const safeLoad = async () => {
      if (!alive) return;
      await load("auto");
    };

    safeLoad();
    setSecondsLeft(59);

    const tickId = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 0) {
          safeLoad();
          return 59;
        }
        return s - 1;
      });
    }, 1000);

    return () => {
      alive = false;
      clearInterval(tickId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleManualRefresh = async () => {
    setSecondsLeft(59);
    await load("manual");
  };

  return (
    <div className="min-h-[60vh]">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-3xl px-3 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">Canlı Sonuçlar</div>
            <div className="mt-0.5 text-xs text-slate-600 truncate">
              {parsed.headerTitle ? `${parsed.headerTitle} • ` : ""}
              {parsed.headerTime || ""}
            </div>
            {lastUpdated ? (
              <div className="mt-0.5 text-[11px] text-slate-500">
                Son güncelleme:{" "}
                {lastUpdated.toLocaleTimeString("tr-TR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {refreshing ? " • yenileniyor…" : ""}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
              {String(secondsLeft).padStart(2, "0")} sn
            </span>
            <button
              type="button"
              onClick={handleManualRefresh}
              className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-50"
              title="Şimdi yenile"
            >
              Yenile
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-3 py-4 grid gap-3">
        {err ? (
          <div className="rounded-2xl border bg-white p-4 text-sm text-rose-700 shadow-sm">
            Canlı sonuçlar alınamadı: {err}
          </div>
        ) : null}

        {/* Filtreler (başta boş => hepsi) */}
        <div className="rounded-2xl border bg-white p-3 shadow-sm grid gap-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-slate-700">Kategori</span>
              <select
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">(Seçilmedi) Tüm Kategoriler</option>
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-xs font-semibold text-slate-700">Kulüp</span>
              <select
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                value={selectedClub}
                onChange={(e) => setSelectedClub(e.target.value)}
              >
                <option value="">(Seçilmedi) Tümü</option>
                {clubOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-700 select-none">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={onlyFinished}
                onChange={(e) => setOnlyFinished(e.target.checked)}
              />
              Sadece bitirenler
            </label>
          </div>
        </div>

        {/* İçerik */}
        {loading ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-slate-600 shadow-sm">
            Yükleniyor...
          </div>
        ) : groupsToRender.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-slate-600 shadow-sm">
            Sonuç bulunamadı.
          </div>
        ) : (
          <div className="grid gap-3">
            {groupsToRender.map((g) => {
              const rows = filterRows(g.rows);

              return (
                <div key={g.id} className="rounded-2xl border bg-white shadow-sm overflow-hidden">
                  {/* Grup başlığı */}
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">{g.name}</div>
                      {g.status ? <div className="mt-1 text-xs text-slate-600">{g.status}</div> : null}
                    </div>

                    {g.progress ? (
                      <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
                        {g.progress}
                      </span>
                    ) : null}
                  </div>

                  {/* Mobil: kart/list */}
                  <div className="sm:hidden border-t p-3 grid gap-2">
                    {rows.length === 0 ? (
                      <div className="text-sm text-slate-600">Bu kategoride sonuç yok.</div>
                    ) : (
                      rows.map((r, idx) => (
                        <div
                          key={`${g.id}-m-${idx}`}
                          className={[
                            "rounded-2xl border shadow-sm p-3",
                            idx % 2 === 0 ? "bg-white" : "bg-slate-50",
                          ].join(" ")}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="shrink-0 w-10 text-right tabular-nums font-semibold text-slate-900">
                                {r.pos || "-"}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-slate-900 truncate">{r.name}</div>
                                <div className="mt-0.5 text-xs text-slate-600 truncate">
                                  {r.club || ""}
                                  {/* {r.chip ? ` • Çip: ${r.chip}` : ""} */}
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div
                                className={[
                                  "text-sm tabular-nums font-semibold",
                                  isStatusTime(r.time) ? "text-amber-700" : "text-slate-900",
                                ].join(" ")}
                              >
                                {r.time}
                              </div>
                              {r.diff ? <div className="text-xs text-slate-600 tabular-nums">{r.diff}</div> : null}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Desktop/Tablet: tablo */}
                  <div className="hidden sm:block border-t overflow-x-auto">
                    <table className="min-w-[760px] w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-xs [&>th]:font-semibold [&>th]:text-slate-600 [&>th]:uppercase">
                          <th className="text-right w-[72px]">Kon.</th>
                          {/* <th className="text-right w-[90px]">Çip No</th> */}
                          <th className="text-left">İsim</th>
                          <th className="text-left">Kulüp</th>
                          <th className="text-right w-[110px]">Zaman</th>
                          <th className="text-right w-[110px]">Fark</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y">
                        {rows.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-3 py-4 text-sm text-slate-600">
                              Bu kategoride sonuç yok.
                            </td>
                          </tr>
                        ) : (
                          rows.map((r, idx) => {
                            const rowClass =
                              (idx % 2 === 0 ? "bg-white" : "bg-slate-50/60") + " hover:bg-slate-100/60";

                            return (
                              <tr key={`${g.id}-t-${idx}`} className={rowClass}>
                                <td className="px-3 py-2 text-right tabular-nums text-slate-800">{r.pos}</td>
                                {/* <td className="px-3 py-2 text-right tabular-nums text-slate-800">{r.chip}</td> */}
                                <td className="px-3 py-2 text-slate-900">{r.name}</td>
                                <td className="px-3 py-2 text-slate-700">{r.club}</td>
                                <td
                                  className={`px-3 py-2 text-right tabular-nums ${
                                    isStatusTime(r.time) ? "text-amber-700 font-semibold" : "text-slate-800"
                                  }`}
                                >
                                  {r.time}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums text-slate-700">{r.diff}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
