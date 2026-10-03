import { useMemo, useState } from "react";

function onlyDigits(s) {
  return (s || "").replace(/\D/g, "");
}

export default function RegistrationForm({
  initialValue,
  categories,
  onSubmit,
  onCancel,
}) {
  const isEdit = useMemo(() => !!initialValue?.id, [initialValue]);

  const [form, setForm] = useState(() => ({
    ad: initialValue?.ad ?? "",
    soyad: initialValue?.soyad ?? "",
    cinsiyet: initialValue?.cinsiyet ?? "Erkek",
    dogum_yili: initialValue?.dogum_yili ?? 2005,
    tc_no: initialValue?.tc_no ?? "",
    license_no: initialValue?.license_no ?? "",      // opsiyonel
    category_id: initialValue?.category_id ?? "",    // zorunlu
    si_chip_no: initialValue?.si_chip_no ?? "",      // opsiyonel (önceden si_numarasi)
  }));

  const [errors, setErrors] = useState({});

  function setField(name, value) {
    setForm((p) => ({ ...p, [name]: value }));
  }

  function validate() {
    const e = {};
    if (!form.ad.trim()) e.ad = "Ad zorunlu.";
    if (!form.soyad.trim()) e.soyad = "Soyad zorunlu.";
    if (!["Erkek", "Kadın"].includes(form.cinsiyet)) e.cinsiyet = "Cinsiyet seçiniz.";

    const by = Number(form.dogum_yili);
    const yearNow = new Date().getFullYear();
    if (!by || by < 1940 || by > yearNow) e.dogum_yili = "Doğum yılı geçersiz.";

    // TC zorunlu
    const tc = onlyDigits(form.tc_no);
    if (tc.length !== 11) e.tc_no = "TC Kimlik No 11 haneli olmalı.";

    // Kategori zorunlu
    if (!String(form.category_id).trim()) e.category_id = "Kategori seçiniz.";

    // Lisans ve SI Chip opsiyonel (doğrulama yok)

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      ...form,
      tc_no: onlyDigits(form.tc_no),
      dogum_yili: Number(form.dogum_yili),
      category_id: Number(form.category_id),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm">Ad *</label>
          <input
            className="w-full border rounded-lg p-2"
            value={form.ad}
            onChange={(e) => setField("ad", e.target.value)}
          />
          {errors.ad && <div className="text-xs text-red-600 mt-1">{errors.ad}</div>}
        </div>

        <div>
          <label className="text-sm">Soyad *</label>
          <input
            className="w-full border rounded-lg p-2"
            value={form.soyad}
            onChange={(e) => setField("soyad", e.target.value)}
          />
          {errors.soyad && <div className="text-xs text-red-600 mt-1">{errors.soyad}</div>}
        </div>

        <div>
          <label className="text-sm">Cinsiyet *</label>
          <select
            className="w-full border rounded-lg p-2"
            value={form.cinsiyet}
            onChange={(e) => setField("cinsiyet", e.target.value)}
          >
            <option value="Erkek">Erkek</option>
            <option value="Kadın">Kadın</option>
          </select>
          {errors.cinsiyet && <div className="text-xs text-red-600 mt-1">{errors.cinsiyet}</div>}
        </div>

        <div>
          <label className="text-sm">Doğum Yılı *</label>
          <input
            type="number"
            className="w-full border rounded-lg p-2"
            value={form.dogum_yili}
            onChange={(e) => setField("dogum_yili", e.target.value)}
            min={1940}
            max={2100}
          />
          {errors.dogum_yili && <div className="text-xs text-red-600 mt-1">{errors.dogum_yili}</div>}
        </div>

        <div>
          <label className="text-sm">TC Kimlik No *</label>
          <input
            className="w-full border rounded-lg p-2"
            value={form.tc_no}
            onChange={(e) => setField("tc_no", e.target.value)}
            inputMode="numeric"
            maxLength={11}
            placeholder="11 hane"
          />
          {errors.tc_no && <div className="text-xs text-red-600 mt-1">{errors.tc_no}</div>}
        </div>

        <div>
          <label className="text-sm">Lisans No (Opsiyonel)</label>
          <input
            className="w-full border rounded-lg p-2"
            value={form.license_no}
            onChange={(e) => setField("license_no", e.target.value)}
            maxLength={50}
          />
        </div>

        <div>
          <label className="text-sm">Kategori *</label>
          <select
            className="w-full border rounded-lg p-2"
            value={form.category_id}
            onChange={(e) => setField("category_id", e.target.value)}
          >
            <option value="">Seçiniz</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {errors.category_id && <div className="text-xs text-red-600 mt-1">{errors.category_id}</div>}
        </div>

        <div>
          <label className="text-sm">SI Chip No (Opsiyonel)</label>
          <input
            className="w-full border rounded-lg p-2"
            value={form.si_chip_no}
            onChange={(e) => setField("si_chip_no", e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button type="button" className="border rounded-lg px-3 py-2" onClick={onCancel}>
          İptal
        </button>
        <button type="submit" className="rounded-lg px-3 py-2 bg-black text-white">
          {isEdit ? "Güncelle" : "Kaydet"}
        </button>
      </div>
    </form>
  );
}
