import { useMemo } from "react";
import DataTable from "../../../components/ui/DataTable";

export default function AthletesTable({ loading, rows, onRemove, onEdit }) {
  const columns = useMemo(
    () => [
      { key: "name", header: "Ad Soyad", render: (r) => `${r.first_name} ${r.last_name}` },
      { key: "gender", header: "Cinsiyet", render: (r) => r.gender },
      { key: "birth_year", header: "Doğum", render: (r) => r.birth_year ?? "-" },
      { key: "national_id", header: "T.C.", render: (r) => r.national_id ?? "-" },
      { key: "license_no", header: "Lisans", render: (r) => r.license_no ?? "-" },
      { key: "si_chip_no", header: "SI", render: (r) => r.si_chip_no ?? "-" },
      { key: "category", header: "Kategori", render: (r) => r.category_name ?? r.category ?? "-" },
      {
        key: "actions",
        header: "İşlem",
        render: (r) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
              onClick={() => onEdit?.(r)}       // ✅ düzenle
              disabled={!onEdit}
              title={!onEdit ? "Düzenleme aksiyonu tanımlı değil" : "Düzenle"}
            >
              Düzenle
            </button>

            {/* <button
              type="button"
              className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
              onClick={() => onRemove(r.id)}    // ✅ sil
            >
              Sil
            </button> */}
          </div>
        ),
      },
    ],
    [onRemove, onEdit]
  );

  if (loading) {
    return <div className="rounded-2xl border bg-white p-6 text-sm text-slate-600 shadow-sm">Yükleniyor...</div>;
  }

  return <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />;
}
