import { Link } from "react-router-dom";

function Card({ title, desc, to }) {
  return (
    <Link to={to} className="rounded-2xl border bg-white p-5 shadow-sm hover:bg-slate-50">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-sm text-slate-600">{desc}</div>
    </Link>
  );
}

export default function Dashboard() {
  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">Panel hızlı erişim.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Yarışmalar" desc="Yarışma oluştur / düzenle" to="/app/events" />
        <Card title="Sporcular" desc="Sporcu ekle / düzenle" to="/app/athletes" />
        {/* <Card title="Kayıtlarım" desc="Kayıtları görüntüle / durum" to="/app/registrations" /> */}
      </div>
    </div>
  );
}
 