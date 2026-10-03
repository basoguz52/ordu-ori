import { TextInput } from "../../../components/ui/Form";

export default function EventsFilters({ q, setQ, loading, total }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <TextInput
        className="w-full max-w-md"
        placeholder="Ara: yarışma adı, şehir, tür..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="text-sm text-slate-600">{loading ? "Yükleniyor..." : `Toplam: ${total}`}</div>
    </div>
  );
}
