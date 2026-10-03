import { useEffect, useState } from "react";
import { apiClient } from "../../../api/apiClient";
import AthleteForm from "./AthleteForm";
import AthletesTable from "./AthletesTable";

const emptyForm = {
  first_name: "",
  last_name: "",
  gender: "M",
  birth_year: "",
  license_no: "",
  si_chip_no: "",
  national_id: "", // TC zorunlu
  category_id: "", // Kategori zorunlu
};

function toForm(row) {
  return {
    first_name: row?.first_name ?? "",
    last_name: row?.last_name ?? "",
    gender: row?.gender ?? "M",
    birth_year: row?.birth_year ? String(row.birth_year) : "",
    license_no: row?.license_no ?? "",
    si_chip_no: row?.si_chip_no ?? "",
    national_id: row?.national_id ?? "",
    category_id: row?.category_id ? String(row.category_id) : "",
  };
}

export default function Athletes() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [myClubId, setMyClubId] = useState(null);
  const [meLoading, setMeLoading] = useState(true);

  // ✅ edit modu
  const [editingId, setEditingId] = useState(null);

  async function loadAthletes() {
    setLoading(true);
    try {
      const items = await apiClient.listMyAthletes();
      setRows(items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      // /me -> club_id
      setMeLoading(true);
      try {
        const me = await apiClient.me();
        setMyClubId(me?.user?.club?.id ?? null);
      } catch (e) {
        console.error(e);
        setMyClubId(null);
      } finally {
        setMeLoading(false);
      }

      // categories
      setCategoriesLoading(true);
      try {
        const items = await apiClient.listCategories();
        setCategories(items);
      } catch (e) {
        console.error(e);
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }

      // athletes
      loadAthletes();
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function validateAndBuildPayload() {
    const firstName = form.first_name.trim();
    const lastName = form.last_name.trim();
    const nationalId = form.national_id.trim();

    const categoryId = form.category_id ? parseInt(String(form.category_id), 10) : null;

    const birthRaw = String(form.birth_year ?? "").trim();
    const birthYear = birthRaw ? parseInt(birthRaw, 10) : null;

    if (!firstName || !lastName) return { ok: false, message: "Ad ve soyad zorunludur." };
    if (!nationalId) return { ok: false, message: "TC zorunludur." };
    if (!categoryId || !Number.isFinite(categoryId)) return { ok: false, message: "Kategori seçmek zorunludur." };
    if (birthYear !== null && !Number.isFinite(birthYear)) return { ok: false, message: "Doğum yılı geçersiz." };

    if (!myClubId || !Number.isFinite(Number(myClubId))) {
      return { ok: false, message: "Kulüp bilgisi bulunamadı. /me.club.id boş dönüyor olabilir." };
    }

    const payload = {
      first_name: firstName,
      last_name: lastName,
      gender: form.gender,
      birth_year: birthYear, // null veya int

      // opsiyonel
      license_no: form.license_no.trim() || null,
      si_chip_no: form.si_chip_no.trim() || null,

      // zorunlu
      national_id: nationalId,
      category_id: categoryId,

      // kulüp sabit (create/update için de gönderebilirsin)
      club_id: Number(myClubId),
    };

    return { ok: true, payload };
  }

  // ✅ ekle veya güncelle
  async function submit() {
    setError(null);

    const v = validateAndBuildPayload();
    if (!v.ok) return setError(v.message);

    setSaving(true);
    try {
      if (editingId) {
        await apiClient.updateAthlete(editingId, v.payload);
      } else {
        await apiClient.createAthlete(v.payload);
      }

      setForm(emptyForm);
      setEditingId(null);
      await loadAthletes();
    } catch (e) {
      setError(String(e?.message || "Kaydedilemedi"));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!confirm("Sporcu silinsin mi?")) return;
    await apiClient.deleteAthlete(id);
    setRows((cur) => cur.filter((r) => r.id !== id));

    // silinen sporcu edit ediliyorsa temizle
    if (editingId === id) {
      setEditingId(null);
      setForm(emptyForm);
    }
  }

  // ✅ düzenle butonundan çağrılır
  function edit(row) {
    setError(null);
    setEditingId(row.id);
    setForm(toForm(row));
  }

  function clearForm() {
    setError(null);
    setEditingId(null);
    setForm(emptyForm);
  }

  const canSave =
    !!form.first_name.trim() &&
    !!form.last_name.trim() &&
    !!form.national_id.trim() &&
    !!form.category_id &&
    !!myClubId &&
    !saving &&
    !meLoading &&
    !categoriesLoading;

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Sporcular</h1>
        <p className="mt-1 text-sm text-slate-600">Kendi sporcularını yönet.</p>
      </div>

      {/* küçük edit etiketi */}
      {editingId ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Düzenleme modundasın. Sporcu ID: <span className="font-mono">{editingId}</span>
        </div>
      ) : null}

      <AthleteForm
        editingId={editingId}   // ✅ EKLE
        form={form}
        setForm={setForm}
        categories={categories}
        categoriesLoading={categoriesLoading}
        error={error}
        saving={saving}
        canSave={canSave}
        onClear={clearForm}
        onSubmit={submit}   // ✅ add yerine submit
      />

      <AthletesTable
        loading={loading}
        rows={rows}
        onRemove={remove}
        onEdit={edit}       // ✅ yeni prop
      />
    </div>
  );
}
