export default function DataTable({ columns, rows, rowKey }) {
  return (
    <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
      <table className="min-w-full border-separate border-spacing-0">
        <thead>
          <tr>
            {/* sıra numarası başlığı */}
            <th className="sticky top-0 w-12 border-b bg-white px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              #
            </th>

            {columns.map((c) => (
              <th
                key={c.key}
                className="sticky top-0 border-b bg-white px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-sm text-slate-500" colSpan={columns.length + 1}>
                Kayıt bulunamadı.
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={rowKey(r)} className="hover:bg-slate-50">
                {/* sıra numarası hücresi */}
                <td className="border-b px-4 py-3 text-sm text-slate-500">
                  {i + 1}
                </td>

                {columns.map((c) => (
                  <td key={c.key} className="border-b px-4 py-3 text-sm text-slate-700">
                    {c.render ? c.render(r) : r[c.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
