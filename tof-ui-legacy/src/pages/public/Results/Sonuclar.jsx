import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "../_PageShell";
import { apiClient } from "../../../api/apiClient";

function formatDateTR(isoDate) {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function groupKeyByYear(e) {
  const d = new Date(e.start_date);
  return String(d.getFullYear());
}

function buildResultsUrl(folderKey, type) {
  const base = "/api/results.php";
  const qs = new URLSearchParams({ key: folderKey, type });
  return `${base}?${qs.toString()}`;
}

function buildProbeUrl(folderKey) {
  const base = "/api/results.php";
  const qs = new URLSearchParams({ key: folderKey, probe: "1" });
  return `${base}?${qs.toString()}`;
}

async function mapLimit(items, limit, fn) {
  const ret = [];
  const executing = [];
  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item));
    ret.push(p);

    if (limit <= items.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(ret);
}

function ResultButton({ href, children, variant = "ghost" }) {
  return (
    <a className={`res-btn res-btn--${variant}`} href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

export default function Sonuclar() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [events, setEvents] = useState([]);
  const [avail, setAvail] = useState({}); // { [eventId]: { official, splits, overall } }

  const load = async () => {
    try {
      setErr(null);
      setLoading(true);

      const items = await apiClient.listEvents();
      const normalized = (items || [])
        .filter((e) => e && e.start_date)
        .sort((a, b) => String(b.start_date).localeCompare(String(a.start_date)));

      setEvents(normalized);

      // availability (FTP dosyası var mı?) kontrolü
      const nextAvail = {};

      await mapLimit(
        normalized.filter((e) => e.folder_key),
        6,
        async (e) => {
          try {
            const res = await fetch(buildProbeUrl(e.folder_key), {
              method: "GET",
              cache: "no-store",
            });
            if (!res.ok) return;
            const j = await res.json();
            nextAvail[e.id] = {
              official: !!j.official,
              splits: !!j.splits,
              overall: !!j.overall,
            };
          } catch {
            // sessiz geç
          }
        }
      );

      setAvail(nextAvail);
    } catch (e) {
      setErr(e?.message || "Yükleme hatası");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groups = useMemo(() => {
    const g = {};
    for (const e of events) {
      const k = groupKeyByYear(e);
      if (!g[k]) g[k] = [];
      g[k].push(e);
    }
    const years = Object.keys(g).sort((a, b) => Number(b) - Number(a));
    return years.map((y) => ({ year: y, items: g[y] }));
  }, [events]);

  return (
    <PageShell title="Sonuçlar">
      {/* Minimal, sayfaya özel CSS */}
      <style>{`
        .res-topbar { display:flex; gap:12px; flex-wrap:wrap; align-items:center; }
        .res-link { display:inline-flex; align-items:center; gap:8px; padding:8px 12px; border:1px solid #e5e7eb; border-radius:10px; text-decoration:none; }
        .res-link:hover { background:#f9fafb; }

        .res-card { border:1px solid #e5e7eb; border-radius:14px; padding:14px; display:grid; gap:10px; background:#fff; }
        .res-cardHeader { display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; }
        .res-title { font-weight:700; }
        .res-subtle { opacity:.75; }

        .res-actions { display:flex; gap:10px; flex-wrap:wrap; }
        .res-btn { display:inline-flex; align-items:center; justify-content:center; padding:8px 12px; border-radius:999px; border:1px solid #e5e7eb; text-decoration:none; font-weight:600; font-size:14px; line-height:1; }
        .res-btn:hover { background:#f9fafb; }
        .res-btn:active { transform: translateY(1px); }
        .res-btn--primary { background:#111827; border-color:#111827; color:#fff; }
        .res-btn--primary:hover { background:#0b1220; }
        .res-btn--secondary { background:#1f2937; border-color:#1f2937; color:#fff; }
        .res-btn--secondary:hover { background:#111827; }
        .res-btn--ghost { background:transparent; color:#111827; }
      `}</style>

      <div style={{ display: "grid", gap: 12 }}>
        <div className="res-topbar">
          <Link className="res-link" to="/sonuclar/canli">
            Canlı Sonuçlar →
          </Link>
        </div>

        {loading ? <div>Yükleniyor...</div> : null}
        {err ? <div style={{ color: "crimson" }}>{err}</div> : null}

        {!loading && !err && groups.length === 0 ? <div>Henüz sonuç bulunamadı.</div> : null}

        {groups.map((gr) => (
          <div key={gr.year} style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{gr.year}</div>

            {gr.items.map((e) => {
              const a = avail[e.id] || { official: true, splits: true, overall: false };
              const hasKey = !!e.folder_key;

              const officialUrl = hasKey ? buildResultsUrl(e.folder_key, "official") : null;
              const splitsUrl = hasKey ? buildResultsUrl(e.folder_key, "splits") : null;
              const overallUrl = hasKey ? buildResultsUrl(e.folder_key, "overall") : null;

              return (
                <div key={e.id} className="res-card">
                  <div className="res-cardHeader">
                    <div className="res-title">{e.name}</div>
                    <div className="res-subtle">{formatDateTR(e.start_date)}</div>
                  </div>

                  {e.location ? <div style={{ opacity: 0.85 }}>{e.location}</div> : null}

                  {!hasKey ? (
                    <div style={{ color: "#b45309" }}>
                      Bu yarış için <b>folder_key</b> yok; sonuç linki üretilemiyor.
                    </div>
                  ) : null}

                  <div className="res-actions">
                    {hasKey && a.overall && overallUrl ? (
                      <ResultButton href={overallUrl} variant="primary">
                        Toplu Sonuçlar
                      </ResultButton>
                    ) : null}

                    {hasKey && a.official && officialUrl ? (
                      <ResultButton href={officialUrl} variant="secondary">
                        Genel
                      </ResultButton>
                    ) : null}

                    {hasKey && a.splits && splitsUrl ? (
                      <ResultButton href={splitsUrl} variant="ghost">
                        Ara Zaman
                      </ResultButton>
                    ) : null}
                  </div>

                  {e.season_start_year && e.season_end_year ? (
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      Sezon: {e.season_start_year}-{e.season_end_year}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </PageShell>
  );
}
