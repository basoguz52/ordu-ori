import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../api/apiClient";
import { TextInput } from "../../components/ui/Form";

// ---- Public base URL + file URL helpers ----
const PUBLIC_BASE_URL =
  (typeof process !== "undefined" &&
    process.env &&
    process.env.REACT_APP_PUBLIC_BASE_URL) ||
  (typeof window !== "undefined" ? window.location.origin : "");

function stripLeadingSlashes(s) {
  return String(s || "").replace(/^\/+/, "");
}

// Supports both:
// 1) Absolute URLs from backend: event.*_url
// 2) storage_key relative to /uploads (e.g. events/00012/...)
// 3) legacy filenames stored in events.*_path (served under /bulletin or /cikis)
function buildFileUrl({ url, path, legacyFolder }) {
  if (url) return String(url);

  const p = stripLeadingSlashes(path);
  if (!p) return null;

  // If already looks like a storage_key under uploads
  const looksLikeUploadsKey =
    p.startsWith("events/") ||
    p.startsWith("docs/") ||
    p.startsWith("bulletin/") ||
    p.startsWith("cikis/");

  if (looksLikeUploadsKey) {
    return `${PUBLIC_BASE_URL}/uploads/${p}`;
  }

  // If it already contains an uploads prefix, respect it.
  if (p.startsWith("uploads/")) {
    return `${PUBLIC_BASE_URL}/${p}`;
  }

  // Legacy: only filename kept in DB
  return `${PUBLIC_BASE_URL}/${legacyFolder}/${p}`;
}


