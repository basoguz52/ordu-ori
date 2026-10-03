import { useMemo, useState } from "react";
import PageShell from "./_PageShell";

function normalizePhone(value) {
  // boşluk/paren/tire vs temizle, sadece rakam ve + kalsın
  let v = (value || "").replace(/[^\d+]/g, "");

  // + sadece başta olsun
  if (v.includes("+")) {
    v = (v.startsWith("+") ? "+" : "") + v.replace(/\+/g, "");
  }

  // pratik limit
  if (v.length > 16) v = v.slice(0, 16);

  return v;
}

function isValidPhoneTR(phone) {
  const p = normalizePhone(phone);

  // zorunlu alan dediğin için boşsa false
  if (!p) return false;

  // +90xxxxxxxxxx
  if (p.startsWith("+90")) return /^\+90\d{10}$/.test(p);

  // 0xxxxxxxxxx
  if (p.startsWith("0")) return /^0\d{10}$/.test(p);

  // 5xxxxxxxxx (kullanıcı baştaki 0'ı yazmadıysa)
  if (p.startsWith("5")) return /^5\d{9}$/.test(p);

  return false;
}

export default function Iletisim() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    website: "", // honeypot (botlar doldurur)
  });

  const [status, setStatus] = useState({ type: "idle", message: "" });

  const phoneOk = useMemo(() => isValidPhoneTR(form.phone), [form.phone]);

  function onChange(e) {
    const { name, value } = e.target;

    // telefon için özel normalize
    if (name === "phone") {
      setForm((p) => ({ ...p, phone: normalizePhone(value) }));
      return;
    }

    setForm((p) => ({ ...p, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();

    if (!phoneOk) {
      setStatus({
        type: "error",
        message: "Telefon formatı geçersiz. Örn: 05xxxxxxxxx veya +90xxxxxxxxxx",
      });
      return;
    }

    setStatus({ type: "loading", message: "Gönderiliyor..." });

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: normalizePhone(form.phone),
          subject: form.subject,
          message: form.message,
          website: form.website, // honeypot
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Gönderim başarısız.");

      setStatus({ type: "success", message: "Mesajınız alındı. En kısa sürede dönüş yapacağız." });

      // ✅ reset fix: phone da dahil
      setForm({ name: "", email: "", phone: "", subject: "", message: "", website: "" });
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Bir hata oluştu." });
    }
  }

  return (
    <PageShell title="İletişim">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-800">Bize yazın</h2>
            <p className="mt-1 text-sm text-slate-500">Formu doldurun, mesajınız bize ulaşsın.</p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              {/* Honeypot (gizli alan) */}
              <div className="hidden">
                <label>Website</label>
                <input name="website" value={form.website} onChange={onChange} />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Ad Soyad *</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={onChange}
                  required
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring"
                  placeholder="Adınız Soyadınız"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">Telefon *</label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={onChange}
                    required
                    inputMode="tel"
                    autoComplete="tel"
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring"
                    placeholder="05xxxxxxxxx veya +90xxxxxxxxxx"
                  />
                  {!phoneOk && form.phone !== "" && (
                    <p className="mt-1 text-xs text-rose-600">
                      Telefon formatı geçersiz. Örn: 05xxxxxxxxx veya +90xxxxxxxxxx
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">E-posta</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={onChange}
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring"
                    placeholder="ornek@mail.com"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Konu *</label>
                <input
                  name="subject"
                  value={form.subject}
                  onChange={onChange}
                  required
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring"
                  placeholder="Örn: Teklif talebi"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Mesaj *</label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={onChange}
                  required
                  rows={6}
                  className="mt-1 w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none focus:ring"
                  placeholder="Mesajınızı yazın..."
                />
              </div>

              {status.type !== "idle" && (
                <div
                  className={[
                    "rounded-xl border px-4 py-3 text-sm",
                    status.type === "loading" && "border-slate-200 bg-slate-50 text-slate-600",
                    status.type === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
                    status.type === "error" && "border-rose-200 bg-rose-50 text-rose-700",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {status.message}
                </div>
              )}

              <button
                type="submit"
                disabled={status.type === "loading"}
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
              >
                Gönder
              </button>
            </form>
          </div>
        </div>

        {/* sağ kolonun (bilgiler + harita) kısmını aynen bıraktım */}
        <div className="space-y-6">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800">İletişim Bilgileri</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">E-posta</div>
                <div className="mt-1">
                  <a
                    href="mailto:oryantiringordu@gmail.com"
                    className="mt-1 block text-slate-700 hover:text-blue-600 hover:underline transition-colors"
                  >
                    oryantiringordu@gmail.com
                  </a>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Telefon</div>
                <div className="mt-1">
                  <a
                    href="tel:+905313512525"
                    className="mt-1 block text-slate-700 hover:text-blue-600 hover:underline transition-colors"
                  >
                    +90 (505) 929 33 31
                  </a>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Adres</div>
                <div className="mt-1">Bahçelievler Mahallesi Fatma Alkan Sokak No:5/A Altınordu, Ordu</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden border">
            <iframe
              title="Konum"
              width="100%"
              height="250"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src="https://www.google.com/maps?q=40.978861,37.905194&hl=tr&z=17&output=embed&markers=40.978861,37.905194"
            />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
