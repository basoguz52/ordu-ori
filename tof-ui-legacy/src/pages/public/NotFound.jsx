import { Link } from "react-router-dom";
import PageShell from "./_PageShell";

export default function NotFound() {
  return (
    <PageShell title="404">
      <div className="mt-2">Sayfa bulunamadı.</div>
      <Link className="mt-4 inline-flex rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-50" to="/duyurular">
        Duyurulara git
      </Link>
    </PageShell>
  );
}
