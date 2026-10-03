import { useEffect, useMemo } from "react";
import { Field, PrimaryButton, SecondaryButton, Select, TextInput } from "../../../components/ui/Form";

export default function AthleteForm({
  editingId, // ✅ EKLENDİ (null/undefined ise ekleme modu)
  form,
  setForm,
  categories,
  categoriesLoading,
  error,
  saving,
  canSave,
  onClear,
  onSubmit,
}) {
  const isEditing = !!editingId;

  const birthYear = useMemo(() => {
    const raw = String(form.birth_year ?? "").trim();
    if (!raw) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  }, [form.birth_year]);

  const filteredCategories = useMemo(() => {
    if (!birthYear || !form.gender) return [];
    const g = String(form.gender).toUpperCase();

    return (categories || []).filter((c) => {
      const cg = String(c.gender ?? "").toUpperCase();
      const min = Number(c.min_birth_year);
      const max = Number(c.max_birth_year);
      if (cg !== g) return false;
      if (!Number.isFinite(min) || !Number.isFinite(max)) return false;
      return birthYear >= min && birthYear <= max;
    });
  }, [categories, form.gender, birthYear]);

  // Cinsiyet / doğum yılı değişince seçili kategori uygunsuzsa sıfırla
  useEffect(() => {
    if (!form.category_id) return;
    const ok = filteredCategories.some((c) => String(c.id) === String(form.category_id));
    if (!ok) setForm((s) => ({ ...s, category_id: "" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.gender, birthYear, categories]);

  const categoryDisabled = categoriesLoading || !birthYear || !form.gender;

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      {/* ✅ Başlık */}
      <div className="mb-4">
        <div className="text-base font-semibold text-slate-900">
          {isEditing ? "Sporcu Düzenle" : "Yeni Sporcu Ekle"}
        </div>
        <div className="mt-1 text-sm text-slate-600">
          {isEditing ? "Seçili sporcunun bilgilerini güncelle." : "Yeni sporcu bilgilerini gir."}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Ad">
          <TextInput value={form.first_name} onChange={(e) => setForm((s) => ({ ...s, first_name: e.target.value }))} />
        </Field>

        <Field label="Soyad">
          <TextInput value={form.last_name} onChange={(e) => setForm((s) => ({ ...s, last_name: e.target.value }))} />
        </Field>

        <Field label="Cinsiyet">
          <Select value={form.gender} onChange={(e) => setForm((s) => ({ ...s, gender: e.target.value }))}>
            <option value="M">M</option>
            <option value="F">F</option>
          </Select>
        </Field>

        <Field label="Doğum Yılı">
          <TextInput
            value={form.birth_year}
            onChange={(e) => setForm((s) => ({ ...s, birth_year: e.target.value }))}
            placeholder="2004"
          />
        </Field>

        <Field label="Lisans No (opsiyonel)">
          <TextInput value={form.license_no} onChange={(e) => setForm((s) => ({ ...s, license_no: e.target.value }))} />
        </Field>

        <Field label="SI Chip No (opsiyonel)">
          <TextInput value={form.si_chip_no} onChange={(e) => setForm((s) => ({ ...s, si_chip_no: e.target.value }))} />
        </Field>

        <Field label="TC">
          <TextInput value={form.national_id} onChange={(e) => setForm((s) => ({ ...s, national_id: e.target.value }))} />
        </Field>

        <Field label="Kategori">
          <Select
            value={form.category_id}
            disabled={categoryDisabled}
            onChange={(e) => setForm((s) => ({ ...s, category_id: e.target.value }))}
          >
            {!form.gender || !birthYear ? (
              <option value="">Önce cinsiyet ve doğum yılı giriniz</option>
            ) : filteredCategories.length === 0 ? (
              <option value="">Uygun kategori yok</option>
            ) : (
              <>
                <option value="">Seçiniz</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </>
            )}
          </Select>
        </Field>
      </div>

      {error ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="mt-4 flex items-center justify-end gap-2">
        <SecondaryButton type="button" onClick={onClear} disabled={saving}>
          {isEditing ? "Vazgeç" : "Temizle"}
        </SecondaryButton>

        <PrimaryButton type="button" disabled={!canSave} onClick={onSubmit}>
          {saving ? "Kaydediliyor..." : isEditing ? "Güncelle" : "Sporcu Ekle"}
        </PrimaryButton>
      </div>
    </div>
  );
}
