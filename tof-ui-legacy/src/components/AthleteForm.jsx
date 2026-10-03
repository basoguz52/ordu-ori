import { useMemo, useState } from "react";

function onlyDigits(s) {
  return (s || "").replace(/\D/g, "");
}

export default function AthleteForm({ initialValue, onSubmit, onCancel }) {
  const isEdit = useMemo(() => !!initialValue?.id, [initialValue]);

  const [form, setForm] = useState(() => ({
    first_name: initialValue?.first_name ?? "",
    last_name: initialValue?.last_name ?? "",
    gender: initialValue?.gender ?? "M",
    birth_year: initialValue?.birth_year ?? 2005,
    national_id: initialValue?.national_id ?? "",
    license_no: initialValue?.license_no ?? "",
    si_chip_no: initialValue?.si_chip_no ?? "",
    club_id: initialValue?.club_id ?? 10,
  }));

  const [errors, setErrors] = useState({});

  function setField(name, value) {
    setForm((p) => ({ ...p, [name]: value }));
  }

  function validate() {
    const e = {};
    if (!form.first_name.trim()) e.first_name = "Ad zorunlu.";
    if (!form.last_name.trim()) e.last_name = "Soyad zorunlu.";
    if (!["M", "F"].includes(form.gender)) e.gender = "Cinsiyet seçiniz.";
    const by = Number(form.birth_year);
    const yearNow = new Date().getFullYear();
    if (!by || by < 1930 || by > yearNow) e.birth_year = "Doğum yılı geçersiz.";
    const nid = onlyDigits(form.national_id);
    if (nid.length !== 11) e.national_id = "TC 11 haneli olmalı.";
    if (!form.license_no.trim()) e.license_no = "Lisans no zorunlu.";
    // SI chip opsiyonel ama girildiyse kısa olmasın
    if (form.si_chip_no && form.si_chip_no.trim().length < 3) e.si_chip_no = "SI chip no çok kısa.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      ...form,
      national_id: onlyDigits(form.national_id),
      birth_year: Number(form.birth_year),
      club_id: Number(form.club_id),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm">Ad</label>
          <input
            className="w-full border rounded-lg p-2"
            value={form.first_name}
            onChange={(e) => setField("first_name", e.target.value)}
          />
          {errors.first_name && <div className="text-xs text-red-600 mt-1">{errors.first_name}</div>}
        </div>

        <div>
          <label className="text-sm">Soyad</label>
          <input
            className="w-full border rounded-lg p-2"
            value={form.last_name}
            onChange={(e) => setField("last_name", e.target.value)}
          />
          {errors.last_name && <div className="text-xs text-red-600 mt-1">{errors.last_name}</div>}
        </div>

        <div>
          <label className="text-sm">Cinsiyet</label>
          <select
            className="w-full border rounded-lg p-2"
            value={form.gender}
            onChange={(e) => setField("gender", e.target.value)}
          >
            <option value="M">Erkek</option>
            <option value="F">Kadın</option>
          </select>
          {errors.gender && <div className="text-xs text-red-600 mt-1">{errors.gender}</div>}
        </div>

        <div>
          <label className="text-sm">Doğum Yılı</label>
          <input
            type="number"
            className="w-full border rounded-lg p-2"
            value={form.birth_year}
            onChange={(e) => setField("birth_year", e.target.value)}
          />
          {errors.birth_year && <div className="text-xs text-red-600 mt-1">{errors.birth_year}</div>}
        </div>

        <div>
          <label className="text-sm">TC Kimlik No</label>
          <input
            className="w-full border rounded-lg p-2"
            value={form.national_id}
            onChange={(e) => setField("national_id", e.target.value)}
            inputMode="numeric"
          />
          {errors.national_id && <div className="text-xs text-red-600 mt-1">{errors.national_id}</div>}
        </div>

        <div>
          <label className="text-sm">Lisans No</label>
          <input
            className="w-full border rounded-lg p-2"
            value={form.license_no}
            onChange={(e) => setField("license_no", e.target.value)}
          />
          {errors.license_no && <div className="text-xs text-red-600 mt-1">{errors.license_no}</div>}
        </div>

        <div>
          <label className="text-sm">SI Chip No (opsiyonel)</label>
          <input
            className="w-full border rounded-lg p-2"
            value={form.si_chip_no}
            onChange={(e) => setField("si_chip_no", e.target.value)}
          />
          {errors.si_chip_no && <div className="text-xs text-red-600 mt-1">{errors.si_chip_no}</div>}
        </div>

        <div>
          <label className="text-sm">Kulüp ID</label>
          <input
            type="number"
            className="w-full border rounded-lg p-2"
            value={form.club_id}
            onChange={(e) => setField("club_id", e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button type="button" className="border rounded-lg px-3 py-2" onClick={onCancel}>
          İptal
        </button>
        <button type="submit" className="rounded-lg px-3 py-2 bg-black text-white">
          {isEdit ? "Kaydet" : "Ekle"}
        </button>
      </div>
    </form>
  );
}