// ---- Date helpers ----
function parseDateLike(v) {
  if (!v) return null;
  const s = String(v).trim().replace("T", " ");
  // YYYY-MM-DD  |  YYYY-MM-DD HH:mm  |  YYYY-MM-DD HH:mm:ss
  const m = s.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (!m) return null;

  const [, Y, M, D, hh = "00", mm = "00", ss = "00"] = m;
  const d = new Date(
    Number(Y),
    Number(M) - 1,
    Number(D),
    Number(hh),
    Number(mm),
    Number(ss)
  );
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function formatDateTR(d) {
  if (!d) return null;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
}

function formatDateTimeTR(d) {
  if (!d) return null;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

// ---- Kayıt durum mantığı ----
function registrationWindowState(event) {
  const openFlag = Number(event?.is_registration_open) === 1;

  const now = new Date();
  const start = parseDateLike(event?.registration_start_at);
  const end = parseDateLike(event?.registration_end_at);

  if (!openFlag) return { ok: false, reason: "Kayıt Kapalı" };
  if (start && now < start) return { ok: false, reason: "Kayıt Henüz Başlamadı" };
  if (end && now > end) return { ok: false, reason: "Kayıt Süresi Bitti" };
  return { ok: true, reason: null };
}

function isEventActive(event) {
  const now = new Date();
  const s = parseDateLike(event?.start_date);
  const e = parseDateLike(event?.end_date) || s;
  if (!s || !e) return false;
  return now >= startOfDay(s) && now <= endOfDay(e);
}

// ---- Sorting ----
function compareEvents(a, b) {
  const aTop = (registrationWindowState(a).ok || isEventActive(a)) ? 0 : 1;
  const bTop = (registrationWindowState(b).ok || isEventActive(b)) ? 0 : 1;
  if (aTop !== bTop) return aTop - bTop;

  const aStart = parseDateLike(a?.start_date);
  const bStart = parseDateLike(b?.start_date);

  if (!aStart && !bStart) return 0;
  if (!aStart) return 1;
  if (!bStart) return -1;

  const today0 = startOfDay(new Date()).getTime();
  const aStart0 = startOfDay(aStart).getTime();
  const bStart0 = startOfDay(bStart).getTime();

  const aUpcoming = aStart0 >= today0 ? 0 : 1;
  const bUpcoming = bStart0 >= today0 ? 0 : 1;
  if (aUpcoming !== bUpcoming) return aUpcoming - bUpcoming;

  // upcoming: yakın -> uzak (asc), past: yakın geçmiş -> daha eski (desc)
  return aUpcoming === 0 ? aStart0 - bStart0 : bStart0 - aStart0;
}

// ---- Card ----
function Card({ event }) {
  const regState = useMemo(() => registrationWindowState(event), [event]);
  const canRegister = regState.ok;

  const eventStart = useMemo(() => parseDateLike(event?.start_date), [event]);
  const eventEnd = useMemo(() => parseDateLike(event?.end_date), [event]);

  const regStart = useMemo(
    () => parseDateLike(event?.registration_start_at),
    [event]
  );
  const regEnd = useMemo(
    () => parseDateLike(event?.registration_end_at),
    [event]
  );

  // PDF linkleri:
// - Backend artık bulletin_url / oncikis_url / kesincikis_url döndürebilir.
// - Geçiş dönemi için events.*_path fallback'ı da destekliyoruz.
  const bulletinUrl = buildFileUrl({
    url: event?.bulletin_url,
    path: event?.bulletin_path,
    legacyFolder: "bulletin",
  });


  // Ön çıkış (startlist)
  const onCikisUrl = buildFileUrl({
    url: event?.oncikis_url,
    path: event?.oncikis_path,
    legacyFolder: "cikis",
  });

  // Kesin çıkış (startlist final)
  const kesinCikisUrl = buildFileUrl({
    url: event?.kesincikis_url,
    path: event?.kesincikis_path,
    legacyFolder: "cikis",
  });

  const showEventDateLine = Boolean(eventStart);

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{event?.name}</div>

          {/* Yer + yarış tarihleri (tarih parse edilemezse hiç gösterme) */}
          {showEventDateLine ? (
            <div className="mt-1 text-sm text-slate-600">
              {event?.location ? `${event.location} • ` : ""}
              {formatDateTR(eventStart)}
              {eventEnd && eventEnd.getTime() !== eventStart.getTime()
                ? ` → ${formatDateTR(eventEnd)}`
                : ""}
            </div>
          ) : null}

          {/* Kayıt durum + başlangıç/bitiş (tarih yoksa / parse olmazsa gösterme) */}
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span
              className={`rounded-full border px-2 py-1 ${canRegister
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
                }`}
              title="Kayıt durumu"
            >
              {canRegister ? "Kayıt Alınıyor" : regState.reason}
            </span>

            {regStart ? (
              <span
                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700"
                title="Kayıt başlangıç"
              >
                Kayıt Başlangıç: {formatDateTimeTR(regStart)}
              </span>
            ) : null}

            {regEnd ? (
              <span
                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700"
                title="Kayıt bitiş"
              >
                Kayıt Bitiş: {formatDateTimeTR(regEnd)}
              </span>
            ) : null}
          </div>

          {event?.description ? (
            <div className="mt-2 text-sm text-slate-700">{event.description}</div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Bülten: veri yoksa hiç gösterme */}
          {bulletinUrl ? (
            <a
              className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-50"
              href={bulletinUrl}
              target="_blank"
              rel="noreferrer"
            >
              Bülten
            </a>
          ) : null}

          <Link
            className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-50"
            to={`/yarisma-basvurulari/yarismacilar?event=${event.id}`}
          >
            Yarışmacılar
          </Link>

          {/* Ön Çıkış: veri yoksa hiç gösterme */}
          {onCikisUrl ? (
            <a
              className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-50"
              href={onCikisUrl}
              target="_blank"
              rel="noreferrer"
            >
              Çıkış Listesi
            </a>
          ) : null}

          

          {/* Kesin Çıkış: veri yoksa hiç gösterme */}
          {kesinCikisUrl ? (
            <a
              className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-50"
              href={kesinCikisUrl}
              target="_blank"
              rel="noreferrer"
            >
              Kesin Çıkış Listesi
            </a>
          ) : null}
{/*<Link
            className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-50"
            to={`/yarisma-basvurulari/sonuclar?event=${event.id}`}
          >
            Sonuçlar
          </Link>*/}

          {canRegister ? (
            <Link
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:opacity-95"
              to={`/yarisma-basvurulari/kayit?event=${event.id}`}
            >
              Kayıt
            </Link>
          ) : null}

        </div>
      </div>
    </div>
  );
}

// ---- Page ----
export default function YarismaBulteni() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    apiClient
      .listEvents({ q })
      .then((rows) => alive && setEvents(Array.isArray(rows) ? rows : []))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [q]);

  const sortedEvents = useMemo(() => {
    const arr = Array.isArray(events) ? [...events] : [];
    arr.sort(compareEvents);
    return arr;
  }, [events]);

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Yarışma Bülteni</h1>
        <p className="mt-1 text-sm text-slate-600">
          Etkinlikleri görüntüle, kayıt ol ve sonuçları incele.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <TextInput
          className="w-full max-w-md"
          placeholder="Ara: yarışma adı, şehir, tür..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="text-sm text-slate-600 whitespace-nowrap">
          {loading ? "Yükleniyor..." : `Toplam: ${sortedEvents.length}`}
        </div>
      </div>

      <div className="grid gap-3">
        {loading ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-slate-600 shadow-sm">
            Yükleniyor...
          </div>
        ) : sortedEvents.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-slate-600 shadow-sm">
            Etkinlik bulunamadı.
          </div>
        ) : (
          sortedEvents.map((e) => <Card key={e.id} event={e} />)
        )}
      </div>
    </div>
  );
}