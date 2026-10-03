import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { apiClient } from "../../api/apiClient";

function parseDateTime(v) {
  if (!v) return null;
  const s = String(v).replace(" ", "T");
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function registrationWindowState(event) {
  const openFlag = Number(event?.is_registration_open) === 1;

  const now = new Date();
  const start = parseDateTime(event?.registration_start_at);
  const end = parseDateTime(event?.registration_end_at);

  if (!openFlag) return { ok: false, reason: "Kayıt Kapalı" };
  if (start && now < start) return { ok: false, reason: "Kayıt Henüz Başlamadı" };
  if (end && now > end) return { ok: false, reason: "Kayıt Süresi Bitti" };
  return { ok: true, reason: null };
}

export default function YarismaKayit() {
  const { search } = useLocation();
  const eventId = useMemo(() => new URLSearchParams(search).get("event"), [search]);

  const [event, setEvent] = useState(null);
  const [athletes, setAthletes] = useState([]);
  const [myRegs, setMyRegs] = useState([]);

  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [busyAthleteId, setBusyAthleteId] = useState(null);
  const [busyRegId, setBusyRegId] = useState(null);

  async function refreshMyRegistrations(eid) {
    const items = await apiClient.listMyEventRegistrations(eid);
    setMyRegs(items);
  }

  useEffect(() => {
    if (!eventId) return;
    let alive = true;

    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const [ev, myAth, regs] = await Promise.all([
          apiClient.getEvent(eventId),
          apiClient.listMyAthletes(),
          apiClient.listMyEventRegistrations(eventId),
        ]);
        if (!alive) return;
        setEvent(ev);
        setAthletes(myAth);
        setMyRegs(regs);
      } catch (e) {
        if (!alive) return;
        setErr(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [eventId]);

  // Solda "kayıtlı" kontrolü için map
  const regByAthleteId = useMemo(() => {
    const m = new Map();
    for (const r of myRegs) m.set(Number(r.athlete_id), r);
    return m;
  }, [myRegs]);

  const filteredAthletes = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return athletes;

    return athletes.filter((a) => {
      const name = String(a.full_name ?? "").toLowerCase();
      const cat = String(a.category_name ?? "").toLowerCase();
      const lic = String(a.license_no ?? "").toLowerCase();
      return name.includes(s) || cat.includes(s) || lic.includes(s);
    });
  }, [athletes, q]);

  const regState = useMemo(() => registrationWindowState(event), [event]);
  const canRegister = regState.ok;

  async function addAthlete(a) {
    if (!canRegister) return;
    if (regByAthleteId.has(Number(a.id))) return;

    setBusyAthleteId(a.id);
    setErr(null);

    try {
      const category_id = a.category_id;
      if (!category_id) {
        throw new Error("Sporcunun kategorisi yok (category_id boş). Kayıt oluşturulamıyor.");
      }

      await apiClient.createRegistration({
        event_id: Number(eventId),
        athlete_id: Number(a.id),
        category_id: Number(category_id),
      });

      await refreshMyRegistrations(eventId);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusyAthleteId(null);
    }
  }

  async function removeRegistration(r) {
    if (!canRegister) return;

    setBusyRegId(r.id);
    setErr(null);

    try {
      await apiClient.deleteRegistration(r.id);
      await refreshMyRegistrations(eventId);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusyRegId(null);
    }
  }

  if (!eventId) {
    return (
      <div className="rounded-xl border bg-white p-4 text-sm text-slate-700">
        event parametresi eksik. Örn: <code>?event=123</code>
      </div>
    );
  }

  if (loading) return <div className="p-4 text-sm text-slate-600">Yükleniyor…</div>;

  return (
    <div className="space-y-4">
      {err ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>
      ) : null}

      <div className="rounded-xl border bg-white p-4">
        <div className="text-lg font-semibold">{event?.name}</div>
        <div className="text-sm text-slate-600">{event?.location}</div>

        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span
            className={`rounded-full border px-2 py-1 ${
              canRegister
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            {canRegister ? "Kayıt Alınıyor" : regState.reason}
          </span>

          {event?.registration_start_at ? (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700">
              Başlangıç: {String(event.registration_start_at).replace("T", " ").slice(0, 16)}
            </span>
          ) : null}

          {event?.registration_end_at ? (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700">
              Bitiş: {String(event.registration_end_at).replace("T", " ").slice(0, 16)}
            </span>
          ) : null}

          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700">
            Benim kayıtlarım: {myRegs.length}
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Sol: Sporcularım */}
        <div className="rounded-xl border bg-white p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="font-semibold">Sporcularım</div>
            <div className="text-xs text-slate-500">Toplam: {filteredAthletes.length}</div>
          </div>

          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="Ara: ad soyad / kategori / lisans..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <div className="space-y-2">
            {filteredAthletes.map((a) => {
              const already = regByAthleteId.has(Number(a.id));
              const isBusy = busyAthleteId === a.id;

              const fullName =
                String(a.full_name ?? "").trim() ||
                `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() ||
                `Sporcu #${a.id}`;

              return (
                <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{fullName}</div>
                    <div className="text-xs text-slate-500">
                      {a.category_name ? a.category_name : "Kategori yok"}
                      {a.license_no ? ` · Lisans: ${a.license_no}` : ""}
                    </div>
                  </div>

                  {already ? (
                    <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
                      Kayıtlı
                    </span>
                  ) : (
                    <button
                      className="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      disabled={!canRegister || isBusy}
                      onClick={() => addAthlete(a)}
                      title={!canRegister ? regState.reason : "Yarışmaya ekle"}
                    >
                      {isBusy ? "Ekleniyor..." : "Ekle"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sağ: Benim kayıtlarım */}
        <div className="rounded-xl border bg-white p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="font-semibold">Benim Yarışma Kayıtlarım</div>
            <div className="text-xs text-slate-500">Toplam: {myRegs.length}</div>
          </div>

          <div className="space-y-2">
            {myRegs.map((r) => {
              const fullName =
                `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || `Sporcu #${r.athlete_id}`;
              const isBusy = busyRegId === r.id;

              return (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{fullName}</div>
                    <div className="text-xs text-slate-500">
                      {r.category_name ? r.category_name : ""}
                      {r.club_code ? ` · ${r.club_code}` : ""}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {r.status ? (
                      <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
                        {r.status}
                      </span>
                    ) : null}

                    <button
                      className="shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
                      disabled={!canRegister || isBusy}
                      onClick={() => removeRegistration(r)}
                      title={!canRegister ? regState.reason : "Kayıttan çıkar"}
                    >
                      {isBusy ? "..." : "Çıkar"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {!canRegister ? (
            <div className="pt-2 text-xs text-slate-500">
              Not: Kayıt penceresi kapalı olduğu için ekleme/çıkarma devre dışı.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
