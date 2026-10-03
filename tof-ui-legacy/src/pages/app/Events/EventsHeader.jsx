export default function EventsHeader({ canManage, onReload, onCreate }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Yarışmalar</h1>
        <p className="mt-1 text-sm text-slate-600">
          Panel – yarışma listesi{canManage ? " (düzenle/sil + kayıt yönetimi)" : ""}.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          onClick={onReload}
        >
          Yenile
        </button>

        {canManage ? (
          <button
            type="button"
            className="rounded-xl border bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            onClick={onCreate}
          >
            Yeni Yarışma
          </button>
        ) : null}
      </div>
    </div>
  );
}
